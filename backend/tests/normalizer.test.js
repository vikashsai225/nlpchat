const test = require('node:test');
const assert = require('node:assert');
const { normalizeMessage } = require('../src/services/normalizer');

test('NLPChat Normalizer Test Suite (35+ Test Cases)', async (t) => {

  await t.test('1. Hinglish: kkrho -> What are you doing?', async () => {
    const res = await normalizeMessage({ rawText: 'kkrho' });
    assert.match(res.normalized, /What are you doing/i);
    assert.strictEqual(res.is_question, true);
  });

  await t.test('2. SMS: wru -> Where are you?', async () => {
    const res = await normalizeMessage({ rawText: 'wru' });
    assert.match(res.normalized, /Where are you/i);
    assert.strictEqual(res.is_question, true);
  });

  await t.test('3. Hinglish: kal milte h bro -> Let’s meet tomorrow, bro.', async () => {
    const res = await normalizeMessage({ rawText: 'kal milte h bro' });
    assert.match(res.normalized, /meet tomorrow.*bro/i);
  });

  await t.test('4. Hinglish: tmrw nhi aa pauga -> I won’t be able to come tomorrow.', async () => {
    const res = await normalizeMessage({ rawText: 'tmrw nhi aa pauga' });
    assert.match(res.normalized, /won’t be able to come tomorrow|cannot come tomorrow/i);
  });

  await t.test('5. Hinglish: bhai kya scene hai -> Bro, what’s the plan?', async () => {
    const res = await normalizeMessage({ rawText: 'bhai kya scene hai' });
    assert.match(res.normalized, /what’s the plan|what is the plan/i);
  });

  await t.test('6. SMS: brb in 5 -> Be right back in 5 minutes.', async () => {
    const res = await normalizeMessage({ rawText: 'brb in 5' });
    assert.match(res.normalized, /Be right back in 5 minutes/i);
  });

  await t.test('7. SMS: idk tbh -> I don’t know, to be honest.', async () => {
    const res = await normalizeMessage({ rawText: 'idk tbh' });
    assert.match(res.normalized, /I don’t know.*to be honest/i);
  });

  await t.test('8. Hinglish: kaisa h bhai -> How are you, brother?', async () => {
    const res = await normalizeMessage({ rawText: 'kaisa h bhai' });
    assert.match(res.normalized, /How are you.*brother/i);
    assert.strictEqual(res.is_question, true);
  });

  await t.test('9. Hinglish: mast h sab -> Everything is great.', async () => {
    const res = await normalizeMessage({ rawText: 'mast h sab' });
    assert.match(res.normalized, /Everything is great/i);
  });

  await t.test('10. Hinglish: btao kya krna h -> Tell me what to do.', async () => {
    const res = await normalizeMessage({ rawText: 'btao kya krna h' });
    assert.match(res.normalized, /Tell me what to do/i);
  });

  await t.test('11. SMS & Typo: pls send d docs asap -> Please send the documents as soon as possible.', async () => {
    const res = await normalizeMessage({ rawText: 'pls send d docs asap' });
    assert.match(res.normalized, /Please send the documents as soon as possible/i);
    assert.strictEqual(res.urgency, 'high');
  });

  await t.test('12. Slang: thx a lot mate -> Thank you very much, mate.', async () => {
    const res = await normalizeMessage({ rawText: 'thx a lot mate' });
    assert.match(res.normalized, /Thank you very much, mate/i);
  });

  await t.test('13. SMS: np cya l8r -> No problem, see you later.', async () => {
    const res = await normalizeMessage({ rawText: 'np cya l8r' });
    assert.match(res.normalized, /No problem, see you later/i);
  });

  await t.test('14. Hinglish: aaj office nhi ja rha -> I am not going to the office today.', async () => {
    const res = await normalizeMessage({ rawText: 'aaj office nhi ja rha' });
    assert.match(res.normalized, /not going to the office today/i);
  });

  await t.test('15. Hinglish: ha bhai done h -> Yes bro, it’s done.', async () => {
    const res = await normalizeMessage({ rawText: 'ha bhai done h' });
    assert.match(res.normalized, /Yes bro.*done/i);
  });

  await t.test('16. Arabizi: 3la fekra ana gayy -> By the way, I am coming.', async () => {
    const res = await normalizeMessage({ rawText: '3la fekra ana gayy' });
    assert.match(res.normalized, /By the way, I am coming/i);
    assert.match(res.language, /Arabizi/i);
  });

  await t.test('17. Arabizi: 7bibi sbah el kheir -> My friend, good morning.', async () => {
    const res = await normalizeMessage({ rawText: '7bibi sbah el kheir' });
    assert.match(res.normalized, /My friend.*good morning/i);
    assert.match(res.language, /Arabizi/i);
  });

  await t.test('18. Arabizi: shukran bzaf -> Thank you very much.', async () => {
    const res = await normalizeMessage({ rawText: 'shukran bzaf' });
    assert.match(res.normalized, /Thank you very much/i);
  });

  await t.test('19. SMS: omw rn -> On my way right now.', async () => {
    const res = await normalizeMessage({ rawText: 'omw rn' });
    assert.match(res.normalized, /On my way right now/i);
  });

  await t.test('20. Slang: gimme 2 mins -> Give me two minutes.', async () => {
    const res = await normalizeMessage({ rawText: 'gimme 2 mins' });
    assert.match(res.normalized, /Give me two minutes/i);
  });

  await t.test('21. Hinglish: kal pakka done smjho -> Consider it definitely done tomorrow.', async () => {
    const res = await normalizeMessage({ rawText: 'kal pakka done smjho' });
    assert.match(res.normalized, /Consider it definitely done tomorrow/i);
  });

  await t.test('22. Hinglish: mereko samjh nhi aya -> I didn’t understand.', async () => {
    const res = await normalizeMessage({ rawText: 'mereko samjh nhi aya' });
    assert.match(res.normalized, /I didn’t understand/i);
  });

  await t.test('23. Mixed: thik h no worries -> Alright, no worries.', async () => {
    const res = await normalizeMessage({ rawText: 'thik h no worries' });
    assert.match(res.normalized, /Alright, no worries/i);
  });

  await t.test('24. Hinglish: bht bhook lgi h -> I am very hungry.', async () => {
    const res = await normalizeMessage({ rawText: 'bht bhook lgi h' });
    assert.match(res.normalized, /I am very hungry/i);
  });

  await t.test('25. Hinglish: chai pine chale? -> Shall we go for tea?', async () => {
    const res = await normalizeMessage({ rawText: 'chai pine chale?' });
    assert.match(res.normalized, /Shall we go for tea/i);
    assert.strictEqual(res.is_question, true);
  });

  await t.test('26. SMS: gng 2 slep gn -> Going to sleep, good night.', async () => {
    const res = await normalizeMessage({ rawText: 'gng 2 slep gn' });
    assert.match(res.normalized, /Going to sleep.*good night/i);
  });

  await t.test('27. Typo: soo tired today -> So tired today.', async () => {
    const res = await normalizeMessage({ rawText: 'soo tired today' });
    assert.match(res.normalized, /So tired today/i);
  });

  await t.test('28. SMS: can u call me wen free -> Can you call me when you are free?', async () => {
    const res = await normalizeMessage({ rawText: 'can u call me wen free' });
    assert.match(res.normalized, /Can you call me when you are free/i);
    assert.strictEqual(res.is_question, true);
  });

  await t.test('29. Hinglish: kya kr rhe ho abhi -> What are you doing right now?', async () => {
    const res = await normalizeMessage({ rawText: 'kya kr rhe ho abhi' });
    assert.match(res.normalized, /What are you doing right now/i);
    assert.strictEqual(res.is_question, true);
  });

  await t.test('30. Hinglish: party kb de rha h? -> When are you hosting the party?', async () => {
    const res = await normalizeMessage({ rawText: 'party kb de rha h?' });
    assert.match(res.normalized, /When are you hosting the party/i);
    assert.strictEqual(res.is_question, true);
  });

  await t.test('31. SMS: btw check ur mail -> By the way, check your email.', async () => {
    const res = await normalizeMessage({ rawText: 'btw check ur mail' });
    assert.match(res.normalized, /By the way, check your email/i);
  });

  await t.test('32. Local payment slang: send gpay no pls -> Please send your Google Pay number.', async () => {
    const res = await normalizeMessage({ rawText: 'send gpay no pls' });
    assert.match(res.normalized, /Google Pay number/i);
  });

  await t.test('33. Hinglish: chalo milte h shaam ko -> Alright, let’s meet in the evening.', async () => {
    const res = await normalizeMessage({ rawText: 'chalo milte h shaam ko' });
    assert.match(res.normalized, /meet in the evening/i);
  });

  await t.test('34. Hinglish & SMS: sorry l8 ho gya -> Sorry, I got late.', async () => {
    const res = await normalizeMessage({ rawText: 'sorry l8 ho gya' });
    assert.match(res.normalized, /Sorry.*late/i);
  });

  await t.test('35. Hinglish: sab bdia h tension mt le -> Everything is fine, don’t worry.', async () => {
    const res = await normalizeMessage({ rawText: 'sab bdia h tension mt le' });
    assert.match(res.normalized, /Everything is fine.*don’t worry/i);
  });

  await t.test('36. Emoji: 🔥 -> That’s awesome!', async () => {
    const res = await normalizeMessage({ rawText: '🔥' });
    assert.match(res.normalized, /awesome/i);
  });

  await t.test('37. Tone Adjustment: Formal', async () => {
    const res = await normalizeMessage({ rawText: 'kal milte h bro', targetTone: 'Formal' });
    assert.match(res.normalized, /colleague|tomorrow/i);
    assert.strictEqual(res.tone, 'Formal');
  });

  await t.test('38. Tone Adjustment: Friendly', async () => {
    const res = await normalizeMessage({ rawText: 'kal milte h bro', targetTone: 'Friendly' });
    assert.match(res.normalized, /😊|Hey|!/i);
    assert.strictEqual(res.tone, 'Friendly');
  });

  await t.test('39. Tone Adjustment: Concise', async () => {
    const res = await normalizeMessage({ rawText: 'bhai kya scene hai', targetTone: 'Concise' });
    assert.match(res.normalized, /What’s the plan|What is the plan/i);
    assert.strictEqual(res.tone, 'Concise');
  });

  await t.test('40. Safety: Scam detection', async () => {
    const res = await normalizeMessage({ rawText: 'Urgent: send otp number right now to verify bank account password' });
    assert.strictEqual(res.possible_scam, true);
    assert.strictEqual(res.urgency, 'high');
  });

  await t.test('41. Smart Replies generation', async () => {
    const res = await normalizeMessage({ rawText: 'kkrho' });
    assert.strictEqual(Array.isArray(res.smart_replies), true);
    assert.ok(res.smart_replies.length >= 3);
  });

  await t.test('42. Contextual Prefix + Question: hello, kya kr rha hai -> Hello, what are you doing?', async () => {
    const res = await normalizeMessage({ rawText: 'hello, kya kr rha hai' });
    assert.strictEqual(res.normalized, 'Hello, what are you doing?');
    assert.strictEqual(res.is_question, true);
    assert.strictEqual(res.confidence, 1.0);
  });

  await t.test('43. Contextual Prefix + Question: hi, kya kr rha h -> Hey, what are you doing?', async () => {
    const res = await normalizeMessage({ rawText: 'hi, kya kr rha h' });
    assert.strictEqual(res.normalized, 'Hey, what are you doing?');
    assert.strictEqual(res.is_question, true);
  });

  await t.test('44. Contextual Pronoun Question: bhai kaisa h tu -> Bro, how are you?', async () => {
    const res = await normalizeMessage({ rawText: 'bhai kaisa h tu' });
    assert.strictEqual(res.normalized, 'Bro, how are you?');
    assert.strictEqual(res.is_question, true);
  });

  await t.test('45. Contextual Unanchored Question: tu kaha ja rha h -> Where are you going?', async () => {
    const res = await normalizeMessage({ rawText: 'tu kaha ja rha h' });
    assert.strictEqual(res.normalized, 'Where are you going?');
    assert.strictEqual(res.is_question, true);
  });

  await t.test('46. Contextual Suffix: free ho kya bhai -> Are you free, bro?', async () => {
    const res = await normalizeMessage({ rawText: 'free ho kya bhai' });
    assert.strictEqual(res.normalized, 'Are you free, bro?');
    assert.strictEqual(res.is_question, true);
  });

  await t.test('47. Contextual Prefix + Clause: suno na kal milte hai -> Listen, let’s meet tomorrow.', async () => {
    const res = await normalizeMessage({ rawText: 'suno na kal milte hai' });
    assert.strictEqual(res.normalized, 'Listen, let’s meet tomorrow.');
  });

  await t.test('48. Contextual Schedule Obligation: collage jana hai 10 baje se pahle -> I have to go to college before 10 o’clock.', async () => {
    const res = await normalizeMessage({ rawText: 'collage jana hai 10 baje se pahle' });
    assert.match(res.normalized, /college.*10/i);
    assert.ok(res.confidence >= 0.9);
  });

  await t.test('49. Mixed Slang Plan: Tomorrow aana my room party will do', async () => {
    const res = await normalizeMessage({ rawText: 'Tomorrow aana my room party will do' });
    assert.ok(res.normalized && res.normalized.length > 0);
  });
});


