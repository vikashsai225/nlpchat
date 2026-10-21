const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./index');

async function seed() {
  console.log('Seeding NLPChat demo database...');

  const passwordHash = await bcrypt.hash('demopass123', 10);
  const now = new Date();

  function minutesAgo(m) {
    return new Date(now.getTime() - m * 60 * 1000).toISOString();
  }

  const users = [
    {
      id: 'usr_alice_101',
      username: 'alice',
      phone: '+919000000001',
      email: 'alice@nlpchat.demo',
      display_name: 'Alice Johnson',
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=alice',
      bio: 'Design lead & Product strategist ✨',
      preferred_receive_language: 'English',
      default_tone: 'Natural',
      allow_view_original: 'contacts',
      auto_delete_hours: 0,
      is_online: 1,
      last_seen: minutesAgo(1)
    },
    {
      id: 'usr_bob_102',
      username: 'bob',
      phone: '+919000000002',
      email: 'bob@nlpchat.demo',
      display_name: 'Bob Miller',
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=bob',
      bio: 'Frontend craftsman 💻 Loving Vite & React',
      preferred_receive_language: 'English',
      default_tone: 'Friendly',
      allow_view_original: 'contacts',
      auto_delete_hours: 0,
      is_online: 1,
      last_seen: minutesAgo(2)
    },
    {
      id: 'usr_priya_103',
      username: 'priya',
      phone: '+919000000003',
      email: 'priya@nlpchat.demo',
      display_name: 'Priya Sharma',
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=priya',
      bio: 'Architecting distributed systems 🚀',
      preferred_receive_language: 'English',
      default_tone: 'Concise',
      allow_view_original: 'contacts',
      auto_delete_hours: 0,
      is_online: 0,
      last_seen: minutesAgo(45)
    },
    {
      id: 'usr_carlos_104',
      username: 'carlos',
      phone: '+919000000004',
      email: 'carlos@nlpchat.demo',
      display_name: 'Carlos Diaz',
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=carlos',
      bio: 'Mobile apps & PWA explorer 📱',
      preferred_receive_language: 'English',
      default_tone: 'Natural',
      allow_view_original: 'everyone',
      auto_delete_hours: 0,
      is_online: 0,
      last_seen: minutesAgo(120)
    }
  ];

  for (const u of users) {
    db.run(
      `INSERT OR REPLACE INTO users (
        id, username, phone, email, password_hash, display_name, avatar_url, bio,
        preferred_receive_language, default_tone, allow_view_original,
        auto_delete_hours, is_online, last_seen, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        u.id, u.username, u.phone, u.email, passwordHash, u.display_name, u.avatar_url, u.bio,
        u.preferred_receive_language, u.default_tone, u.allow_view_original,
        u.auto_delete_hours, u.is_online, u.last_seen, minutesAgo(1440)
      ]
    );
  }

  // 1. Direct chat between Alice and Bob
  const chatAliceBobId = 'chat_alice_bob_1';
  db.run(
    `INSERT OR REPLACE INTO chats (
      id, is_group, name, created_by, auto_delete_hours, last_message_text, last_message_at, created_at, updated_at
    ) VALUES (?, 0, NULL, ?, 0, ?, ?, ?, ?)`,
    [chatAliceBobId, 'usr_alice_101', 'Let’s meet tomorrow, bro.', minutesAgo(5), minutesAgo(120), minutesAgo(5)]
  );

  db.run(`INSERT OR REPLACE INTO chat_participants (chat_id, user_id, joined_at) VALUES (?, ?, ?)`, [chatAliceBobId, 'usr_alice_101', minutesAgo(120)]);
  db.run(`INSERT OR REPLACE INTO chat_participants (chat_id, user_id, joined_at) VALUES (?, ?, ?)`, [chatAliceBobId, 'usr_bob_102', minutesAgo(120)]);

  // Messages in Alice-Bob chat
  const messagesAliceBob = [
    {
      id: 'msg_ab_1',
      chat_id: chatAliceBobId,
      sender_id: 'usr_bob_102',
      raw_content: 'kkrho',
      normalized_content: 'What are you doing?',
      language: 'Hinglish (Romanized Hindi)',
      tone: 'Natural',
      confidence: 0.98,
      is_question: 1,
      status: 'read',
      created_at: minutesAgo(40)
    },
    {
      id: 'msg_ab_2',
      chat_id: chatAliceBobId,
      sender_id: 'usr_alice_101',
      raw_content: 'Finalizing the chat UI redesign with clean light and dark themes!',
      normalized_content: 'Finalizing the chat UI redesign with clean light and dark themes!',
      language: 'English',
      tone: 'Friendly',
      confidence: 1.0,
      is_question: 0,
      status: 'read',
      created_at: minutesAgo(35)
    },
    {
      id: 'msg_ab_3',
      chat_id: chatAliceBobId,
      sender_id: 'usr_bob_102',
      raw_content: 'bhai kya scene hai',
      normalized_content: 'Bro, what’s the plan?',
      language: 'Hinglish (Romanized Hindi)',
      tone: 'Natural',
      confidence: 0.98,
      is_question: 1,
      status: 'read',
      created_at: minutesAgo(15)
    },
    {
      id: 'msg_ab_4',
      chat_id: chatAliceBobId,
      sender_id: 'usr_bob_102',
      raw_content: 'kal milte h bro',
      normalized_content: 'Let’s meet tomorrow, bro.',
      language: 'Hinglish (Romanized Hindi)',
      tone: 'Friendly',
      confidence: 0.98,
      is_question: 0,
      status: 'delivered',
      created_at: minutesAgo(5)
    }
  ];

  for (const m of messagesAliceBob) {
    db.run(
      `INSERT OR REPLACE INTO messages (
        id, client_id, chat_id, sender_id, raw_content, normalized_content,
        language, tone, confidence, is_question, urgency, possible_scam,
        status, allow_view_original, is_edited_by_sender, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'normal', 0, ?, 1, 0, ?)`,
      [
        m.id, uuidv4(), m.chat_id, m.sender_id, m.raw_content, m.normalized_content,
        m.language, m.tone, m.confidence, m.is_question, m.status, m.created_at
      ]
    );
  }

  // 2. Direct chat between Alice and Priya
  const chatAlicePriyaId = 'chat_alice_priya_2';
  db.run(
    `INSERT OR REPLACE INTO chats (
      id, is_group, name, created_by, auto_delete_hours, last_message_text, last_message_at, created_at, updated_at
    ) VALUES (?, 0, NULL, ?, 0, ?, ?, ?, ?)`,
    [chatAlicePriyaId, 'usr_alice_101', 'Everything is great.', minutesAgo(25), minutesAgo(300), minutesAgo(25)]
  );

  db.run(`INSERT OR REPLACE INTO chat_participants (chat_id, user_id, joined_at) VALUES (?, ?, ?)`, [chatAlicePriyaId, 'usr_alice_101', minutesAgo(300)]);
  db.run(`INSERT OR REPLACE INTO chat_participants (chat_id, user_id, joined_at) VALUES (?, ?, ?)`, [chatAlicePriyaId, 'usr_priya_103', minutesAgo(300)]);

  db.run(
    `INSERT OR REPLACE INTO messages (
      id, client_id, chat_id, sender_id, raw_content, normalized_content,
      language, tone, confidence, is_question, urgency, possible_scam,
      status, allow_view_original, is_edited_by_sender, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'normal', 0, 'read', 1, 0, ?)`,
    [
      'msg_ap_1', uuidv4(), chatAlicePriyaId, 'usr_priya_103', 'mast h sab',
      'Everything is great.', 'Hinglish (Romanized Hindi)', 'Natural', 0.98, 0, minutesAgo(25)
    ]
  );

  // 3. Group chat: NLPChat Engineering
  const groupChatId = 'chat_nlpchat_eng_group';
  db.run(
    `INSERT OR REPLACE INTO chats (
      id, is_group, name, description, avatar_url, created_by, auto_delete_hours,
      last_message_text, last_message_at, created_at, updated_at
    ) VALUES (?, 1, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
    [
      groupChatId,
      '🚀 NLPChat Engineering',
      'Core development team for real-time natural language messaging',
      'https://api.dicebear.com/7.x/identicon/svg?seed=nlpchat-eng',
      'usr_alice_101',
      'Please send the documents as soon as possible.',
      minutesAgo(8),
      minutesAgo(1440),
      minutesAgo(8)
    ]
  );

  for (const u of users) {
    db.run(
      `INSERT OR REPLACE INTO chat_participants (chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)`,
      [groupChatId, u.id, u.id === 'usr_alice_101' ? 'admin' : 'member', minutesAgo(1440)]
    );
  }

  const groupMessages = [
    {
      id: 'msg_grp_1',
      sender_id: 'usr_carlos_104',
      raw_content: 'omw rn to test the mobile PWA build on device',
      normalized_content: 'On my way right now to test the mobile PWA build on device.',
      language: 'SMS / Internet Slang',
      tone: 'Natural',
      confidence: 0.95,
      is_question: 0,
      created_at: minutesAgo(60)
    },
    {
      id: 'msg_grp_2',
      sender_id: 'usr_bob_102',
      raw_content: 'pls send d docs asap',
      normalized_content: 'Please send the documents as soon as possible.',
      language: 'SMS & Typo',
      tone: 'Concise',
      confidence: 0.96,
      is_question: 0,
      created_at: minutesAgo(8)
    }
  ];

  for (const m of groupMessages) {
    db.run(
      `INSERT OR REPLACE INTO messages (
        id, client_id, chat_id, sender_id, raw_content, normalized_content,
        language, tone, confidence, is_question, urgency, possible_scam,
        status, allow_view_original, is_edited_by_sender, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'normal', 0, 'read', 1, 0, ?)`,
      [
        m.id, uuidv4(), groupChatId, m.sender_id, m.raw_content, m.normalized_content,
        m.language, m.tone, m.confidence, m.is_question, m.created_at
      ]
    );
  }

  // Personal dictionary entries
  db.run(
    `INSERT OR REPLACE INTO personal_dictionary (id, user_id, slang_term, normalized_meaning, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    ['dict_1', 'usr_alice_101', 'bt', 'stressful situation', minutesAgo(1000)]
  );
  db.run(
    `INSERT OR REPLACE INTO personal_dictionary (id, user_id, slang_term, normalized_meaning, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    ['dict_2', 'usr_alice_101', 'jugaad', 'clever workaround', minutesAgo(1000)]
  );

  console.log('Seeding completed successfully! 4 demo users ready (alice, bob, priya, carlos).');
}

seed();
