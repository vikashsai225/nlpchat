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
  console.warn('[DB] node:sqlite not available in this Node runtime (' + process.version + '). Using resilient persistent store.');
  const jsonPath = config.SQLITE_PATH.replace(/\.db$/, '.json');

  function getSeedStore() {
    return {
      users: [
        {
          id: 'usr_alice_101',
          username: 'alice',
          phone: '+919000000001',
          email: 'alice@nlpchat.demo',
          password_hash: '$2a$10$demopasshashalice',
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
          password_hash: '$2a$10$demopasshashbob',
          display_name: 'Bob Miller',
          avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=bob',
          bio: 'Frontend craftsman 💻 Loving Vite & React',
          preferred_receive_language: 'English',
          default_tone: 'Friendly',
          allow_view_original: 'contacts',
          auto_delete_hours: 0,
          is_online: 1,
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString()
        },
        {
          id: 'usr_priya_103',
          username: 'priya',
          phone: '+919000000003',
          email: 'priya@nlpchat.demo',
          password_hash: '$2a$10$demopasshashpriya',
          display_name: 'Priya Sharma',
          avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=priya',
          bio: 'Data Scientist & AI Researcher 🧠',
          preferred_receive_language: 'English',
          default_tone: 'Natural',
          allow_view_original: 'contacts',
          auto_delete_hours: 0,
          is_online: 1,
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString()
        },
        {
          id: 'usr_carlos_104',
          username: 'carlos',
          phone: '+919000000004',
          email: 'carlos@nlpchat.demo',
          password_hash: '$2a$10$demopasshashcarlos',
          display_name: 'Carlos Ruiz',
          avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=carlos',
          bio: 'DevOps & Cloud Architect ☁️',
          preferred_receive_language: 'English',
          default_tone: 'Concise',
          allow_view_original: 'contacts',
          auto_delete_hours: 0,
          is_online: 0,
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      ],
      chats: [
        {
          id: 'chat_alice_bob',
          is_group: 0,
          name: null,
          created_by: 'usr_alice_101',
          last_message_text: 'Hey Bob, how are you doing?',
          last_message_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      chat_participants: [
        { chat_id: 'chat_alice_bob', user_id: 'usr_alice_101', role: 'member', joined_at: new Date().toISOString() },
        { chat_id: 'chat_alice_bob', user_id: 'usr_bob_102', role: 'member', joined_at: new Date().toISOString() }
      ],
      messages: [
        {
          id: 'msg_init_1',
          chat_id: 'chat_alice_bob',
          sender_id: 'usr_alice_101',
          raw_content: 'kkrho bob',
          normalized_content: 'Hey Bob, what are you doing?',
          language: 'Hindi/English',
          tone: 'Friendly',
          confidence: 0.98,
          is_question: 1,
          urgency: 'normal',
          possible_scam: 0,
          status: 'read',
          created_at: new Date().toISOString()
        }
      ],
      personal_dictionary: []
    };
  }

  function loadMemory() {
    try {
      if (fs.existsSync(jsonPath)) {
        const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        if (parsed.users && parsed.users.length > 0) return parsed;
      }
    } catch (_) {}
    return getSeedStore();
  }

  const memoryStore = loadMemory();

  function saveMemory() {
    try {
      fs.writeFileSync(jsonPath, JSON.stringify(memoryStore, null, 2), 'utf8');
    } catch (_) {}
  }

  db = {
    exec: () => {},
    prepare: (sql) => ({
      all: (...params) => {
        const s = sql.toLowerCase();
        if (s.includes('pragma')) return [{ name: 'phone' }];
        if (s.includes('from users')) {
          if (s.includes('where id !=')) {
            const excludeId = params[0];
            return memoryStore.users.filter(u => u.id !== excludeId);
          }
          return memoryStore.users;
        }
        if (s.includes('from chats')) {
          const userId = params[0];
          const userChatIds = new Set(
            memoryStore.chat_participants.filter(cp => cp.user_id === userId).map(cp => cp.chat_id)
          );
          return memoryStore.chats
            .filter(c => userChatIds.has(c.id))
            .map(c => {
              const otherCp = memoryStore.chat_participants.find(cp => cp.chat_id === c.id && cp.user_id !== userId);
              const otherUser = otherCp ? memoryStore.users.find(u => u.id === otherCp.user_id) : null;
              return {
                ...c,
                display_name: c.name || otherUser?.display_name || 'Direct Chat',
                avatar_url: c.avatar_url || otherUser?.avatar_url || '',
                is_online: otherUser ? otherUser.is_online : 0,
                last_seen: otherUser ? otherUser.last_seen : null,
                unread_count: 0
              };
            });
        }
        if (s.includes('from messages')) {
          const chatId = params[0];
          return memoryStore.messages.filter(m => m.chat_id === chatId);
        }
        if (s.includes('from personal_dictionary')) {
          const userId = params[0];
          return memoryStore.personal_dictionary.filter(d => d.user_id === userId);
        }
        return [];
      },
      get: (...params) => {
        const s = sql.toLowerCase();
        if (s.includes('count(*)')) {
          if (s.includes('from users')) return { count: memoryStore.users.length };
          return { count: 0 };
        }
        if (s.includes('from users')) {
          if (s.includes('where id =')) {
            const id = params[0];
            return memoryStore.users.find(u => u.id === id) || null;
          }
          if (s.includes('where username =')) {
            const uname = (params[0] || '').toLowerCase();
            return memoryStore.users.find(u => u.username.toLowerCase() === uname) || null;
          }
          if (s.includes('where phone in') || s.includes('where phone =')) {
            const searchPhones = Array.isArray(params[0]) ? params[0] : params;
            const flatPhones = searchPhones.flat().map(p => typeof p === 'string' ? p.trim() : '');
            return memoryStore.users.find(u => {
              const userDigits = u.phone.replace(/\D/g, '').slice(-10);
              return flatPhones.some(p => {
                if (!p) return false;
                if (u.phone === p) return true;
                const pDigits = p.replace(/\D/g, '').slice(-10);
                return pDigits && userDigits && pDigits === userDigits;
              });
            }) || null;
          }
          return null;
        }
        if (s.includes('from chats')) {
          const id = params[0];
          return memoryStore.chats.find(c => c.id === id) || null;
        }
        if (s.includes('from messages')) {
          const id = params[0];
          return memoryStore.messages.find(m => m.id === id) || null;
        }
        return null;
      },
      run: (...params) => {
        const s = sql.toLowerCase();
        if (s.includes('insert into users')) {
          const [id, username, phone, email, password_hash, display_name, avatar_url, created_at] = params;
          const existingIdx = memoryStore.users.findIndex(u => {
            const uDigits = u.phone.replace(/\D/g, '').slice(-10);
            const pDigits = (phone || '').replace(/\D/g, '').slice(-10);
            return (pDigits && uDigits && pDigits === uDigits) || u.username === username;
          });
          const newUser = {
            id,
            username,
            phone,
            email,
            password_hash,
            display_name,
            avatar_url,
            bio: 'Available on NLPChat',
            preferred_receive_language: 'English',
            default_tone: 'Natural',
            allow_view_original: 'contacts',
            auto_delete_hours: 0,
            is_online: 1,
            last_seen: new Date().toISOString(),
            created_at: created_at || new Date().toISOString()
          };
          if (existingIdx >= 0) {
            memoryStore.users[existingIdx] = { ...memoryStore.users[existingIdx], ...newUser };
          } else {
            memoryStore.users.push(newUser);
          }
          saveMemory();
          return { changes: 1, lastInsertRowid: memoryStore.users.length };
        }
        if (s.includes('update users set')) {
          if (s.includes('where id =')) {
            const id = params[params.length - 1];
            const u = memoryStore.users.find(x => x.id === id);
            if (u) {
              if (s.includes('is_online = ?')) u.is_online = params[0];
              if (s.includes('display_name = ?')) u.display_name = params[0];
              saveMemory();
            }
          }
          return { changes: 1, lastInsertRowid: 1 };
        }
        if (s.includes('insert into chats') || s.includes('insert or replace into chats')) {
          const [id, is_group, name, description, avatar_url, created_by, auto_delete_hours, last_message_text, last_message_at, created_at, updated_at] = params;
          memoryStore.chats.push({ id, is_group, name, description, avatar_url, created_by, auto_delete_hours, last_message_text, last_message_at, created_at, updated_at });
          saveMemory();
          return { changes: 1, lastInsertRowid: memoryStore.chats.length };
        }
        if (s.includes('insert into chat_participants')) {
          const [chat_id, user_id, role, joined_at] = params;
          memoryStore.chat_participants.push({ chat_id, user_id, role, joined_at });
          saveMemory();
          return { changes: 1, lastInsertRowid: memoryStore.chat_participants.length };
        }
        if (s.includes('insert into messages')) {
          const [id, client_id, chat_id, sender_id, raw_content, normalized_content, language, tone, confidence, is_question, urgency, possible_scam, status, allow_view_original, is_edited, created_at] = params;
          memoryStore.messages.push({ id, client_id, chat_id, sender_id, raw_content, normalized_content, language, tone, confidence, is_question, urgency, possible_scam, status, allow_view_original, is_edited, created_at });
          saveMemory();
          return { changes: 1, lastInsertRowid: memoryStore.messages.length };
        }
        return { changes: 1, lastInsertRowid: 1 };
      }
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
  initSchema,
  isNodeSqlite
};
