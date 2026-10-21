const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { app, server } = require('../src/index');

test('NLPChat API Integration Tests', async (t) => {
  let port;
  
  await new Promise((resolve) => {
    server.listen(0, () => {
      port = server.address().port;
      resolve();
    });
  });

  t.after(() => {
    server.close();
  });

  function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;
      const reqHeaders = {
        'Content-Type': 'application/json',
        ...headers
      };
      if (payload) {
        reqHeaders['Content-Length'] = Buffer.byteLength(payload);
      }

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: reqHeaders
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = data ? JSON.parse(data) : {};
              resolve({ status: res.statusCode, body: parsed });
            } catch (e) {
              resolve({ status: res.statusCode, text: data });
            }
          });
        }
      );

      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  let authToken = null;
  let currentUser = null;

  await t.test('GET /api/health returns ok', async () => {
    const res = await request('GET', '/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
  });

  await t.test('POST /api/auth/demo-login logs in demo user Alice', async () => {
    const res = await request('POST', '/api/auth/demo-login', { username: 'alice' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.username, 'alice');
    assert.ok(res.body.token);
    authToken = res.body.token;
    currentUser = res.body.user;
  });

  await t.test('POST /api/auth/phone-check detects existing vs new phone numbers', async () => {
    const resExisting = await request('POST', '/api/auth/phone-check', { phone: '9000000001' });
    assert.strictEqual(resExisting.status, 200);
    assert.strictEqual(resExisting.body.exists, true);
    assert.strictEqual(resExisting.body.user.username, 'alice');

    const resNew = await request('POST', '/api/auth/phone-check', { phone: '+919999999999' });
    assert.strictEqual(resNew.status, 200);
    assert.strictEqual(resNew.body.exists, false);
  });

  await t.test('POST /api/auth/phone-login directly logs in existing user by phone', async () => {
    const res = await request('POST', '/api/auth/phone-login', { phone: '9000000001' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.username, 'alice');
    assert.strictEqual(res.body.isNewUser, false);
    assert.ok(res.body.token);
  });

  await t.test('POST /api/auth/phone-login auto-registers new user by phone', async () => {
    const testPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
    const res = await request('POST', '/api/auth/phone-login', { phone: testPhone, displayName: 'Vikash' });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.user.display_name, 'Vikash');
    assert.strictEqual(res.body.isNewUser, true);
    assert.ok(res.body.token);
  });

  await t.test('POST /api/messages/normalize returns invisible natural English preview', async () => {
    const res = await request(
      'POST',
      '/api/messages/normalize',
      { rawText: 'tmrw nhi aa pauga', targetTone: 'Natural' },
      { Authorization: `Bearer ${authToken}` }
    );
    assert.strictEqual(res.status, 200);
    assert.match(res.body.normalized, /won’t be able to come tomorrow|cannot come tomorrow/i);
    assert.strictEqual(res.body.is_question, false);
    assert.ok(res.body.confidence > 0.8);
  });

  await t.test('GET /api/chats lists conversations for Alice', async () => {
    const res = await request('GET', '/api/chats', null, { Authorization: `Bearer ${authToken}` });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.chats));
    assert.ok(res.body.chats.length >= 1);
  });

  await t.test('POST /api/messages/send delivers normalized message directly', async () => {
    // Get chat id
    const chatsRes = await request('GET', '/api/chats', null, { Authorization: `Bearer ${authToken}` });
    const chatId = chatsRes.body.chats[0].id;

    const res = await request(
      'POST',
      '/api/messages/send',
      {
        chatId,
        rawContent: 'kal milte h bro',
        approvedContent: 'Let’s meet tomorrow, bro.',
        language: 'Hinglish (Romanized Hindi)',
        tone: 'Friendly',
        confidence: 0.98,
        is_question: false,
        allowViewOriginal: false
      },
      { Authorization: `Bearer ${authToken}` }
    );

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.message.normalized_content, 'Let’s meet tomorrow, bro.');
    assert.strictEqual(res.body.message.allow_view_original, 0);
  });

  await t.test('GET /api/dictionary and POST /api/dictionary manage custom slang', async () => {
    // Add slang
    const addRes = await request(
      'POST',
      '/api/dictionary',
      { slang_term: 'wfh', normalized_meaning: 'work from home' },
      { Authorization: `Bearer ${authToken}` }
    );
    assert.ok([200, 201].includes(addRes.status));
    assert.strictEqual(addRes.body.entry.slang_term, 'wfh');

    // List slang
    const listRes = await request('GET', '/api/dictionary', null, { Authorization: `Bearer ${authToken}` });
    assert.strictEqual(listRes.status, 200);
    const hasWfh = listRes.body.entries.some((e) => e.slang_term === 'wfh');
    assert.strictEqual(hasWfh, true);
  });
});
