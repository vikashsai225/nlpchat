-- ====================================================================
-- NLPChat Production Database Schema
-- Compatible with PostgreSQL, SQLite, and Supabase
-- ====================================================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  -- Kept nullable for old databases; the app uses phone for account identity.
  email TEXT UNIQUE,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT DEFAULT 'Available on NLPChat',
  preferred_receive_language TEXT DEFAULT 'English',
  default_tone TEXT DEFAULT 'Natural',
  allow_view_original TEXT DEFAULT 'contacts', -- 'everyone', 'contacts', 'nobody'
  auto_delete_hours INTEGER DEFAULT 0,        -- 0 = disabled, 24, 168 (7d), 2160 (90d)
  is_online INTEGER DEFAULT 0,
  last_seen TEXT,
  created_at TEXT NOT NULL
);

-- Chats / Conversations (Direct and Group)
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  is_group INTEGER DEFAULT 0,                 -- 0 for 1-on-1 direct chat, 1 for group
  name TEXT,                                  -- Name for group chats (NULL for direct)
  description TEXT,
  avatar_url TEXT,
  created_by TEXT,                            -- User ID of creator
  auto_delete_hours INTEGER DEFAULT 0,        -- Per-chat disappearing messages setting
  last_message_text TEXT,
  last_message_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Chat Participants (Supports group chats and 1-on-1 pairs)
CREATE TABLE IF NOT EXISTS chat_participants (
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member',                 -- 'admin', 'member'
  joined_at TEXT NOT NULL,
  last_read_at TEXT,
  custom_receive_language TEXT,               -- Per-user receive language for this chat
  PRIMARY KEY (chat_id, user_id),
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Messages Table (Stores raw input and approved normalized English securely)
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  client_id TEXT UNIQUE,                      -- Deduplication ID sent from client
  chat_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  raw_content TEXT NOT NULL,                  -- Original unnormalized message
  normalized_content TEXT NOT NULL,           -- Approved natural English translation
  language TEXT DEFAULT 'Unknown',            -- Detected source language/dialect
  tone TEXT DEFAULT 'Natural',                -- Message tone
  confidence REAL DEFAULT 1.0,                -- Normalization confidence score (0.0 to 1.0)
  is_question INTEGER DEFAULT 0,              -- Whether the message is a question
  urgency TEXT DEFAULT 'normal',              -- 'normal', 'urgent', 'low'
  possible_scam INTEGER DEFAULT 0,            -- 0 or 1 flag for scam/phishing warnings
  status TEXT DEFAULT 'sent',                 -- 'sent', 'delivered', 'read'
  allow_view_original INTEGER DEFAULT 1,      -- Sender privacy flag for this message
  is_edited_by_sender INTEGER DEFAULT 0,      -- Flag if sender edited preview before sending
  is_deleted INTEGER DEFAULT 0,               -- Soft-delete flag
  expires_at TEXT,                            -- Timestamp for auto-deletion
  created_at TEXT NOT NULL,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Starred / Bookmarked Messages
CREATE TABLE IF NOT EXISTS starred_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, message_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Personal Slang Dictionaries
CREATE TABLE IF NOT EXISTS personal_dictionary (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  slang_term TEXT NOT NULL,
  normalized_meaning TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, slang_term),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_starred_user ON starred_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_dict_user ON personal_dictionary(user_id);
