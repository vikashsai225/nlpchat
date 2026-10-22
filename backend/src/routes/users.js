const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/sanitize');

router.use(authenticateToken);

// GET /api/users/search - Search users to start new chat
router.get('/search', (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user.id;

    if (!q || !q.trim()) {
      // Return top users
      const users = db.query(
        'SELECT id, username, phone, display_name, avatar_url, bio, is_online, last_seen FROM users WHERE id != ? LIMIT 50',
        [currentUserId]
      );
      return res.json({ users });
    }

    const searchTerm = `%${q.trim().toLowerCase()}%`;
    const phoneSearch = `%${q.trim().replace(/[\s()-]/g, '')}%`;
    const users = db.query(
      `SELECT id, username, phone, display_name, avatar_url, bio, is_online, last_seen
       FROM users
       WHERE id != ? AND (LOWER(username) LIKE ? OR LOWER(display_name) LIKE ? OR phone LIKE ?)
       LIMIT 20`,
      [currentUserId, searchTerm, searchTerm, phoneSearch]
    );

    res.json({ users });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// GET /api/users/contacts - Get all available users
router.get('/contacts', (req, res) => {
  try {
    const currentUserId = req.user.id;
    const users = db.query(
      'SELECT id, username, phone, display_name, avatar_url, bio, is_online, last_seen FROM users WHERE id != ? ORDER BY display_name ASC',
      [currentUserId]
    );
    res.json({ contacts: users });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Failed to get contacts' });
  }
});

// PATCH /api/users/profile - Update settings and preferences
router.patch('/profile', sanitizeInput, (req, res) => {
  try {
    const userId = req.user.id;
    const {
      display_name,
      bio,
      avatar_url,
      preferred_receive_language,
      default_tone,
      allow_view_original,
      auto_delete_hours
    } = req.body;

    const updates = [];
    const params = [];

    if (display_name !== undefined) {
      updates.push('display_name = ?');
      params.push(display_name);
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      params.push(bio);
    }
    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      params.push(avatar_url);
    }
    if (preferred_receive_language !== undefined) {
      updates.push('preferred_receive_language = ?');
      params.push(preferred_receive_language);
    }
    if (default_tone !== undefined) {
      updates.push('default_tone = ?');
      params.push(default_tone);
    }
    if (allow_view_original !== undefined) {
      updates.push('allow_view_original = ?');
      params.push(allow_view_original);
    }
    if (auto_delete_hours !== undefined) {
      updates.push('auto_delete_hours = ?');
      params.push(auto_delete_hours);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(userId);
    db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    const updatedUser = db.get(
      'SELECT id, username, phone, display_name, avatar_url, bio, preferred_receive_language, default_tone, allow_view_original, auto_delete_hours FROM users WHERE id = ?',
      [userId]
    );

    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
