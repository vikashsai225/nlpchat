const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/chats - Get user's chats with metadata, last message, and unread counts
router.get('/', (req, res) => {
  try {
    const userId = req.user.id;

    // Find all chats where user is a participant
    const chats = db.query(
      `SELECT c.id, c.is_group, c.name, c.description, c.avatar_url, c.created_by,
              c.auto_delete_hours, c.last_message_text, c.last_message_at, c.updated_at,
              cp.custom_receive_language, cp.role, cp.last_read_at
       FROM chats c
       JOIN chat_participants cp ON c.id = cp.chat_id
       WHERE cp.user_id = ?
       ORDER BY COALESCE(c.last_message_at, c.created_at) DESC`,
      [userId]
    );

    const enrichedChats = chats.map(chat => {
      if (!chat.is_group) {
        // Direct chat: fetch the other participant's profile
        const otherParticipant = db.get(
          `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, u.is_online, u.last_seen
           FROM chat_participants cp
           JOIN users u ON cp.user_id = u.id
           WHERE cp.chat_id = ? AND cp.user_id != ?`,
          [chat.id, userId]
        );

        return {
          ...chat,
          recipient: otherParticipant || null,
          title: otherParticipant ? otherParticipant.display_name : 'Direct Chat',
          avatar: otherParticipant ? otherParticipant.avatar_url : chat.avatar_url
        };
      } else {
        // Group chat
        const participants = db.query(
          `SELECT u.id, u.username, u.display_name, u.avatar_url, cp.role
           FROM chat_participants cp
           JOIN users u ON cp.user_id = u.id
           WHERE cp.chat_id = ?`,
          [chat.id]
        );

        return {
          ...chat,
          participants,
          title: chat.name || 'Group Chat',
          avatar: chat.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${chat.id}`
        };
      }
    });

    res.json({ chats: enrichedChats });
  } catch (error) {
    console.error('Fetch chats error:', error);
    res.status(500).json({ error: 'Failed to retrieve chats' });
  }
});

// POST /api/chats/direct - Find existing direct chat or create a new one
router.post('/direct', (req, res) => {
  try {
    const { recipientId } = req.body;
    const senderId = req.user.id;

    if (!recipientId) {
      return res.status(400).json({ error: 'recipientId is required' });
    }

    if (recipientId === senderId) {
      return res.status(400).json({ error: 'Cannot create direct chat with yourself' });
    }

    // Check if recipient exists
    const recipient = db.get('SELECT id, display_name, avatar_url FROM users WHERE id = ?', [recipientId]);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient user not found' });
    }

    // Look for existing direct chat between these two users
    const existing = db.get(
      `SELECT c.id FROM chats c
       JOIN chat_participants cp1 ON c.id = cp1.chat_id AND cp1.user_id = ?
       JOIN chat_participants cp2 ON c.id = cp2.chat_id AND cp2.user_id = ?
       WHERE c.is_group = 0`,
      [senderId, recipientId]
    );

    if (existing) {
      return res.json({ chatId: existing.id, isNew: false });
    }

    // Create new direct chat
    const chatId = uuidv4();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO chats (id, is_group, created_by, created_at, updated_at)
       VALUES (?, 0, ?, ?, ?)`,
      [chatId, senderId, now, now]
    );

    db.run(
      `INSERT INTO chat_participants (chat_id, user_id, joined_at) VALUES (?, ?, ?)`,
      [chatId, senderId, now]
    );
    db.run(
      `INSERT INTO chat_participants (chat_id, user_id, joined_at) VALUES (?, ?, ?)`,
      [chatId, recipientId, now]
    );

    res.status(201).json({ chatId, isNew: true });
  } catch (error) {
    console.error('Create direct chat error:', error);
    res.status(500).json({ error: 'Failed to create direct chat' });
  }
});

// POST /api/chats/group - Create a group chat
router.post('/group', (req, res) => {
  try {
    const { name, description, participantIds = [] } = req.body;
    const creatorId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const chatId = uuidv4();
    const now = new Date().toISOString();
    const avatarUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name.trim())}`;

    db.run(
      `INSERT INTO chats (id, is_group, name, description, avatar_url, created_by, created_at, updated_at)
       VALUES (?, 1, ?, ?, ?, ?, ?, ?)`,
      [chatId, name.trim(), description || '', avatarUrl, creatorId, now, now]
    );

    // Add creator as admin
    db.run(
      `INSERT INTO chat_participants (chat_id, user_id, role, joined_at) VALUES (?, ?, 'admin', ?)`,
      [chatId, creatorId, now]
    );

    // Add other members
    const uniqueIds = Array.from(new Set(participantIds)).filter(id => id !== creatorId);
    for (const memberId of uniqueIds) {
      try {
        db.run(
          `INSERT INTO chat_participants (chat_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)`,
          [chatId, memberId, now]
        );
      } catch (err) {
        // Skip invalid participant
      }
    }

    res.status(201).json({
      chat: {
        id: chatId,
        is_group: 1,
        name: name.trim(),
        description: description || '',
        avatar_url: avatarUrl,
        created_by: creatorId
      }
    });
  } catch (error) {
    console.error('Create group chat error:', error);
    res.status(500).json({ error: 'Failed to create group chat' });
  }
});

// GET /api/chats/:chatId - Get details and participant list
router.get('/:chatId', (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const chat = db.get('SELECT * FROM chats WHERE id = ?', [chatId]);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    const participant = db.get('SELECT * FROM chat_participants WHERE chat_id = ? AND user_id = ?', [chatId, userId]);
    if (!participant) {
      return res.status(403).json({ error: 'You are not a member of this chat' });
    }

    const participants = db.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, u.is_online, u.last_seen,
              cp.role, cp.custom_receive_language
       FROM chat_participants cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.chat_id = ?`,
      [chatId]
    );

    res.json({ chat, participants });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: 'Failed to get chat details' });
  }
});

// PATCH /api/chats/:chatId/settings - Update auto-delete or preferences
router.patch('/:chatId/settings', (req, res) => {
  try {
    const { chatId } = req.params;
    const { auto_delete_hours, custom_receive_language } = req.body;
    const userId = req.user.id;

    if (typeof auto_delete_hours === 'number') {
      db.run('UPDATE chats SET auto_delete_hours = ? WHERE id = ?', [auto_delete_hours, chatId]);
    }

    if (custom_receive_language !== undefined) {
      db.run(
        'UPDATE chat_participants SET custom_receive_language = ? WHERE chat_id = ? AND user_id = ?',
        [custom_receive_language, chatId, userId]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update chat settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
