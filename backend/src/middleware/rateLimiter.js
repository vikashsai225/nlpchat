const rateLimit = require('express-rate-limit');
const config = require('../config');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

// Normalization preview rate limiter (higher allowance for active chat typing)
const normalizeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.NORMALIZE_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Normalization rate limit reached. Please wait a moment.'
  }
});

// Auth endpoint rate limiter (protect against brute force attacks)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts. Please try again later.'
  }
});

module.exports = {
  apiLimiter,
  normalizeLimiter,
  authLimiter
};
