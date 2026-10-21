const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'nlpchat_super_secure_jwt_secret_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // Use the bundled SQLite database unless another database is configured.
  DATABASE_URL: process.env.DATABASE_URL || '',
  SQLITE_PATH: process.env.SQLITE_PATH
    ? (path.isAbsolute(process.env.SQLITE_PATH)
        ? process.env.SQLITE_PATH
        : path.resolve(__dirname, '..', process.env.SQLITE_PATH))
    : path.resolve(__dirname, '../nlpchat.db'),
  
  // AI provider keys. These values must stay on the backend.
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  AI_MODEL: process.env.AI_MODEL || 'gemini-1.5-flash',
  
  // General API rate limits.
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 mins
  RATE_LIMIT_MAX_REQUESTS: 200,
  
  // Separate limit for message previews.
  NORMALIZE_RATE_LIMIT_MAX: 120, // 120 previews per 15 min
};
