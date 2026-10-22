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
      personal_dictionary: [],
      starred_messages: []
    };
  }

  function loadMemory() {
    try {
      if (fs.existsSync(jsonPath)) {
        const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        if (parsed.users && parsed.users.length > 0) {
          if (!parsed.starred_messages) parsed.starred_messages = [];
          if (!parsed.personal_dictionary) parsed.personal_dictionary = [];
          return parsed;
        }
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

        // USERS
        if (s.includes('from users')) {
          if (s.includes('where id !=')) {
            const excludeId = params[0];
            let list = memoryStore.users.filter(u => u.id !== excludeId);
            if (s.includes('like ?')) {
              const term = (params[1] || '').replace(/%/g, '').toLowerCase();
              list = list.filter(u =>
                (u.username && u.username.toLowerCase().includes(term)) ||
                (u.display_name && u.display_name.toLowerCase().includes(term)) ||
                (u.phone && u.phone.includes(term))
              );
            }
            return list.map(u => ({
              id: u.id,
              username: u.username,
              phone: u.phone,
              display_name: u.display_name,
              avatar_url: u.avatar_url,
              bio: u.bio,
              is_online: u.is_online,
              last_seen: u.last_seen
            }));
          }
          return memoryStore.users;
        }

        // CHAT PARTICIPANTS with users JOIN
        if (s.includes('from chat_participants cp join users u') || s.includes('from chat_participants cp')) {
          const chatId = params[0];
          return memoryStore.chat_participants
            .filter(cp => cp.chat_id === chatId)
            .map(cp => {
              const u = memoryStore.users.find(x => x.id === cp.user_id) || {};
              return {
                ...cp,
                username: u.username,
                display_name: u.display_name,
                avatar_url: u.avatar_url,
                is_online: u.is_online,
                last_seen: u.last_seen
              };
            });
        }

        // CHATS FOR USER
        if (s.includes('from chats c join chat_participants cp') || (s.includes('from chats') && s.includes('chat_participants'))) {
          const userId = params[0];
          const userParticipantRows = memoryStore.chat_participants.filter(cp => cp.user_id === userId);
          const userChatIds = new Set(userParticipantRows.map(cp => cp.chat_id));
          return memoryStore.chats
            .filter(c => userChatIds.has(c.id))
            .map(c => {
              const cpRow = userParticipantRows.find(cp => cp.chat_id === c.id);
              return {
                id: c.id,
                is_group: c.is_group ? 1 : 0,
                name: c.name,
                description: c.description,
                avatar_url: c.avatar_url,
                created_by: c.created_by,
                auto_delete_hours: c.auto_delete_hours || 0,
                last_message_text: c.last_message_text,
                last_message_at: c.last_message_at,
                updated_at: c.updated_at,
                custom_receive_language: cpRow?.custom_receive_language || null,
                role: cpRow?.role || 'member',
                last_read_at: cpRow?.last_read_at || null
              };
            });
        }

        // MESSAGES FOR CHAT
        if (s.includes('from messages')) {
          const chatId = params.find(p => typeof p === 'string' && memoryStore.chats.some(c => c.id === p)) || params[1] || params[0];
          let rows = memoryStore.messages.filter(m => m.chat_id === chatId);
          return rows.map(m => {
            const u = memoryStore.users.find(x => x.id === m.sender_id) || {};
            const isStarred = (memoryStore.starred_messages || []).some(sm => sm.message_id === m.id && sm.user_id === params[0]);
            return {
              ...m,
              sender_name: u.display_name || 'User',
              sender_avatar: u.avatar_url || '',
              sender_privacy: u.allow_view_original || 'contacts',
              is_starred: isStarred ? 1 : 0
            };
          });
        }

        // PERSONAL DICTIONARY
        if (s.includes('from personal_dictionary')) {
          const userId = params[0];
          return (memoryStore.personal_dictionary || []).filter(d => d.user_id === userId);
        }

        // STARRED MESSAGES
        if (s.includes('from starred_messages')) {
          const userId = params[0];
          return (memoryStore.starred_messages || [])
            .filter(sm => sm.user_id === userId)
            .map(sm => {
              const m = memoryStore.messages.find(msg => msg.id === sm.message_id) || {};
              const u = memoryStore.users.find(usr => usr.id === m.sender_id) || {};
              const c = memoryStore.chats.find(ch => ch.id === m.chat_id) || {};
              return {
                ...m,
                sender_name: u.display_name,
                sender_avatar: u.avatar_url,
                chat_name: c.name,
                is_group: c.is_group
              };
            });
        }

        return [];
      },
      get: (...params) => {
        const s = sql.toLowerCase();
        if (s.includes('count(*)')) {
          if (s.includes('from users')) return { count: memoryStore.users.length };
          if (s.includes('from chats')) return { count: memoryStore.chats.length };
          if (s.includes('from messages')) return { count: memoryStore.messages.length };
          return { count: 0 };
        }

        // CHAT PARTICIPANTS
        if (s.includes('from chat_participants')) {
          if (s.includes('cp.user_id != ?') || s.includes('select cp.user_id, u.display_name')) {
            const chatId = params[0];
            const excludeUserId = params[1];
            const cp = memoryStore.chat_participants.find(p => p.chat_id === chatId && p.user_id !== excludeUserId);
            if (!cp) return null;
            const u = memoryStore.users.find(x => x.id === cp.user_id);
            if (!u) return null;
            return {
              id: u.id,
              username: u.username,
              display_name: u.display_name,
              avatar_url: u.avatar_url,
              bio: u.bio,
              is_online: u.is_online,
              last_seen: u.last_seen
            };
          }

          if (s.includes('chat_id = ? and user_id = ?')) {
            const chatId = params[0];
            const userId = params[1];
            const cp = memoryStore.chat_participants.find(p => p.chat_id === chatId && p.user_id === userId);
            if (!cp) return null;
            return s.includes('select 1') ? { 1: 1 } : cp;
          }
        }

        // DIRECT CHAT LOOKUP
        if (s.includes('from chats c') && s.includes('join chat_participants cp1') && s.includes('join chat_participants cp2')) {
          const user1 = params[0];
          const user2 = params[1];
          const directChat = memoryStore.chats.find(c => {
            if (c.is_group) return false;
            const participants = memoryStore.chat_participants.filter(cp => cp.chat_id === c.id).map(cp => cp.user_id);
            return participants.includes(user1) && participants.includes(user2);
          });
          return directChat ? { id: directChat.id } : null;
        }

        // USERS
        if (s.includes('from users')) {
          if (s.includes('where id =')) {
            const id = params[0];
            return memoryStore.users.find(u => u.id === id) || null;
          }
          if (s.includes('where username = ? and') || s.includes('where username = ? or phone = ?')) {
            const cleanUname = (params[0] || '').toLowerCase();
            const cleanP = (params[1] || '').replace(/\D/g, '').slice(-10);
            return memoryStore.users.find(u =>
              (u.username && u.username.toLowerCase() === cleanUname) ||
              (cleanP && u.phone && u.phone.replace(/\D/g, '').slice(-10) === cleanP)
            ) || null;
          }
          if (s.includes('where username =')) {
            const uname = (params[0] || '').toLowerCase();
            return memoryStore.users.find(u => u.username && u.username.toLowerCase() === uname) || null;
          }
          if (s.includes('where phone in') || s.includes('where phone =')) {
            const searchPhones = Array.isArray(params[0]) ? params[0] : params;
            const flatPhones = searchPhones.flat().map(p => typeof p === 'string' ? p.trim() : '');
            return memoryStore.users.find(u => {
              if (!u.phone) return false;
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

        // CHATS
        if (s.includes('from chats')) {
          const id = params[params.length - 1] || params[0];
          const chat = memoryStore.chats.find(c => c.id === id);
          if (!chat) return null;
          if (s.includes('auto_delete_hours')) return { auto_delete_hours: chat.auto_delete_hours || 0 };
          return chat;
        }

        // MESSAGES
        if (s.includes('from messages')) {
          if (s.includes('client_id = ? and sender_id = ?')) {
            const clientId = params[0];
            const senderId = params[1];
            return memoryStore.messages.find(m => m.client_id === clientId && m.sender_id === senderId) || null;
          }
          const id = params[0];
          return memoryStore.messages.find(m => m.id === id) || null;
        }

        // PERSONAL DICTIONARY
        if (s.includes('from personal_dictionary')) {
          if (s.includes('user_id = ? and slang_term = ?')) {
            const userId = params[0];
            const slangTerm = (params[1] || '').toLowerCase();
            return (memoryStore.personal_dictionary || []).find(d => d.user_id === userId && d.slang_term.toLowerCase() === slangTerm) || null;
          }
          const id = params[0];
          return (memoryStore.personal_dictionary || []).find(d => d.id === id) || null;
        }

        // STARRED MESSAGES
        if (s.includes('from starred_messages')) {
          const userId = params[0];
          const messageId = params[1];
          return (memoryStore.starred_messages || []).find(sm => sm.user_id === userId && sm.message_id === messageId) || null;
        }

        return null;
      },
      run: (...params) => {
        const s = sql.toLowerCase();

        // USERS INSERT
        if (s.includes('insert into users')) {
          const [id, username, phone, email, password_hash, display_name, avatar_url, created_at] = params;
          const uDigits = (phone || '').replace(/\D/g, '').slice(-10);
          const existingIdx = memoryStore.users.findIndex(u => {
            const existingDigits = (u.phone || '').replace(/\D/g, '').slice(-10);
            return (uDigits && existingDigits && uDigits === existingDigits) || (u.id === id);
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

        // USERS UPDATE
        if (s.includes('update users set')) {
          const id = params[params.length - 1];
          const u = memoryStore.users.find(x => x.id === id);
          if (u) {
            if (s.includes('display_name = ?')) {
              u.display_name = params[0];
            }
            if (s.includes('phone = ?')) {
              u.phone = params[0];
            }
            if (s.includes('is_online = ?')) {
              u.is_online = params[0];
            }
            if (s.includes('avatar_url = ?')) {
              u.avatar_url = params[0];
            }
            if (s.includes('bio = ?')) {
              u.bio = params[0];
            }
            saveMemory();
          }
          return { changes: 1, lastInsertRowid: 1 };
        }

        // CHATS INSERT
        if (s.includes('insert into chats') || s.includes('insert or replace into chats')) {
          let [id, is_group, ...rest] = params;
          let chatObj = {
            id,
            is_group: is_group ? 1 : 0,
            name: null,
            description: null,
            avatar_url: null,
            created_by: null,
            auto_delete_hours: 0,
            last_message_text: null,
            last_message_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          if (rest.length === 3) {
            chatObj.created_by = rest[0];
            chatObj.created_at = rest[1];
            chatObj.updated_at = rest[2];
          } else if (rest.length >= 7) {
            chatObj.name = rest[0];
            chatObj.description = rest[1];
            chatObj.avatar_url = rest[2];
            chatObj.created_by = rest[3];
            chatObj.auto_delete_hours = rest[4] || 0;
            chatObj.created_at = rest[5];
            chatObj.updated_at = rest[6];
          }
          memoryStore.chats.push(chatObj);
          saveMemory();
          return { changes: 1, lastInsertRowid: memoryStore.chats.length };
        }

        // CHATS UPDATE
        if (s.includes('update chats set')) {
          const id = params[params.length - 1];
          const chat = memoryStore.chats.find(c => c.id === id);
          if (chat) {
            if (s.includes('last_message_text = ?')) {
              chat.last_message_text = params[0];
              chat.last_message_at = params[1];
              chat.updated_at = params[2];
            }
            if (s.includes('auto_delete_hours = ?')) {
              chat.auto_delete_hours = params[0];
            }
            saveMemory();
          }
          return { changes: 1, lastInsertRowid: 1 };
        }

        // CHAT PARTICIPANTS INSERT
        if (s.includes('insert into chat_participants')) {
          const chatId = params[0];
          const userId = params[1];
          let role = 'member';
          let joinedAt = new Date().toISOString();
          if (params.length === 3) {
            joinedAt = params[2];
          } else if (params.length >= 4) {
            role = params[2];
            joinedAt = params[3];
          }
          const existingCp = memoryStore.chat_participants.find(cp => cp.chat_id === chatId && cp.user_id === userId);
          if (!existingCp) {
            memoryStore.chat_participants.push({ chat_id: chatId, user_id: userId, role, joined_at: joinedAt });
            saveMemory();
          }
          return { changes: 1, lastInsertRowid: memoryStore.chat_participants.length };
        }

        // MESSAGES INSERT
        if (s.includes('insert into messages')) {
          const [
            id, client_id, chat_id, sender_id, raw_content, normalized_content,
            language, tone, confidence, is_question, urgency, possible_scam,
            status, allow_view_original, is_edited_by_sender, expires_at, created_at
          ] = params;

          memoryStore.messages.push({
            id,
            client_id: client_id || null,
            chat_id,
            sender_id,
            raw_content,
            normalized_content,
            language: language || 'en',
            tone: tone || 'Natural',
            confidence: confidence || 1.0,
            is_question: is_question ? 1 : 0,
            urgency: urgency || 'normal',
            possible_scam: possible_scam ? 1 : 0,
            status: status || 'sent',
            allow_view_original: allow_view_original !== undefined ? allow_view_original : 1,
            is_edited_by_sender: is_edited_by_sender ? 1 : 0,
            expires_at: expires_at || null,
            created_at: created_at || new Date().toISOString()
          });
          saveMemory();
          return { changes: 1, lastInsertRowid: memoryStore.messages.length };
        }

        // PERSONAL DICTIONARY
        if (s.includes('insert into personal_dictionary')) {
          const [id, user_id, slang_term, normalized_meaning, created_at] = params;
          if (!memoryStore.personal_dictionary) memoryStore.personal_dictionary = [];
          memoryStore.personal_dictionary.push({ id, user_id, slang_term, normalized_meaning, created_at });
          saveMemory();
          return { changes: 1, lastInsertRowid: memoryStore.personal_dictionary.length };
        }
        if (s.includes('update personal_dictionary set normalized_meaning = ?')) {
          const [meaning, id] = params;
          const entry = (memoryStore.personal_dictionary || []).find(d => d.id === id);
          if (entry) {
            entry.normalized_meaning = meaning;
            saveMemory();
          }
          return { changes: 1, lastInsertRowid: 1 };
        }
        if (s.includes('delete from personal_dictionary')) {
          const [id, user_id] = params;
          memoryStore.personal_dictionary = (memoryStore.personal_dictionary || []).filter(d => !(d.id === id && d.user_id === user_id));
          saveMemory();
          return { changes: 1, lastInsertRowid: 1 };
        }

        // STARRED MESSAGES
        if (s.includes('insert into starred_messages')) {
          const [id, user_id, message_id, created_at] = params;
          if (!memoryStore.starred_messages) memoryStore.starred_messages = [];
          memoryStore.starred_messages.push({ id, user_id, message_id, created_at });
          saveMemory();
          return { changes: 1, lastInsertRowid: memoryStore.starred_messages.length };
        }
        if (s.includes('delete from starred_messages')) {
          const id = params[0];
          memoryStore.starred_messages = (memoryStore.starred_messages || []).filter(sm => sm.id !== id);
          saveMemory();
          return { changes: 1, lastInsertRowid: 1 };
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
