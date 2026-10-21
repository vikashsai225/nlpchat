const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/sanitize');

router.use(authenticateToken);

// GET /api/dictionary - List user's slang definitions
router.get('/', (req, res) => {
  try {
    const entries = db.query(
      'SELECT id, slang_term, normalized_meaning, created_at FROM personal_dictionary WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ entries });
  } catch (error) {
    console.error('Fetch dictionary error:', error);
    res.status(500).json({ error: 'Failed to retrieve personal dictionary' });
  }
});

// POST /api/dictionary - Add or update a personal slang entry
router.post('/', sanitizeInput, (req, res) => {
  try {
    const { slang_term, normalized_meaning } = req.body;
    const userId = req.user.id;

    if (!slang_term || !normalized_meaning) {
      return res.status(400).json({ error: 'Slang term and normalized meaning are required' });
    }

    const cleanTerm = slang_term.trim().toLowerCase();
    const cleanMeaning = normalized_meaning.trim();

    const existing = db.get('SELECT id FROM personal_dictionary WHERE user_id = ? AND slang_term = ?', [userId, cleanTerm]);

    if (existing) {
      db.run('UPDATE personal_dictionary SET normalized_meaning = ? WHERE id = ?', [cleanMeaning, existing.id]);
      const updated = db.get('SELECT * FROM personal_dictionary WHERE id = ?', [existing.id]);
      return res.json({ entry: updated, updated: true });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.run(
      'INSERT INTO personal_dictionary (id, user_id, slang_term, normalized_meaning, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, userId, cleanTerm, cleanMeaning, now]
    );

    const entry = db.get('SELECT * FROM personal_dictionary WHERE id = ?', [id]);
    res.status(201).json({ entry });
  } catch (error) {
    console.error('Save dictionary entry error:', error);
    res.status(500).json({ error: 'Failed to save dictionary entry' });
  }
});

// DELETE /api/dictionary/:id - Remove a slang entry
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    db.run('DELETE FROM personal_dictionary WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete dictionary entry error:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

module.exports = router;
