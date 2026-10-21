const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

/**
 * Express middleware to authenticate JWT from Authorization header
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    const user = db.get('SELECT id, username, phone, display_name, avatar_url, preferred_receive_language, default_tone, allow_view_original, auto_delete_hours FROM users WHERE id = ?', [decoded.id]);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = user;
    next();
  });
}

/**
 * Socket.IO middleware to authenticate connection
 */
function authenticateSocket(socket, next) {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Authentication token required'));
  }

  jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication failed'));
    }

    const user = db.get('SELECT id, username, display_name, avatar_url FROM users WHERE id = ?', [decoded.id]);
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = user;
    next();
  });
}

module.exports = {
  authenticateToken,
  authenticateSocket
};
