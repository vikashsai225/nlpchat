const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const config = require('../config');
const { authLimiter } = require('../middleware/rateLimiter');
const { authenticateToken } = require('../middleware/auth');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, phone: user.phone },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

function getPhoneVariants(phone) {
  if (!phone || typeof phone !== 'string') return [];
  const clean = phone.trim().replace(/[\s()-]/g, '');
  if (!clean) return [];

  const variants = new Set([clean]);

  if (clean.startsWith('+')) {
    const noPlus = clean.slice(1);
    variants.add(noPlus);
    if (clean.startsWith('+91')) {
      const national = clean.slice(3);
      variants.add(national);
      variants.add('0' + national);
    }
  } else {
    variants.add('+' + clean);
    if (clean.length === 10) {
      variants.add('+91' + clean);
      variants.add('91' + clean);
    } else if (clean.startsWith('91') && clean.length === 12) {
      variants.add('+' + clean);
      variants.add(clean.slice(2));
    } else if (clean.startsWith('0') && clean.length === 11) {
      variants.add('+91' + clean.slice(1));
      variants.add(clean.slice(1));
    }
  }

  return Array.from(variants);
}

// POST /api/auth/phone-login (Direct login with phone number)
router.post('/phone-login', authLimiter, async (req, res) => {
  try {
    const { phone, displayName } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const cleanPhone = phone.trim().replace(/[\s()-]/g, '');
    if (!/^\+?\d{7,15}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'Enter a valid phone number with 7 to 15 digits' });
    }

    const variants = getPhoneVariants(cleanPhone);
    const placeholders = variants.map(() => '?').join(',');
    let user = db.get(`SELECT * FROM users WHERE phone IN (${placeholders})`, variants);

    // If user exists, direct login immediately!
    if (user) {
      delete user.password_hash;
      delete user.email;
      const token = generateToken(user);
      return res.json({ user, token, isNewUser: false });
    }

    // New user auto-registration with phone number
    const effectiveDisplayName = (displayName && displayName.trim())
      ? displayName.trim()
      : `User ${cleanPhone.replace(/\D/g, '').slice(-4) || '101'}`;

    let baseUsername = effectiveDisplayName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!baseUsername || baseUsername.length < 3) {
      baseUsername = `user_${cleanPhone.replace(/\D/g, '').slice(-4) || 'chat'}`;
    }

    let usernameCandidate = baseUsername;
    let counter = 1;
    while (db.get('SELECT id FROM users WHERE username = ?', [usernameCandidate])) {
      usernameCandidate = `${baseUsername}_${counter++}`;
    }

    const userId = uuidv4();
    const now = new Date().toISOString();
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${usernameCandidate}`;
    const dummyPasswordHash = await bcrypt.hash(uuidv4(), 10);

    // Stored standard format: +91 if 10 digits without +, else keep with +
    let storedPhone = cleanPhone;
    if (cleanPhone.length === 10 && !cleanPhone.startsWith('+')) {
      storedPhone = `+91${cleanPhone}`;
    } else if (!cleanPhone.startsWith('+')) {
      storedPhone = `+${cleanPhone}`;
    }

    db.run(
      `INSERT INTO users (id, username, phone, email, password_hash, display_name, avatar_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        usernameCandidate,
        storedPhone,
        `${usernameCandidate}.${Date.now()}@internal.local`,
        dummyPasswordHash,
        effectiveDisplayName,
        avatarUrl,
        now
      ]
    );

    const newUser = db.get(
      'SELECT id, username, phone, display_name, avatar_url, bio, preferred_receive_language, default_tone, allow_view_original, auto_delete_hours FROM users WHERE id = ?',
      [userId]
    );

    const token = generateToken(newUser);
    return res.status(201).json({ user: newUser, token, isNewUser: true });
  } catch (error) {
    console.error('Phone login error:', error);
    res.status(500).json({ error: 'Server error during phone login' });
  }
});

// POST /api/auth/phone-check (Check whether phone number exists)
router.post('/phone-check', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const cleanPhone = phone.trim().replace(/[\s()-]/g, '');
    const variants = getPhoneVariants(cleanPhone);
    if (variants.length === 0) {
      return res.json({ exists: false });
    }

    const placeholders = variants.map(() => '?').join(',');
    const user = db.get(`SELECT id, username, display_name, avatar_url, phone FROM users WHERE phone IN (${placeholders})`, variants);

    if (user) {
      return res.json({ exists: true, user });
    }

    return res.json({ exists: false });
  } catch (error) {
    console.error('Phone check error:', error);
    res.status(500).json({ error: 'Server error checking phone number' });
  }
});

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, phone, password, display_name } = req.body;

    if (!username || !phone || !password) {
      return res.status(400).json({ error: 'Username, phone number, and password are required' });
    }

    const cleanUsername = username.toLowerCase().trim();
    const cleanPhone = phone.trim().replace(/[\s()-]/g, '');

    if (!/^\+?\d{7,15}$/.test(cleanPhone)) {
      return res.status(400).json({ error: 'Enter a valid phone number with 7 to 15 digits' });
    }

    const existing = db.get('SELECT id FROM users WHERE username = ? OR phone = ?', [cleanUsername, cleanPhone]);
    if (existing) {
      return res.status(409).json({ error: 'Username or phone number already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const now = new Date().toISOString();
    const displayName = display_name || cleanUsername;
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;

    db.run(
      `INSERT INTO users (id, username, phone, email, password_hash, display_name, avatar_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, cleanUsername, cleanPhone, `${cleanUsername}.${Date.now()}@internal.local`, passwordHash, displayName, avatarUrl, now]
    );

    const user = db.get(
      'SELECT id, username, phone, display_name, avatar_url, bio, preferred_receive_language, default_tone, allow_view_original, auto_delete_hours FROM users WHERE id = ?',
      [userId]
    );

    const token = generateToken(user);
    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone number and password are required' });
    }

    const cleanPhone = phone.trim().replace(/[\s()-]/g, '');
    const user = db.get('SELECT * FROM users WHERE phone = ?', [cleanPhone]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Exclude password_hash
    delete user.password_hash;
    delete user.email;
    const token = generateToken(user);

    res.json({ user, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// POST /api/auth/demo-login (Quick 1-click switch for demo testing)
router.post('/demo-login', async (req, res) => {
  try {
    const { username } = req.body;
    const targetUsername = (username || 'alice').toLowerCase().trim();

    let user = db.get('SELECT * FROM users WHERE username = ?', [targetUsername]);
    if (!user) {
      // Auto-create demo user if not present
      const userId = uuidv4();
      const now = new Date().toISOString();
      const names = {
        alice: 'Alice Johnson',
        bob: 'Bob Miller',
        priya: 'Priya Sharma',
        carlos: 'Carlos Diaz'
      };
      const displayName = names[targetUsername] || targetUsername.charAt(0).toUpperCase() + targetUsername.slice(1);
      const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUsername}`;
      const dummyHash = await bcrypt.hash('demopass123', 10);

      db.run(
        `INSERT INTO users (id, username, phone, email, password_hash, display_name, avatar_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, targetUsername, `+9190000000${Object.keys(names).indexOf(targetUsername) + 1}`, `${targetUsername}.${Date.now()}@internal.local`, dummyHash, displayName, avatarUrl, now]
      );

      user = db.get('SELECT * FROM users WHERE id = ?', [userId]);
    }

    delete user.password_hash;
    delete user.email;
    const token = generateToken(user);

    res.json({ user, token });
  } catch (error) {
    console.error('Demo login error:', error);
    res.status(500).json({ error: 'Server error during demo login' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
