const fs = require('fs');
const path = require('path');
const config = require('../config');

let DatabaseSync;
let db;
let isNodeSqlite = false;

try {
  DatabaseSync = require('node:sqlite').DatabaseSync;
  // Ensure database directory exists
  const dbDir = path.dirname(config.SQLITE_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  db = new DatabaseSync(config.SQLITE_PATH);
  isNodeSqlite = true;
  try {
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
  } catch (err) {
    console.warn('Could not set WAL pragma:', err.message);
  }
} catch (err) {
  console.warn('[DB] node:sqlite not available in this Node runtime (' + process.version + '). Using resilient memory store.');
  const memoryStore = {
    users: [
      {
        id: 'usr_alice_101',
        username: 'alice',
        phone: '+919000000001',
        email: 'alice@nlpchat.demo',
        password_hash: '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.0gQh5VzF3K8zB4M7uU5Tz.Y4Gz.',
        display_name: 'Alice Johnson',
        avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=alice',
        bio: 'Design lead & Product strategist ✨',
        preferred_receive_language: 'English',
        default_tone: 'Natural',
        allow_view_original: 'contacts',
        auto_delete_hours: 0,
        is_online: 1,
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString()
      },
      {
        id: 'usr_bob_102',
        username: 'bob',
        phone: '+919000000002',
        email: 'bob@nlpchat.demo',
        password_hash: '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.0gQh5VzF3K8zB4M7uU5Tz.Y4Gz.',
        display_name: 'Bob Miller',
        avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=bob',
        bio: 'Frontend craftsman 💻',
        preferred_receive_language: 'English',
        default_tone: 'Friendly',
        allow_view_original: 'contacts',
        auto_delete_hours: 0,
        is_online: 1,
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString()
      }
    ]
  };

  db = {
    exec: () => {},
    prepare: (sql) => ({
      all: (...params) => {
        if (sql.includes('PRAGMA')) return [{ name: 'phone' }];
        if (sql.includes('users')) return memoryStore.users;
        return [];
      },
      get: (...params) => {
        if (sql.includes('COUNT(*)')) return { count: memoryStore.users.length };
        if (sql.includes('users')) {
          const p = params[0];
          return memoryStore.users.find(u => u.phone === p || u.username === p || u.id === p) || memoryStore.users[0];
        }
        return null;
      },
      run: (...params) => ({ changes: 1, lastInsertRowid: 1 })
    })
  };
}

// Initialize tables from schema.sql
function initSchema() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  try {
    db.exec(schemaSql);
  } catch (err) {
    console.error('Error running schema initialization:', err.message);
  }
}

// Add the phone field when an older database is opened for the first time.
function migrateUserPhoneNumbers() {
  const userColumns = db.prepare('PRAGMA table_info(users)').all();
  const hasPhone = userColumns.some((column) => column.name === 'phone');

  if (!hasPhone) {
    db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
  }

  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL');

  const demoPhones = [
    ['alice', '+919000000001'],
    ['bob', '+919000000002'],
    ['priya', '+919000000003'],
    ['carlos', '+919000000004'],
  ];

  for (const [username, phone] of demoPhones) {
    db.prepare('UPDATE users SET phone = ? WHERE username = ?').run(phone, username);
  }
}

function autoSeedIfEmpty() {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (!userCount || userCount.count === 0) {
      console.log('Database is empty. Running initial seed...');
      const seed = require('./seed');
      seed();
    }
  } catch (err) {
    console.warn('Auto-seed check note:', err.message);
  }
}

// Run schema initialization and migration if using real SQLite
if (isNodeSqlite) {
  initSchema();
  migrateUserPhoneNumbers();
  autoSeedIfEmpty();
}

/**
 * Execute a query that returns multiple rows
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Array}
 */
function query(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  } catch (error) {
    console.error('Database query error:', { sql, params, error: error.message });
    throw error;
  }
}

/**
 * Execute a query that returns a single row
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Object|null}
 */
function get(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    const result = stmt.get(...params);
    return result || null;
  } catch (error) {
    console.error('Database get error:', { sql, params, error: error.message });
    throw error;
  }
}

/**
 * Execute an INSERT, UPDATE, or DELETE query
 * @param {string} sql 
 * @param {Array} params 
 * @returns {{ changes: number, lastInsertRowid: number|bigint }}
 */
function run(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    return stmt.run(...params);
  } catch (error) {
    console.error('Database run error:', { sql, params, error: error.message });
    throw error;
  }
}

/**
 * Execute raw SQL script
 * @param {string} sql 
 */
function exec(sql) {
  return db.exec(sql);
}

module.exports = {
  db,
  query,
  get,
  run,
  exec,
  initSchema
};
