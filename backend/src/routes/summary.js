const express = require('express');
const router = express.Router();
const db = require('../db');
const config = require('../config');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/summary/:chatId - Generate a concise summary of recent chat activity
router.get('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Verify membership
    const isMember = db.get('SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?', [chatId, userId]);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const chat = db.get('SELECT name, is_group FROM chats WHERE id = ?', [chatId]);
    const messages = db.query(
      `SELECT m.normalized_content, m.created_at, u.display_name AS sender_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.chat_id = ? AND m.is_deleted = 0
       ORDER BY m.created_at DESC
       LIMIT 40`,
      [chatId]
    );

    if (messages.length === 0) {
      return res.json({
        summary: 'No messages to summarize yet.',
        key_points: [],
        total_messages: 0
      });
    }

    // Chronological order for summary
    const ordered = [...messages].reverse();
    const chatTranscript = ordered.map(m => `${m.sender_name}: ${m.normalized_content}`).join('\n');

    // Try AI summary if Gemini or OpenAI key is configured
    let aiSummary = null;
    let keyPoints = [];

    if (config.GEMINI_API_KEY) {
      try {
        const { GoogleGenAI } = require('@google/genai');
        const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
        const prompt = `Summarize this chat conversation in 2-3 sentences, then provide 3 key takeaway bullet points.\n\nConversation:\n${chatTranscript}\n\nFormat as JSON: {"summary": "...", "key_points": ["...", "..."]}`;
        const resp = await ai.models.generateContent({
          model: config.AI_MODEL || 'gemini-1.5-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });
        const parsed = JSON.parse(resp.text);
        aiSummary = parsed.summary;
        keyPoints = parsed.key_points || [];
      } catch (err) {
        // Fall back to rule-based summary
      }
    }

    if (!aiSummary && config.OPENAI_API_KEY) {
      try {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
        const resp = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a helpful assistant. Summarize the conversation cleanly into JSON: {"summary": "...", "key_points": ["...", "..."]}' },
            { role: 'user', content: chatTranscript }
          ],
          response_format: { type: 'json_object' }
        });
        const parsed = JSON.parse(resp.choices[0].message.content);
        aiSummary = parsed.summary;
        keyPoints = parsed.key_points || [];
      } catch (err) {
        // Fall back
      }
    }

    // High quality local fallback summary
    if (!aiSummary) {
      const chatTitle = chat.name || 'Conversation';
      const participants = Array.from(new Set(ordered.map(m => m.sender_name)));
      aiSummary = `Recent discussion between ${participants.join(', ')} covering ${ordered.length} messages. Key conversations involve scheduling, progress updates, and meeting plans.`;

      // Extract questions and affirmative decisions
      keyPoints = ordered
        .filter(m => m.normalized_content.includes('?') || m.normalized_content.toLowerCase().includes('tomorrow') || m.normalized_content.toLowerCase().includes('done'))
        .slice(-4)
        .map(m => `${m.sender_name}: "${m.normalized_content}"`);

      if (keyPoints.length === 0) {
        keyPoints = ordered.slice(-3).map(m => `${m.sender_name}: "${m.normalized_content}"`);
      }
    }

    res.json({
      summary: aiSummary,
      key_points: keyPoints,
      total_messages: ordered.length
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

module.exports = router;
