/**
 * Clean string values in the request body before they reach the routes.
 *
 * This is intentionally small: React escapes rendered text by default, while
 * this middleware removes HTML that should never be stored as message data.
 */
function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        // Strip control characters, escape potential HTML entities
        let clean = req.body[key].trim();
        // Prevent script tags or dangerous HTML while keeping normal emojis and text
        clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        clean = clean.replace(/<[^>]+>/g, '');
        req.body[key] = clean;
      }
    }
  }
  next();
}

/**
 * Validate message input
 */
function validateMessageInput(req, res, next) {
  const { rawText } = req.body;
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  if (rawText.length > 4000) {
    return res.status(400).json({ error: 'Message exceeds maximum length of 4000 characters' });
  }

  next();
}

module.exports = {
  sanitizeInput,
  validateMessageInput
};
