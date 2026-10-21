const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { normalizeLimiter } = require('../middleware/rateLimiter');
const { validateMessageInput, sanitizeInput } = require('../middleware/sanitize');
const { normalizeMessage } = require('../services/normalizer');
const { normalizeWithRules, detectPossibleScam, detectUrgency } = require('../services/ruleEngine');

/* =====================================================================
 * Config & helpers
 * ===================================================================== */

const ALLOWED_TONES = ['Natural', 'Friendly', 'Formal', 'Concise'];
const ALLOWED_URGENCY = ['low', 'normal', 'high'];
const MAX_MESSAGE_LENGTH = 4000;
const MAX_ID_LENGTH = 100;
const NORMALIZE_TIMEOUT_MS = 15000;
const HISTORY_DEFAULT_LIMIT = 100;
const HISTORY_MAX_LIMIT = 500;
const STARRED_LIMIT = 200;
const EXPORT_MAX_MESSAGES = 10000;
const MAX_AUTO_DELETE_HOURS = 24 * 365;
const ID_RE = /^[\w-]{1,64}$/;

const pickTone = (t) =>
  typeof t === 'string' ? ALLOWED_TONES.find((x) => x.toLowerCase() === t.trim().toLowerCase()) || null : null;

const toBool = (v) => v === true || v === 1 || v === '1' || v === 'true';

const isUniqueError = (err) => /UNIQUE|constraint/i.test(String((err && err.message) || ''));

function isMember(chatId, userId) {
  return Boolean(db.get('SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?', [chatId, userId]));
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Never trust a message ID / chat ID from the URL
router.param('chatId', (req, res, next, val) =>
  ID_RE.test(val) ? next() : res.status(400).json({ error: 'Invalid chat ID' })
);
router.param('messageId', (req, res, next, val) =>
  ID_RE.test(val) ? next() : res.status(400).json({ error: 'Invalid message ID' })
);

// Small per-user limiter for /send (in-memory, per process)
const SEND_WINDOW_MS = 10000;
const SEND_MAX = 20;
const sendHits = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, arr] of sendHits) {
    const fresh = arr.filter((t) => now - t < SEND_WINDOW_MS);
    if (fresh.length) sendHits.set(k, fresh);
    else sendHits.delete(k);
  }
}, 60000).unref();

function sendLimiter(req, res, next) {
  const key = req.user.id;
  const now = Date.now();
  const hits = (sendHits.get(key) || []).filter((t) => now - t < SEND_WINDOW_MS);
  if (hits.length >= SEND_MAX) {
    return res.status(429).json({ error: 'Too many messages. Please slow down.' });
  }
  hits.push(now);
  sendHits.set(key, hits);
  next();
}

function loadMessage(messageId) {
  return db.get(
    `SELECT m.*, u.display_name AS sender_name, u.avatar_url AS sender_avatar
     FROM messages m
     JOIN users u ON m.sender_id = u.id
     WHERE m.id = ?`,
    [messageId]
  );
}

// Message the user is actually allowed to touch: member of its chat, not deleted, not expired
function getAccessibleMessage(messageId, userId) {
  return db.get(
    `SELECT m.id, m.chat_id, m.sender_id, m.raw_content, m.allow_view_original,
            u.allow_view_original AS user_privacy
     FROM messages m
     JOIN users u ON m.sender_id = u.id
     JOIN chat_participants cp ON cp.chat_id = m.chat_id AND cp.user_id = ?
     WHERE m.id = ? AND m.is_deleted = 0 AND (m.expires_at IS NULL OR m.expires_at > ?)`,
    [userId, messageId, new Date().toISOString()]
  );
}

function normalizeFallback(rawText, tone) {
  try {
    const r = normalizeWithRules(rawText, tone);
    if (r && r.normalized) return { ...r, smart_replies: [] };
  } catch (_) {
    /* fall through to passthrough */
  }
  const text = String(rawText || '').trim();
  return {
    language: 'Unknown',
    normalized: text,
    tone,
    confidence: 0.1, // we did NOT process this message, don't claim otherwise
    is_question: text.includes('?'),
    urgency: 'normal',
    possible_scam: detectPossibleScam(text),
    smart_replies: [],
  };
}

const oneLine = (s) => String(s == null ? '' : s).replace(/[\r\n\u2028\u2029]+/g, ' ').trim();

router.use(authenticateToken);

/* =====================================================================
 * POST /api/messages/normalize
 * ===================================================================== */

router.post('/normalize', normalizeLimiter, sanitizeInput, validateMessageInput, async (req, res) => {
  const body = req.body || {};
  const tone = pickTone(body.targetTone) || pickTone(req.user.default_tone) || 'Natural';

  if (typeof body.rawText !== 'string' || !body.rawText.trim()) {
    return res.status(400).json({ error: 'rawText is required' });
  }
  const rawText = body.rawText;

  try {
    const result = await withTimeout(
      normalizeMessage({ rawText, targetTone: tone, userId: req.user.id }),
      NORMALIZE_TIMEOUT_MS
    );
    // `source` is for debugging only; don't expose provider details to clients
    const { source, ...publicResult } = result;
    if (process.env.NODE_ENV !== 'production' && source) console.info('[normalize] source:', source);
    return res.json(publicResult);
  } catch (error) {
    // Never log the user's message, only the reason
    console.error('Normalize error:', error && error.message);
    return res.json(normalizeFallback(rawText, tone));
  }
});

/* =====================================================================
 * POST /api/messages/send
 * ===================================================================== */

router.post('/send', sendLimiter, sanitizeInput, (req, res) => {
  try {
    const body = req.body || {};
    const senderId = req.user.id;

    const chatId = typeof body.chatId === 'string' ? body.chatId : '';
    const approvedContent = typeof body.approvedContent === 'string' ? body.approvedContent.trim() : '';
    const rawContent = typeof body.rawContent === 'string' ? body.rawContent.trim() : '';
    const clientId =
      typeof body.clientId === 'string' && body.clientId.length > 0 && body.clientId.length <= MAX_ID_LENGTH
        ? body.clientId
        : null;

    if (!ID_RE.test(chatId) || !approvedContent) {
      return res.status(400).json({ error: 'Chat ID and approved message content are required' });
    }
    if (approvedContent.length > MAX_MESSAGE_LENGTH || rawContent.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters)` });
    }

    if (!isMember(chatId, senderId)) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }

    // Duplicate check: scoped to THIS sender (a global lookup let anyone fetch someone else's message by client_id)
    if (clientId) {
      const existing = db.get('SELECT id FROM messages WHERE client_id = ? AND sender_id = ?', [clientId, senderId]);
      if (existing) return res.json({ message: loadMessage(existing.id), duplicate: true });
    }

    // ---- client-supplied metadata is validated, never trusted
    const language = typeof body.language === 'string' && body.language.trim() ? body.language.trim().slice(0, 60) : 'English';
    const tone = pickTone(body.tone) || 'Natural';
    const confidence =
      typeof body.confidence === 'number' && Number.isFinite(body.confidence)
        ? Math.min(1, Math.max(0, body.confidence))
        : 1.0;

    let urgency = ALLOWED_URGENCY.includes(body.urgency) ? body.urgency : 'normal';
    if (urgency !== 'high' && detectUrgency(approvedContent) === 'high') urgency = 'high';

    // The server can only ADD a scam flag, a client can never clear it
    const possibleScam =
      toBool(body.possible_scam) || detectPossibleScam(approvedContent) || (rawContent && detectPossibleScam(rawContent));

    const isQuestion = toBool(body.is_question) || approvedContent.includes('?');

    // ---- privacy / auto-delete
    const chat = db.get('SELECT auto_delete_hours FROM chats WHERE id = ?', [chatId]);
    let deleteHours = Number(chat && chat.auto_delete_hours) > 0 ? Number(chat.auto_delete_hours) : Number(req.user.auto_delete_hours) || 0;
    deleteHours = Number.isFinite(deleteHours) ? Math.min(Math.max(deleteHours, 0), MAX_AUTO_DELETE_HOURS) : 0;

    const messageId = uuidv4();
    const now = new Date().toISOString();
    const expiresAt = deleteHours > 0 ? new Date(Date.now() + deleteHours * 3600 * 1000).toISOString() : null;

    let canViewOriginal = 1;
    if (body.allowViewOriginal !== undefined && body.allowViewOriginal !== null) {
      canViewOriginal = toBool(body.allowViewOriginal) ? 1 : 0;
    } else if (req.user.allow_view_original === 'nobody') {
      canViewOriginal = 0;
    }

    const insert = (cid) =>
      db.run(
        `INSERT INTO messages (
          id, client_id, chat_id, sender_id, raw_content, normalized_content,
          language, tone, confidence, is_question, urgency, possible_scam,
          status, allow_view_original, is_edited_by_sender, expires_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?, ?, ?, ?)`,
        [
          messageId, cid, chatId, senderId, rawContent || approvedContent, approvedContent,
          language, tone, confidence, isQuestion ? 1 : 0, urgency, possibleScam ? 1 : 0,
          canViewOriginal, toBool(body.isEditedBySender) ? 1 : 0, expiresAt, now,
        ]
      );

    try {
      insert(clientId || uuidv4());
    } catch (err) {
      if (!isUniqueError(err)) throw err;
      // Race: same client_id arrived twice at once -> return the first one
      const dup = clientId ? db.get('SELECT id FROM messages WHERE client_id = ? AND sender_id = ?', [clientId, senderId]) : null;
      if (dup) return res.json({ message: loadMessage(dup.id), duplicate: true });
      insert(uuidv4()); // client_id belongs to another user; store under a server id instead
    }

    // Preview text is non-critical: a failure here must not turn a saved message into a 500.
    // Disappearing messages must not leave their text behind in the chat list.
    try {
      const preview = expiresAt ? 'Disappearing message' : approvedContent.slice(0, 200);
      db.run(`UPDATE chats SET last_message_text = ?, last_message_at = ?, updated_at = ? WHERE id = ?`, [preview, now, now, chatId]);
    } catch (err) {
      console.error('Chat preview update failed:', err.message);
    }

    return res.status(201).json({ message: loadMessage(messageId) });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

/* =====================================================================
 * GET /api/messages/user/starred   (static routes first, before /:chatId)
 * ===================================================================== */

router.get('/user/starred', (req, res) => {
  try {
    const userId = req.user.id;

    // Only messages the user can still access (member of chat, not deleted, not expired)
    const starred = db.query(
      `SELECT m.id, m.chat_id, m.normalized_content, m.created_at,
              u.display_name AS sender_name, u.avatar_url AS sender_avatar,
              c.name AS chat_name, c.is_group
       FROM starred_messages sm
       JOIN messages m ON sm.message_id = m.id
       JOIN users u ON m.sender_id = u.id
       JOIN chats c ON m.chat_id = c.id
       JOIN chat_participants cp ON cp.chat_id = m.chat_id AND cp.user_id = sm.user_id
       WHERE sm.user_id = ?
         AND m.is_deleted = 0
         AND (m.expires_at IS NULL OR m.expires_at > ?)
       ORDER BY sm.created_at DESC
       LIMIT ?`,
      [userId, new Date().toISOString(), STARRED_LIMIT]
    );

    res.json({ starred });
  } catch (error) {
    console.error('Get starred error:', error);
    res.status(500).json({ error: 'Failed to get starred messages' });
  }
});

/* =====================================================================
 * GET /api/messages/:chatId   (history, paginated)
 *   ?limit=100 (max 500)   ?before=<ISO date>  -> older page
 * ===================================================================== */

router.get('/:chatId', (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    if (!isMember(chatId, userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || HISTORY_DEFAULT_LIMIT, 1), HISTORY_MAX_LIMIT);
    const nowIso = new Date().toISOString();

    let beforeClause = '';
    const params = [userId, chatId, nowIso];
    if (typeof req.query.before === 'string' && !Number.isNaN(Date.parse(req.query.before))) {
      beforeClause = 'AND m.created_at < ?';
      params.push(new Date(req.query.before).toISOString());
    }
    params.push(limit + 1);

    const rows = db.query(
      `SELECT m.id, m.client_id, m.chat_id, m.sender_id, m.raw_content, m.normalized_content,
              m.language, m.tone, m.confidence, m.is_question, m.urgency, m.possible_scam,
              m.status, m.allow_view_original, m.is_edited_by_sender, m.created_at,
              u.display_name AS sender_name, u.avatar_url AS sender_avatar,
              u.allow_view_original AS sender_privacy,
              CASE WHEN sm.id IS NOT NULL THEN 1 ELSE 0 END AS is_starred
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       LEFT JOIN starred_messages sm ON sm.message_id = m.id AND sm.user_id = ?
       WHERE m.chat_id = ?
         AND m.is_deleted = 0
         AND (m.expires_at IS NULL OR m.expires_at > ?)
         ${beforeClause}
       ORDER BY m.created_at DESC
       LIMIT ?`,
      params
    );

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit).reverse(); // oldest -> newest for the client

    const messages = page.map((msg) => {
      const { sender_privacy: senderPrivacy, ...out } = msg;
      if (msg.sender_id !== userId) {
        // Receivers never get raw text in history. They reveal it on demand via /view-original,
        // which re-checks the sender's privacy at that moment. (Before: raw text was included whenever
        // allow_view_original was on, which is the default, so it was effectively always exposed.)
        delete out.raw_content;
        out.can_view_original = Boolean(msg.allow_view_original) && senderPrivacy !== 'nobody';
      } else {
        out.can_view_original = true;
      }
      return out;
    });

    res.json({ messages, has_more: hasMore });
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/* =====================================================================
 * POST /api/messages/:messageId/view-original
 * ===================================================================== */

router.post('/:messageId/view-original', (req, res) => {
  try {
    const userId = req.user.id;

    // FIX: used to have NO membership check, any logged-in user could read any message's raw text by ID
    const message = getAccessibleMessage(req.params.messageId, userId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.sender_id !== userId && (!message.allow_view_original || message.user_privacy === 'nobody')) {
      return res.status(403).json({ error: 'Original message is kept private by sender' });
    }

    res.json({ raw_content: message.raw_content });
  } catch (error) {
    console.error('View original error:', error);
    res.status(500).json({ error: 'Failed to access original message' });
  }
});

/* =====================================================================
 * POST /api/messages/:messageId/star
 * ===================================================================== */

router.post('/:messageId/star', (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const existing = db.get('SELECT id FROM starred_messages WHERE user_id = ? AND message_id = ?', [userId, messageId]);
    if (existing) {
      // Un-starring is always allowed, even if the message expired or access was lost
      db.run('DELETE FROM starred_messages WHERE id = ?', [existing.id]);
      return res.json({ is_starred: false });
    }

    // FIX: used to star any message ID, then /user/starred leaked its text to non-members
    if (!getAccessibleMessage(messageId, userId)) {
      return res.status(404).json({ error: 'Message not found' });
    }

    try {
      db.run('INSERT INTO starred_messages (id, user_id, message_id, created_at) VALUES (?, ?, ?, ?)', [
        uuidv4(), userId, messageId, new Date().toISOString(),
      ]);
    } catch (err) {
      if (!isUniqueError(err)) throw err; // double tap / race: already starred
    }
    return res.json({ is_starred: true });
  } catch (error) {
    console.error('Star message error:', error);
    res.status(500).json({ error: 'Failed to star message' });
  }
});

/* =====================================================================
 * GET /api/messages/:chatId/export
 * ===================================================================== */

router.get('/:chatId/export', (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    if (!isMember(chatId, userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const chat = db.get('SELECT name, is_group, created_at FROM chats WHERE id = ?', [chatId]);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // FIX: expired (disappearing) messages used to be exported too
    const messages = db.query(
      `SELECT m.normalized_content, m.created_at, u.display_name AS sender_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.chat_id = ? AND m.is_deleted = 0
         AND (m.expires_at IS NULL OR m.expires_at > ?)
       ORDER BY m.created_at ASC
       LIMIT ?`,
      [chatId, new Date().toISOString(), EXPORT_MAX_MESSAGES]
    );

    const lines = [
      '=====================================================',
      `NLPChat Export: ${oneLine(chat.name) || 'Direct Conversation'}`,
      `Export Date: ${new Date().toISOString()}`,
      `Total Messages: ${messages.length}`,
      '=====================================================',
      '',
    ];
    for (const m of messages) {
      // newlines in names / content could forge fake "[date] sender:" lines in the export
      lines.push(`[${new Date(m.created_at).toISOString()}] ${oneLine(m.sender_name)}: ${oneLine(m.normalized_content)}`);
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="chat-export-${chatId}.txt"`);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(lines.join('\n') + '\n');
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export chat' });
  }
});

module.exports = router;