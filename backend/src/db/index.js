const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Ensure database directory exists
const dbDir = path.dirname(config.SQLITE_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(config.SQLITE_PATH);

// Enable WAL mode and foreign keys for high performance and integrity
try {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
} catch (err) {
  console.warn('Could not set WAL pragma:', err.message);
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

// Run schema initialization
initSchema();

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

migrateUserPhoneNumbers();

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
