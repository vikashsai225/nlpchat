const { PHRASE_MAPPINGS, WORD_MAPPINGS, EMOJI_MAPPINGS } = require('./localDictionary');

/* =====================================================================
 * Constants & small helpers
 * ===================================================================== */

const MAX_INPUT_LENGTH = 2000;
const MAX_DICT_ENTRIES = 50;

// Tagged template: R`\bkya\s+${AUX}` -> case-insensitive RegExp (no double escaping)
const R = (strs, ...vals) => new RegExp(String.raw(strs, ...vals), 'i');

const AUX = '(?:ho|hai|h)';
const ME = '(?:hu|hun)';
const ING = '(?:raha|rha|rhi|rahi|rahe|rhe)';

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

// FIX: plain `MAP[key]` returns inherited members for keys like "constructor" / "toString"
// and crashes later (.trim / .charAt on a function). Only own string values are allowed.
function safeGet(map, key) {
  return hasOwn(map, key) && typeof map[key] === 'string' ? map[key] : null;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const round2 = (n) => Math.round(n * 100) / 100;

function matchCase(original, replacement) {
  return /^[A-Z]/.test(original) ? replacement.charAt(0).toUpperCase() + replacement.slice(1) : replacement;
}

const endsWithProtected = (t) => /zzph\d+zz$/i.test(t);
const EMOJI_END = /[\p{Extended_Pictographic}\ufe0f]$/u;
const hasEmoji = (t) => /\p{Extended_Pictographic}/u.test(t);

// Words after which a canned pattern may safely ignore leftovers
const FILLER = new Set(['ji', 'na', 'toh', 'to', 'mai', 'main', 'tu', 'tum', 'aap']);

// Canned patterns may only be used if they explain the WHOLE message.
// Anything left over (names, numbers, extra clauses) means we must not drop it.
function residualIsClean(lower, matched) {
  const rest = lower.replace(matched, ' ');
  const words = rest.match(/[\p{L}\p{N}]+/gu) || [];
  return words.every((w) => FILLER.has(w));
}

/* ---------- protect URLs / emails / @mentions / long numbers ---------- */

const PH_RE = /zzph(\d+)zz/gi;

function protectCritical(text) {
  const store = [];
  const keep = (m) => {
    const trail = (m.match(/[.,!?;:)\]]+$/) || [''])[0];
    const core = trail ? m.slice(0, -trail.length) : m;
    if (!core) return m;
    store.push(core);
    return `zzph${store.length - 1}zz${trail}`;
  };

  let out = text.replace(/https?:\/\/\S+|www\.\S+/gi, keep);
  out = out.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, keep);
  out = out.replace(/(?<![\w@])@\w+/g, keep);
  out = out.replace(/\+?\d[\d\s-]{2,}\d/g, (m) => (m.replace(/\D/g, '').length >= 4 ? keep(m) : m));
  return { text: out, store };
}

function restoreCritical(text, store) {
  return text.replace(PH_RE, (m, i) => (store[Number(i)] !== undefined ? store[Number(i)] : m));
}

/* ---------- personal dictionary (user controlled -> must be escaped) ---------- */

function applyPersonalDict(text, entries) {
  if (!Array.isArray(entries) || !entries.length) return text;
  const list = entries
    .map((e) => ({
      term: String((e && e.slang_term) || '').trim().slice(0, 80),
      meaning: String((e && e.normalized_meaning) || '').trim().slice(0, 80),
    }))
    .filter((e) => e.term && e.meaning)
    .slice(0, MAX_DICT_ENTRIES)
    .sort((a, b) => b.term.length - a.term.length);

  let out = text;
  for (const { term, meaning } of list) {
    try {
      const re = new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(term)}(?![\\p{L}\\p{N}_])`, 'giu');
      out = out.replace(re, () => meaning); // function => "$&" in meaning is not interpreted
    } catch (_) {
      /* skip invalid entry */
    }
  }
  return out;
}

/* =====================================================================
 * Phonetics
 * ===================================================================== */

/**
 * Collapse elongated letters: 'plzzzz' -> 'plz', 'kyaaaa' -> 'kyaa' (vowelRun=2) or 'kya' (vowelRun=1).
 */
function normalizePhonetics(text, vowelRun = 2) {
  if (!text) return text;
  return text
    .replace(/([a-zA-Z])\1{2,}/g, (m, ch) => ch.repeat(/[aeiou]/i.test(ch) ? vowelRun : 1))
    .trim();
}

/* =====================================================================
 * Detection
 * ===================================================================== */

const ARABIZI_RE =
  /\b(?:3la|7bibi|7abibi|sbah|kheir|shukran|shokran|ezayak|ezzayak|kifak|tamam|habibi|inshallah|alhamdulillah|yalla|wenak|ya3ni|bzaf|mashallah)\b/i;

const HINGLISH_STRONG = new Set([
  'kya', 'kyu', 'kyun', 'kyon', 'kaha', 'kahan', 'kidhar', 'kdhr', 'kab', 'kb', 'nhi', 'nahi',
  'bhai', 'bhaiya', 'yaar', 'yar', 'yr', 'hai', 'kr', 'kar', 'krna', 'karna', 'karo', 'mast',
  'bdia', 'badhiya', 'thik', 'theek', 'btao', 'batao', 'chalo', 'niklo', 'milte', 'samjho',
  'smjho', 'jugaad', 'pauga', 'paunga', 'bhook', 'kkrho', 'mereko', 'tereko', 'humko', 'mujhe',
  'tujhe', 'kuch', 'kch', 'gaya', 'gya', 'gayi', 'raha', 'rha', 'rhi', 'rahi', 'rahe', 'rhe',
  'suno', 'bolo', 'pata', 'pta', 'ruko', 'chinta', 'pehle', 'pahle', 'badme', 'accha', 'achha',
  'acha', 'haan', 'ghar', 'bahut', 'bohot', 'bht', 'aur', 'lekin', 'abhi', 'jaldi', 'mera',
  'meri', 'mere', 'tera', 'teri', 'tere', 'aap', 'tum', 'tumhe', 'kaise', 'kaisa', 'kaisi',
  'kaun', 'kitna', 'kitne', 'hoga', 'tha', 'thi', 'phir', 'shaam', 'subah', 'raat',
]);
const HINGLISH_WEAK = new Set([
  'h', 'ho', 'hu', 'hun', 'pe', 'na', 'kal', 'kl', 'aaj', 'aj', 'dekh', 'dekho', 'scene',
  'tension', 'chai', 'khana', 'dost', 'baad', 'ruk',
]);
const SMS_WORDS = new Set([
  'wru', 'brb', 'idk', 'tbh', 'imo', 'imho', 'fr', 'ngl', 'rn', 'asap', 'pls', 'plz', 'thx',
  'ty', 'np', 'cya', 'l8r', 'omw', 'gimme', 'lemme', 'gng', 'slep', 'gn', 'gm', 'wyd', 'hyd',
  'wya', 'hmu', 'tldr', 'fyi', 'nvm', 'ur', 'u', 'wen', 'wat',
]);

function detectLanguage(text) {
  if (typeof text !== 'string' || !text.trim()) return 'English';
  const t = text.trim();

  // FIX: old \p{Emoji} also matched digits, '#' and '*' ("123" was "Emoji Expression")
  if (/^[\p{Extended_Pictographic}\u200d\ufe0f\s]+$/u.test(t)) return 'Emoji Expression';
  if (/[\u0900-\u097F]/.test(t)) return 'Hindi (Devanagari)';
  if (/[\u0600-\u06FF]/.test(t)) return 'Arabic (Arabic script)';

  const lower = t.toLowerCase();
  if (ARABIZI_RE.test(lower)) return 'Arabizi (Arabic Chat Alphabet)';

  // FIX: one weak token ("h", "pe", "scene") used to be enough to call an English text Hinglish
  const words = lower.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  let strong = 0;
  let weak = 0;
  for (const w of words) {
    if (HINGLISH_STRONG.has(w)) strong++;
    else if (HINGLISH_WEAK.has(w)) weak++;
  }
  if (strong >= 1 || weak >= 2) return 'Hinglish (Romanized Hindi)';
  if (words.some((w) => SMS_WORDS.has(w))) return 'SMS / Internet Slang';
  return 'English / Mixed';
}

const HINGLISH_WH = new Set([
  'kya', 'kyaa', 'kaha', 'kahan', 'kidhar', 'kdhr', 'kab', 'kb', 'kyu', 'kyun', 'kyon', 'kaise',
  'kaisa', 'kaisi', 'kon', 'kaun', 'kitna', 'kitne', 'kitni', 'kisne', 'kisko', 'kiska', 'konsa',
  'kaunsa', 'kaiku',
]);
const ENGLISH_WH = new Set(['what', 'where', 'when', 'why', 'who', 'whom', 'whose', 'which', 'how', 'wat', 'wen', 'wut', 'wht']);
const AUX_Q_RE =
  /^(?:is|are|am|was|were|do|does|did|can|could|will|would|should|shall|have|has|had)\s+(?:you|u|i|we|he|she|they|it|there|this|that|anyone|everyone|someone|the|my|your|ur)\b/;

/**
 * FIX: the old version flagged "I will come", "do not worry", "that is fine", "pata nahi kya hua" ...
 * as questions because it searched English auxiliaries ("is", "do", "will") anywhere in the text.
 */
function detectIsQuestion(text) {
  if (typeof text !== 'string' || !text.trim()) return false;
  if (text.includes('?')) return true;

  const lower = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'’\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!lower) return false;

  if (/\b(?:wru|wyd|hyd|wya|kkrho)\b/.test(lower)) return true;
  if (/^kya\s+(?:baat|bat)\b/.test(lower)) return false; // "kya baat hai!" is an exclamation

  if (/\b(?:kya|kyaa|kya\s+re)$/.test(lower)) return true; // "free ho kya"
  if (/\b(?:hai|h|ho|hoga|tha|thi|hain)\s+na$/.test(lower)) return true; // "done h na"

  const tokens = lower.split(' ');
  if (tokens.slice(0, 3).some((t) => HINGLISH_WH.has(t)) && !/\b(?:pata|pta|maloom)\b/.test(lower)) return true;

  if (
    ENGLISH_WH.has(tokens[0]) &&
    tokens.length <= 8 &&
    !/\b(?:call|text|message|ping|tell|remind|let\s+me\s+know)\b/.test(lower)
  ) {
    return true;
  }
  return AUX_Q_RE.test(lower);
}

/**
 * FIX: returned 'urgent', but the pipeline's whitelist is low|normal|high, so urgency was
 * silently downgraded to 'normal'. Also 'fast' matched "breakfast"/"fasting".
 */
function detectUrgency(text) {
  const t = String(text || '').toLowerCase();
  if (/\b(?:no\s+rush|no\s+hurry|whenever|koi\s+jaldi\s+nahi|koi\s+jaldi\s+nhi|araam\s+se|aaram\s+se)\b/.test(t)) return 'low';
  if (/\b(?:asap|urgent|urgently|emergency|immediately|hurry|jaldi|jldi|turant|fatafat|abhi\s+ke\s+abhi|at\s+once)\b/.test(t)) return 'high';
  if (/\b(?:call|come|reply|send|pay|transfer|answer|pick\s+up)\b.{0,25}\b(?:right\s+now|now|abhi)\b/.test(t)) return 'high';
  return 'normal';
}

const SCAM_PATTERNS = [
  /\botp\b.{0,40}\b(?:share|send|bata|batao|btao|de\s+do|dena|bhejo|forward)\b/i,
  /\b(?:share|send|bata|batao|btao|bhejo|forward)\b.{0,40}\b(?:otp|pin|cvv|password|passcode)\b/i,
  /\b(?:kyc|pan|aadhaar|aadhar)\b.{0,40}\b(?:update|expire|expired|block|blocked|suspend|suspended|verify)/i,
  /\b(?:lottery|jackpot|prize|reward|lucky\s+draw)\b.{0,40}\b(?:won|win|winner|jeet|jeeta|claim)/i,
  /\b(?:account|card|sim|upi)\b.{0,30}\b(?:blocked|suspended|frozen|band|deactivated)\b/i,
  /\b(?:click|tap|open)\b.{0,30}\b(?:link|here)\b/i,
  /\b(?:send|transfer|bhej|bhejo)\b.{0,40}(?:money|paise|rupees?|upi|rs\.?|₹).{0,40}\b(?:urgent|urgently|immediately|abhi|asap|now)\b/i,
  /\b(?:free|double)\b.{0,20}\b(?:crypto|bitcoin|iphone|gift\s+card)\b/i,
  /\b(?:gift\s+card|google\s+play\s+card)\b.{0,30}\b(?:buy|send|code|claim)\b/i,
  /\b(?:verify|confirm)\b.{0,20}\b(?:password|account|bank)\b/i,
];

function detectPossibleScam(text) {
  const t = String(text || '');
  return SCAM_PATTERNS.some((re) => re.test(t));
}

/* =====================================================================
 * Tone
 * ===================================================================== */

// Don't paste "! 😊" on bad news / refusals / warnings
const SENSITIVE_RE =
  /\b(?:sorry|sad|died|dead|death|passed\s+away|funeral|hospital|accident|sick|ill|cancel(?:l?ed)?|cannot|can['’]t|won['’]t|not|problem|angry|worried|emergency|urgent|fail(?:ed)?|lost)\b/i;

const COMMON_STARTERS = new Set([
  'what', 'where', 'when', 'why', 'who', 'how', 'which', 'are', 'is', 'do', 'does', 'did', 'can',
  'could', 'will', 'would', 'shall', 'should', 'please', 'let', "let's", 'call', 'come', "don't",
  'you', 'we', 'they', 'it', 'that', 'this', 'there', 'the', 'a', 'an', 'my', 'your', 'alright',
  'yes', 'no', 'sorry', 'thank', 'thanks', 'hold', 'nothing', 'everything', 'have', 'going', 'coming',
]);

// FIX: old code lowercased the first letter of ANY core ("Rahul is coming" -> "Hey, rahul is coming")
function lowerFirst(s) {
  const w = (s.match(/^[A-Za-z'’]+/) || [''])[0];
  if (w && COMMON_STARTERS.has(w.toLowerCase().replace(/’/g, "'"))) return s.charAt(0).toLowerCase() + s.slice(1);
  return s;
}

function withPunctuation(text, question = false) {
  if (/[.!?…]$/.test(text) || EMOJI_END.test(text) || endsWithProtected(text)) return text;
  return text + (question ? '?' : '.');
}

function applyTone(normalizedText, targetTone = 'Natural') {
  if (typeof normalizedText !== 'string' || !normalizedText.trim()) return normalizedText;
  const toneKey = typeof targetTone === 'string' ? targetTone.trim().toLowerCase() : 'natural';
  let text = normalizedText.trim();
  const clean = text.replace(/[.!?]+$/, '');

  switch (toneKey) {
    case 'friendly': {
      if (/^(?:hello|hey|hi)\b/i.test(text)) return text;
      if (SENSITIVE_RE.test(text) || hasEmoji(text)) return withPunctuation(text);
      if (endsWithProtected(clean)) return `${clean} 😊`;
      if (text.endsWith('?')) return `Hey, ${lowerFirst(clean)}? 😊`;
      return `${clean}! 😊`;
    }

    case 'formal': {
      text = text
        .replace(/\bwon['’]t\b/gi, (m) => matchCase(m, 'will not'))
        .replace(/\bcan['’]t\b/gi, (m) => matchCase(m, 'cannot'))
        .replace(/\bshan['’]t\b/gi, (m) => matchCase(m, 'shall not'))
        .replace(/\b(\w+)n['’]t\b/gi, '$1 not')
        .replace(/\bI['’]m\b/g, 'I am')
        .replace(/\b(I|you|we|they|he|she|who)['’]ll\b/gi, '$1 will')
        .replace(/\b(I|you|we|they)['’]ve\b/gi, '$1 have')
        .replace(/\b(you|we|they)['’]re\b/gi, '$1 are')
        .replace(/\b(it|that|what|there|here|where|who|how|he|she)['’]s\b/gi, '$1 is')
        .replace(/\blet['’]s\b/gi, (m) => matchCase(m, 'let us'))
        .replace(/\bgonna\b/gi, 'going to')
        .replace(/\bwanna\b/gi, 'want to')
        .replace(/\bgotta\b/gi, 'have to')
        // FIX: "bro"/"mate" used to become "colleague" (invented a relationship). Drop the vocative instead.
        .replace(/,\s*(?:bro|dude|mate|man|brother|friend)\s*(?=,)/gi, '')
        .replace(/^(?:bro|dude|mate|man|brother|friend),\s*(?=\S)/i, '')
        .replace(/,\s*(?:bro|dude|mate|man|brother|friend)(?=[.?!]*$)/i, '')
        .replace(/^Hey\b/, 'Hello');
      text = text.charAt(0).toUpperCase() + text.slice(1);
      return withPunctuation(text);
    }

    case 'concise': {
      // FIX: old regex dropped "Yes bro," completely, losing the answer "Yes"
      text = text
        .replace(/^(yes|no)\s+bro,\s*/i, (m, a) => `${a},` + ' ')
        .replace(/^(?:hey|hello|alright|oh man|bro|man|mate|friend),\s*(?=\S)/i, '')
        .replace(/^(?:bro|man|mate|friend),\s*(?=\S)/i, '')
        .replace(/,\s*(?:bro|dude|mate|man|brother|friend|boss)(?=[.?!]*$)/i, '')
        .trim();
      text = text.charAt(0).toUpperCase() + text.slice(1);
      return withPunctuation(text);
    }

    case 'natural':
    default:
      return withPunctuation(text);
  }
}

/* =====================================================================
 * "kal" / "parso" mean yesterday OR tomorrow. Decide from tense, never guess silently.
 * ===================================================================== */

const PAST_RE =
  /\b(?:gaya|gya|gayi|gyi|gaye|tha|thi|kiya|kia|kiye|aaya|aya|aayi|hua|hui|huye|liya|diya|mila|mili|dekha|dekhi|bola|boli|suna|suni|khaya|piya|pahuncha|nikla)\b/i;
const FUTURE_RE =
  /\b(?:\w*(?:unga|ungi|enge|ega|egi|oge|ogi)|milte|chalte|karna|jana|aana|hoga|hogi|paunga|pauga|sakta|sakti)\b/i;

function kalWord(context, kind = 'kal') {
  const past = PAST_RE.test(context);
  const fut = FUTURE_RE.test(context);
  if (kind === 'parso') {
    if (past && !fut) return 'the day before yesterday';
    if (fut && !past) return 'the day after tomorrow';
    return 'the day after tomorrow (or the day before yesterday)';
  }
  if (past && !fut) return 'yesterday';
  if (fut && !past) return 'tomorrow';
  return 'tomorrow (or yesterday)';
}

function resolveKalInText(text) {
  return text
    .replace(/\b(?:kal|kl)\b/gi, () => kalWord(text))
    .replace(/\bparso\b/gi, () => kalWord(text, 'parso'));
}

/* =====================================================================
 * Prefix / suffix extraction
 * ===================================================================== */

const PREFIX_PATTERNS = [
  { regex: /^(hello|helo|hlo|namaste|salaam|salam)\b\s*[,:!]?\s*/i, english: 'Hello' },
  { regex: /^(hi+|hey+)\b\s*[,:!]?\s*/i, english: 'Hey' },
  { regex: /^(arre\s+yaar|arey\s+yaar|are\s+yaar)\b\s*[,:]?\s*/i, english: 'Oh man' },
  { regex: /^(arre\s+bhai|arey\s+bhai|are\s+bhai)\b\s*[,:]?\s*/i, english: 'Hey bro' },
  // FIX: bare "are" removed. English "are you coming?" was being read as the Hindi interjection.
  { regex: /^(arre|arey|oye|oie)\b\s*[,:]?\s*/i, english: 'Hey' },
  { regex: /^(suno\s+na|sun\s+na|suno|sun\s+bhai|sun\s+yaar|sun\s+bro)\b\s*[,:]?\s*/i, english: 'Listen' },
  { regex: /^(dekh\s+bhai|dekh\s+yaar|dekho\s+bhai|dekho|dekh)\b\s*[,:]?\s*/i, english: 'Look' },
  { regex: /^(accha\s+suno|achha\s+suno|acha\s+suno|accha\s+sun|achha\s+sun|acha\s+sun)\b\s*[,:]?\s*/i, english: 'Listen' },
  { regex: /^(accha|achha|acha)\b\s*[,:]?\s*/i, english: 'Alright' },
  { regex: /^(ok|okay|theek\s+hai|thik\s+h|theek\s+h)\b\s*[,:]?\s*/i, english: 'Alright' },
  { regex: /^(haan\s+bhai|ha\s+bhai|han\s+bhai)\b\s*[,:]?\s*/i, english: 'Yes bro' },
  { regex: /^(haan|han|ha)\b(?!\s+ha\b)\s*[,:]?\s*/i, english: 'Yes' }, // not "ha ha ha"
  { regex: /^(nahi\s+bhai|nhi\s+bhai|na\s+bhai)\b\s*[,:]?\s*/i, english: 'No bro' },
  { regex: /^(nahi|nhi)\b\s*[,:]?\s*/i, english: 'No' },
  { regex: /^(bhai\s+sun|bro\s+listen)\b\s*[,:]?\s*/i, english: 'Bro, listen' },
  { regex: /^(bhaiya|bhai|bro)\b\s*[,:]?\s*/i, english: 'Bro' },
  { regex: /^(yaar|yr)\b\s*[,:]?\s*/i, english: 'Man' },
  { regex: /^dost\b\s*[,:]?\s*/i, english: 'Friend' },
  { regex: /^mate\b\s*[,:]?\s*/i, english: 'Mate' },
  { regex: /^(waise\s+bhi|waise|btw|by\s+the\s+way)\b\s*[,:]?\s*/i, english: 'By the way' },
  { regex: /^(sorry\s+bhai|sorry\s+yaar|sorry)\b\s*[,:]?\s*/i, english: 'Sorry' },
];

// FIX: "mere bhai" (my brother) was turned into the vocative ", bro"
const POSSESSIVE_GUARD =
  '(?<!\\b(?:mere|meri|mera|tere|teri|tera|uske|uski|uska|apne|apni|apna|my|your|ur|our|his|her)\\s+)';
const vocativeRe = (words) => new RegExp(`\\s*[,:]?\\s*${POSSESSIVE_GUARD}(?:${words})\\s*[.?!]*$`, 'i');

const SUFFIX_PATTERNS = [
  { regex: vocativeRe('bhai|bhaiya'), english: ', bro' },
  { regex: vocativeRe('bro'), english: ', bro' },
  { regex: vocativeRe('yaar|yr'), english: ', man' },
  { regex: vocativeRe('dost'), english: ', friend' },
  { regex: vocativeRe('mate'), english: ', mate' },
  { regex: vocativeRe('boss'), english: ', boss' },
  { regex: vocativeRe('dude'), english: ', dude' },
  { regex: /\s*[,:]?\s*(?:abhi|rn|right\s+now)\s*[.?!]*$/i, english: ' right now' },
  { regex: /\s*[,:]?\s*(?:aaj|aj|today)\s*[.?!]*$/i, english: ' today' },
  { regex: /\s*[,:]?\s*(?:tmrw|tomorrow)\s*[.?!]*$/i, english: ' tomorrow' },
  // FIX: "kal" is yesterday OR tomorrow
  { regex: /\s*[,:]?\s*(?:kal|kl)\s*[.?!]*$/i, english: (rest) => ` ${kalWord(rest)}` },
  { regex: /\s*[,:]?\s*parso\s*[.?!]*$/i, english: (rest) => ` ${kalWord(rest, 'parso')}` },
  { regex: /\s*[,:]?\s*(?:shaam\s+ko|shaam\s+me)\s*[.?!]*$/i, english: ' in the evening' },
  { regex: /\s*[,:]?\s*(?:subah\s+ko|subah\s+me)\s*[.?!]*$/i, english: ' in the morning' },
  { regex: /\s*[,:]?\s*(?:raat\s+ko|raat\s+me)\s*[.?!]*$/i, english: ' at night' },
];

function combinePrefixAndCore(prefixText, coreText) {
  if (!prefixText) return coreText;
  if (!coreText) return `${prefixText}.`;
  const cleanPrefix = prefixText.trim().replace(/[,.:;]+$/, '');
  const endingPunct = (coreText.match(/[.?!]+$/) || ['.'])[0];
  const cleanCore = lowerFirst(coreText.trim().replace(/[.?!]+$/, ''));
  const end = endsWithProtected(cleanCore) && endingPunct === '.' ? '' : endingPunct;
  return `${cleanPrefix}, ${cleanCore}${end}`;
}

function combineCoreAndSuffix(coreText, suffixText) {
  if (!suffixText) return coreText;
  if (!coreText) return suffixText.trim();
  const endingPunct = (coreText.match(/[.?!]+$/) || ['.'])[0];
  const cleanCore = coreText.trim().replace(/[.?!]+$/, '');
  const cleanSuffix = suffixText.replace(/[.?!]+$/, '');
  const end = endsWithProtected(cleanSuffix) && endingPunct === '.' ? '' : endingPunct;
  return `${cleanCore}${cleanSuffix.startsWith(',') ? '' : ' '}${cleanSuffix.trim() === cleanSuffix ? cleanSuffix : cleanSuffix.trimStart()}${end}`;
}

/* =====================================================================
 * Whole-sentence conversational patterns
 * A pattern is only used when it explains the entire message (see residualIsClean).
 * out: string | (match, ctx) => string | { text, confidence }
 * ===================================================================== */

const PLACES = {
  collage: 'college', college: 'college', school: 'school', office: 'the office', station: 'the station',
  airport: 'the airport', market: 'the market', hospital: 'the hospital', gym: 'the gym', bank: 'the bank',
  ghar: 'home', ghr: 'home',
};

const PATTERNS = [
  // ---- location / state
  { re: R`\b(?:(?:mai|main)\s+)?(?:(?<now>abhi|rn)\s+)?(?:ghar|ghr)\s*(?:pe|me)?\s*${ME}\b`,
    out: (m) => (m.groups.now ? 'I am at home right now.' : 'I am at home.') },
  { re: R`\b(?:(?:mai|main)\s+)?(?:(?<now>abhi|rn)\s+)?office\s*(?:me|pe)?\s*${ME}\b`,
    out: (m) => (m.groups.now ? 'I am at the office right now.' : 'I am at the office.') },
  { re: R`\btraffic\s*(?:me|pe)?\s*${ME}\b`, out: 'I am stuck in traffic.' },
  { re: R`\b(?:raste\s*(?:me|pe)?|on\s*the\s*way)\s*${ME}\b`, out: 'I am on the way.' },
  { re: R`\bbahar\s*${ME}\b`, out: 'I am outside.' },
  // FIX: "theek hu" is "I am fine", not "I am doing great"
  { re: R`\b(?<w>theek|thik|badhiya|bdia|mast)\s*${ME}\b`,
    out: (m) => (/^(theek|thik)$/i.test(m.groups.w) ? 'I am fine.' : 'I am doing great.') },
  // FIX: "sab theek hai?" is a question
  { re: R`\bsab\s*(?:theek|thik|badhiya|bdia|mast|sahi)\s*${AUX}\b`,
    out: (m, ctx) => (ctx.q ? 'Is everything okay?' : 'Everything is fine.') },
  { re: R`\b(?:kuch|kch)\s*(?:khas\s*)?(?:nahi|nhi)\b`, out: (m) => (/khas/i.test(m[0]) ? 'Nothing much.' : 'Nothing.') },
  { re: R`\b(?:(?:mujhe|mereko|mujhko)\s+)?(?:(?:pata|pta|maloom)\s*(?:nahi|nhi)|(?:nahi|nhi)\s*(?:pata|pta))\b`,
    out: 'I don’t know.' },

  // ---- calls / availability
  { re: R`\bfree\s*${AUX}\s*(?:to|toh)?\s*(?:call|phone)\s*(?:karo|kar\s*do|kar|krna)\b`, out: 'Call me when you are free.' },
  { re: R`\b(?:call|phone)\s*(?:karo|kar\s*do|kariye|krna|kar)\b`, out: 'Please call me.', conf: 0.9 },
  { re: R`\bfree\s*${AUX}\s*kya\b|\bkya\s*(?:aap\s*|tu\s*)?free\s*${AUX}\b`, out: 'Are you free?' },
  { re: R`\bbusy\s*${AUX}\s*kya\b`, out: 'Are you busy?' },
  { re: R`\b(?<a>thoda\s*)?busy\s*${ME}(?:\s+(?<now>abhi|rn))?\b`,
    out: (m) => `I am ${m.groups.a ? 'a bit ' : ''}busy${m.groups.now ? ' right now' : ''}.` },

  // ---- obligations: "college jana hai 10 baje se pehle"
  // FIX: old code said "come from", dropped AM/PM, and accepted any word as a place
  { re: R`\b(?:(?:mujhe|mereko|mujhko)\s+)?(?<place>collage|college|school|office|station|airport|market|hospital|gym|bank|ghar|ghr)\s*(?:ko\s*)?(?<act>jana|aana|pahuchna)\s*${AUX}(?:\s+(?<h>\d{1,2})(?::(?<mi>\d{2}))?(?:\s*(?<ap>am|pm))?(?:\s*baje)?(?:\s*se)?(?:\s*(?<rel>pahle|pehle|tak))?)?\b`,
    out: (m) => {
      const g = m.groups;
      const place = PLACES[g.place.toLowerCase()];
      const home = place === 'home';
      const act = g.act.toLowerCase();
      let verb;
      if (act === 'jana') verb = home ? 'go home' : `go to ${place}`;
      else if (act === 'aana') verb = home ? 'come home' : `come to ${place}`;
      else verb = home ? 'get home' : `reach ${place}`;
      let when = '';
      if (g.h) {
        const rel = /^(pahle|pehle)$/i.test(g.rel || '') ? 'before' : /^tak$/i.test(g.rel || '') ? 'by' : 'at';
        const ap = g.ap ? ` ${g.ap.toUpperCase()}` : '';
        const t = g.mi ? `${g.h}:${g.mi}${ap}` : g.ap ? `${g.h}${ap}` : `${g.h} o’clock`;
        when = ` ${rel} ${t}`;
      }
      return `I have to ${verb}${when}.`;
    } },
  { re: R`\btomorrow\s*aana\s*(?:mere|my)?\s*room\s*party\b`, out: 'Come to my room tomorrow, we will have a party.', conf: 0.8 },

  // ---- "kya ..." questions
  { re: R`\b(?:(?<now>abhi|rn)\s+)?kya\s*(?:karta|krta|kar|kr)\s*${ING}\s*${AUX}\b|\bkkrho\b`,
    out: (m) => (m.groups.now ? 'What are you doing right now?' : 'What are you doing?') },
  { re: R`\bkya\s*(?:chal|chl)\s*(?:raha|rha)(?:\s*${AUX})?\b`, out: 'What is going on?' },
  { re: R`\bkya\s*(?:haal\s*chal|haal|hal)(?:\s*${AUX})?\b`, out: 'How are you doing?' },
  { re: R`\bkya\s*(?:hua|ho\s*gaya|ho\s*gya)\b`, out: 'What happened?' },
  { re: R`\bkya\s*(?:scene|plan)\s*${AUX}\b|\bplan\s*kya\s*${AUX}\b`, out: 'What’s the plan?' },
  { re: R`\bkya\s*(?:baat|bat)\s*${AUX}\b`, out: 'That’s wonderful!', conf: 0.7 }, // ambiguous idiom
  { re: R`\bkya\s*(?:bol|kh|keh)\s*${ING}\s*${AUX}\b`, out: 'What are you saying?' },

  // ---- where / when / how
  { re: R`\b(?:kaha|kahan|kidhar|kdhr)\s*(?:ja|jaa)\s*${ING}(?:\s*${AUX})?\b`, out: 'Where are you going?' },
  { re: R`\b(?:kaha|kahan|kidhar|kdhr)\s*(?:pe\s*)?${AUX}\b|\bwru\b`, out: 'Where are you?', conf: 0.85 },
  { re: R`\b(?:kaha|kahan|kidhar|kdhr)\s*milna\s*${AUX}\b`, out: 'Where should we meet?' },
  { re: R`\bkab\s*(?:aana|aaoge|aayega|aa\s*rha|aa\s*raha)(?:\s*${AUX})?\b`, out: 'When are you coming?', conf: 0.9 },
  { re: R`\bkab\s*milna\s*${AUX}\b`, out: 'When should we meet?' },
  { re: R`\bkab\s*free\s*(?:hoge|ho)\b`, out: 'When will you be free?' },
  { re: R`\bparty\s*(?:kb|kab)\s*(?:de\s*rha|de\s*raha|dega)\s*(?:h|hai)?\b`, out: 'When are you hosting the party?', conf: 0.8 },
  { re: R`\b(?:kaisa|kaise|kaisi)\s*${AUX}\b`, out: 'How are you?', conf: 0.85 },

  // ---- food / activities
  { re: R`\b(?:khana|dinner|lunch)\s*(?:kha\s*liya|khaya|kar\s*liya)\b`, out: 'Have you eaten?', conf: 0.7 },
  { re: R`\bchai\s*(?:pine|peene)\s*chale(?:n|nge)?\b`, out: 'Shall we go for tea?' },
  { re: R`\bcoffee\s*(?:pine|peene)\s*chale(?:n|nge)?\b`, out: 'Shall we grab coffee?' },
  // FIX: no invented "good night"
  { re: R`\bsone\s*(?:ja\s*raha|ja\s*rha)\s*${ME}\b|\bgng\s*(?:2|to)\s*slep\b`, out: 'I am going to sleep.' },
  { re: R`\b(?:bht|bohot|bahut)\s*(?:bhook|bhuk)\s*(?:lgi|lagi)\b`, out: 'I am very hungry.' },
  { re: R`\b(?:aa|aara)\s*${ING}\s*${ME}\b`, out: 'I am on my way.', conf: 0.85 },
  { re: R`\b(?:nikal|nikl)\s*${ING}\s*${ME}\b`, out: 'I am heading out.' },

  // ---- wait / later / understanding
  { re: R`\b(?:ruk|ruko|wait)\s*(?<n>\d+)?\s*(?:min|mins|minute|minutes)\b`,
    out: (m) => (m.groups.n ? `Hold on for ${m.groups.n} minute${m.groups.n === '1' ? '' : 's'}.` : 'Hold on for a minute.') },
  { re: R`\b(?:baad\s*me|badme)\s*baat\s*(?:karte|krte)\s*${AUX}\b`, out: 'Let’s talk later.' },
  { re: R`\bdekh\s*(?:ke|k)\s*(?:batata|btata)\s*${ME}\b`, out: 'I will check and let you know.' },
  { re: R`\b(?:samajh|samjh|smjh)\s*(?:gaya|gya)\b`, out: 'I understood.' },
  { re: R`\b(?:samajh|samjh|smjh)\s*(?:nahi|nhi)\s*(?:aaya|aya)\b`, out: 'I didn’t understand.' },
  { re: R`\b(?:tension|chinta)\s*(?:mat|mt)\s*(?:le|lo|kar|karo)\b`, out: 'Don’t worry.' },
  { re: R`\b(?:pahuch|pahunch)\s*(?:gaya|gya)\b|\breach\s*ho\s*(?:gaya|gya)\b`, out: 'I have arrived.', conf: 0.85 },

  // ---- meeting / plans
  { re: R`\b(?:kal|kl)\s*milte\s*${AUX}\b`, out: 'Let’s meet tomorrow.' },
  { re: R`\b(?:aaj|aj)\s*milte\s*${AUX}\b`, out: 'Let’s meet today.' },
  { re: R`\b(?<c>chalo\s+)?(?:milte\s*${AUX}\s*shaam\s*ko|shaam\s*ko\s*milte\s*${AUX})\b`,
    out: (m) => (m.groups.c ? 'Alright, let’s meet in the evening.' : 'Let’s meet in the evening.') },
  // FIX: "jaunga" is future ("will not go"), "ja rha" is present
  { re: R`\baaj\s*office\s*(?:nhi|nahi)\s*(?<v>ja\s*rha|ja\s*raha|jaunga)\b`,
    out: (m) => (/jaunga/i.test(m.groups.v) ? 'I will not go to the office today.' : 'I am not going to the office today.') },
  { re: R`\b(?:tmrw|kal|kl)\s*(?:nhi|nahi)\s*aa\s*(?:pauga|paunga|sakta)\b`, out: 'I won’t be able to come tomorrow.' },

  // ---- Arabizi
  { re: R`\b3la\s*fekra\s*ana\s*gayy\b`, out: 'By the way, I am coming.' },
  { re: R`\b(?:7bibi|habibi)\s*sbah\s*(?:el\s*kheir)?\b`, out: 'My dear friend, good morning.' },
  { re: R`\b(?:shukran|shokran)\s*bzaf\b`, out: 'Thank you very much.' },

  // ---- SMS
  { re: R`\bpls\s*send\s*(?:d|the)?\s*docs\s*asap\b`, out: 'Please send the documents as soon as possible.' },
  // FIX: removed bare "gpay number" alternative; "my gpay number is ..." was turned into a request
  { re: R`\bsend\s*gpay\s*no(?:mber)?\b`, out: 'Please send your Google Pay number.' },
  { re: R`\bbtw\s*check\s*(?:ur|your)\s*mail\b`, out: 'By the way, check your email.' },
  { re: R`\bthx\s*a\s*lot\s*mate\b`, out: 'Thank you very much, mate.' },
  { re: R`\bnp\s*cya\s*l8r\b`, out: 'No problem, see you later.' },
  { re: R`\bcan\s*u\s*call\s*me\s*(?:wen|when)\s*free\b`, out: 'Can you call me when you are free?' },
  { re: R`\bso+\s*tired\s*today\b`, out: 'So tired today.' },
  { re: R`\bsorry\s*(?:l8|late)\s*ho\s*(?:gya|gaya)\b`, out: 'Sorry, I am late.' },
];

/**
 * Returns { text, confidence } or null.
 * FIX: the old version used unanchored .test() and returned a canned sentence, silently dropping
 * the rest of the message ("ghar pe hu, OTP 482913 hai" -> "I am at home.").
 */
function matchConversationalPatterns(lower, ctx = {}) {
  for (const p of PATTERNS) {
    const m = lower.match(p.re);
    if (!m) continue;
    if (!residualIsClean(lower, m[0])) continue;
    const r = typeof p.out === 'function' ? p.out(m, ctx) : p.out;
    if (!r) continue;
    const res = typeof r === 'string' ? { text: r, confidence: p.conf || 0.95 } : r;
    // A statement must never answer a message that was typed as a question
    if (ctx.q && !res.text.endsWith('?')) continue;
    return res;
  }
  return null;
}

/* =====================================================================
 * Sliding-window n-gram rules (adjacent words)
 * ===================================================================== */

const CONTEXTUAL_NGRAMS = [
  { regex: /\b(kya|wat|wut)\s*(kar|kr)\s*(rahe|rhe|raha|rha|rhi|rahi)\s*(hu|hun)\b/gi, replace: 'what am I doing' },
  { regex: /\b(ghar|ghr)\s*(ja|jaa)\s*(raha|rha|rhi|rahi)\s*(hu|hun)\b/gi, replace: 'am going home' },
  { regex: /\b(kya|wat|wut)\s*(kar|kr|krta|karta)\s*(rahe|rhe|raha|rha|rhi|rahi)\s*(ho|hai|h)\b/gi, replace: 'what are you doing' },
  { regex: /\b(kya|wat|wut)\s*(kar|kr)\s*(rahe|rhe|raha|rha|rhi|rahi)\b/gi, replace: 'what are you doing' },
  { regex: /\b(kaha|kahan|kidhar|kdhr)\s*(ja|jaa)\s*(rahe|rhe|raha|rha|rhi|rahi)\s*(ho|hai|h)\b/gi, replace: 'where are you going' },
  { regex: /\b(kaha|kahan|kidhar|kdhr)\s*(ja|jaa)\s*(rahe|rhe|raha|rha|rhi|rahi)\b/gi, replace: 'where are you going' },
  { regex: /\b(kaha|kahan|kidhar|kdhr)\s*(pe)?\s*(ho|hai|h)\b/gi, replace: 'where are you' },
  { regex: /\b(kab|kb)\s*(aa|aana|aaoge|aayega)\s*(rahe|rhe|raha|rha)?\s*(ho|hai|h)?\b/gi, replace: 'when are you coming' },
  { regex: /\b(kaisa|kaise|kaisi)\s*(ho|hai|h)\b/gi, replace: 'how are you' },
  { regex: /\b(kya|wat)\s*(chal|chl)\s*(raha|rha)\s*(hai|h)?\b/gi, replace: 'what is going on' },
  { regex: /\b(kya|wat)\s*(scene|plan)\s*(hai|h)?\b/gi, replace: 'what is the plan' },
  { regex: /\b(kya|wat)\s*(hua|ho\s*gya|ho\s*gaya)\b/gi, replace: 'what happened' },

  { regex: /\b(kar|kr)\s*(raha|rha|rhe|rahe|rhi|rahi)\s*(hu|hun)\b/gi, replace: 'am doing' },
  { regex: /\b(kar|kr)\s*(raha|rha|rhe|rahe|rhi|rahi)\s*(ho|hai|h)\b/gi, replace: 'is doing' },
  { regex: /\b(kar|kr)\s*(raha|rha|rhe|rahe|rhi|rahi)\b/gi, replace: 'doing' },

  { regex: /\b(ja|jaa)\s*(raha|rha|rhe|rahe|rhi|rahi)\s*(hu|hun)\b/gi, replace: 'am going' },
  { regex: /\b(ja|jaa)\s*(raha|rha|rhe|rahe|rhi|rahi)\s*(ho|hai|h)\b/gi, replace: 'is going' },
  { regex: /\b(ja|jaa)\s*(raha|rha|rhe|rahe|rhi|rahi)\b/gi, replace: 'going' },

  { regex: /\b(aa|aara)\s*(raha|rha|rhe|rahe|rhi|rahi)\s*(hu|hun)\b/gi, replace: 'am coming' },
  { regex: /\b(aa|aara)\s*(raha|rha|rhe|rahe|rhi|rahi)\s*(ho|hai|h)\b/gi, replace: 'is coming' },
  { regex: /\b(aa|aara)\s*(raha|rha|rhe|rahe|rhi|rahi)\b/gi, replace: 'coming' },

  { regex: /\b(bol|keh|kh)\s*(raha|rha|rhe|rahe)\s*(hu|hun)\b/gi, replace: 'am saying' },
  { regex: /\b(bol|keh|kh)\s*(raha|rha|rhe|rahe)\b/gi, replace: 'saying' },
  { regex: /\b(dekh)\s*(raha|rha|rhe|rahe)\s*(hu|hun)\b/gi, replace: 'am watching' },
  { regex: /\b(dekh)\s*(raha|rha|rhe|rahe)\b/gi, replace: 'watching' },
  { regex: /\b(so)\s*(raha|rha|rhe|rahe)\s*(hu|hun)\b/gi, replace: 'am sleeping' },
  { regex: /\b(so)\s*(raha|rha|rhe|rahe)\b/gi, replace: 'sleeping' },
  { regex: /\b(padh|study)\s*(kar|kr)?\s*(raha|rha|rhi|rahi)\b/gi, replace: 'studying' },

  // FIX: replacements now include the verb ("I at home" -> "I am at home")
  { regex: /\b(ghar|ghr)\s*(pe|me)?\s*(hu|hun)\b/gi, replace: 'am at home' },
  { regex: /\boffice\s*(me|pe)?\s*(hu|hun)\b/gi, replace: 'am at the office' },
  { regex: /\b(raste|on the way)\s*(me|pe)?\s*(hu|hun)\b/gi, replace: 'am on the way' },
  { regex: /\btraffic\s*(me|pe)?\s*(hu|hun)\b/gi, replace: 'am stuck in traffic' },
  { regex: /\bbahar\s*(hu|hun)\b/gi, replace: 'am outside' },

  { regex: /\b(nhi|nahi)\s*aa\s*(pauga|paunga|sakta|sakti)\b/gi, replace: 'cannot come' },
  { regex: /\b(nhi|nahi)\s*ja\s*(pauga|paunga|sakta|sakti)\b/gi, replace: 'cannot go' },
  { regex: /\b(nhi|nahi)\s*(kar|kr)\s*(pauga|paunga|sakta|sakti)\b/gi, replace: 'cannot do' },
  { regex: /\b(nhi|nahi)\s*(pata|pta)\b/gi, replace: 'do not know' },
  { regex: /\b(pata|pta)\s*(nhi|nahi)\b/gi, replace: 'do not know' },
  { regex: /\b(samjh|samajh)\s*(nhi|nahi)\s*(aya|aaya)\b/gi, replace: 'did not understand' },
  { regex: /\b(tension|chinta)\s*(mt|mat)\s*(le|lo|kar)\b/gi, replace: 'do not worry' },

  { regex: /\b(kal|kl|tmrw)\s*milte\s*(hai|h)\b/gi, replace: 'let us meet tomorrow' },
  { regex: /\b(aaj|aj)\s*milte\s*(hai|h)\b/gi, replace: 'let us meet today' },
  { regex: /\bshaam\s*ko\s*milte\s*(hai|h)\b/gi, replace: 'let us meet in the evening' },
  { regex: /\bchalo\s*milte\s*(hai|h)\b/gi, replace: 'let us meet' },
  { regex: /\bbaad\s*me\s*baat\s*(karte|krte)\s*(hai|h)\b/gi, replace: 'let us talk later' },
  { regex: /\bbaad\s*me\s*call\s*(karta|krta)\s*(hu|hun)\b/gi, replace: 'will call you later' },

  { regex: /\b(call|phone)\s*(karo|kar|krna|kariye)\b/gi, replace: 'please call' },
  { regex: /\bdekh\s*(ke|k)\s*(batata|btata)\s*(hu|hun)\b/gi, replace: 'will check and let you know' },
  { regex: /\bpuch\s*(ke|k)\s*(batata|btata)\s*(hu|hun)\b/gi, replace: 'will ask and let you know' },

  { regex: /\b(mai|main)\s*(hu|hun)\b/gi, replace: 'I am' },
  { regex: /\b(tu|tum)\s*(ho|hai|h)\b/gi, replace: 'you are' },
  { regex: /\baap\s*(ho|hai|h)\b/gi, replace: 'you are' },
  { regex: /\b(hum|hm)\s*(hai|h)\b/gi, replace: 'we are' },
];

// English-looking words that also exist in Hinglish. Only substituted when the text is Hinglish.
const AMBIGUOUS_WORDS = new Set([
  'me', 'to', 'hi', 'do', 'the', 'so', 'main', 'mat', 'par', 'pal', 'den', 'log', 'sab', 'ab', 'us', 'aa', 'bas',
]);

/* =====================================================================
 * Grammar clean-up
 * ===================================================================== */

const ING_WORDS = '(?:doing|going|coming|saying|watching|sleeping|studying)';

function applyGrammaticalFixes(text) {
  let res = text
    .replace(/\b(you|we|they)\s+is\b/gi, '$1 are')
    .replace(/\bI\s+(?:is|are)\b/g, 'I am')
    .replace(/\bwhat\s+am\s+doing\b/gi, 'what am I doing')
    .replace(/\bwhat\s+you\s+doing\b/gi, 'what are you doing')
    .replace(/\bwhere\s+you\s+going\b/gi, 'where are you going')
    .replace(/\bwhen\s+you\s+coming\b/gi, 'when are you coming')
    .replace(/\bhow\s+you\s+doing\b/gi, 'how are you doing')
    .replace(/\bwhere\s+you\s+is\b/gi, 'where are you')
    .replace(/\bwho\s+you\s+is\b/gi, 'who are you')
    .replace(/\byou\s+where\s+are\s+you\s+going\b/gi, 'where are you going')
    .replace(/\byou\s+what\s+are\s+you\s+doing\b/gi, 'what are you doing')
    .replace(/\byou\s+how\s+are\s+you\b/gi, 'how are you')
    .replace(new RegExp(`(?<!\\b(?:am|are|is)\\s)\\bI\\s+(${ING_WORDS})\\b`, 'g'), 'I am $1')
    .replace(new RegExp(`(?<!\\b(?:am|are|is)\\s)\\b(you|we|they)\\s+(${ING_WORDS})\\b`, 'gi'), '$1 are $2')
    .replace(new RegExp(`(?<!\\b(?:am|are|is)\\s)\\b(he|she|it)\\s+(${ING_WORDS})\\b`, 'gi'), '$1 is $2')
    // subject-less verb phrases produced by n-grams
    .replace(/^(am|cannot|do not know|did not understand|will call you later|will check|will ask)\b/i, 'I $1')
    .replace(/\s+/g, ' ')
    .trim();

  if (res.length > 0) res = res.charAt(0).toUpperCase() + res.slice(1);
  return res.replace(/\bi\b/g, 'I');
}

/* =====================================================================
 * Main
 * ===================================================================== */

function normalizeWithRules(rawText, targetTone = 'Natural', personalDictEntries = []) {
  const tone = typeof targetTone === 'string' && targetTone.trim() ? targetTone.trim() : 'Natural';

  if (typeof rawText !== 'string' || !rawText.trim()) {
    return {
      language: 'English', normalized: '', tone, confidence: 1.0,
      is_question: false, urgency: 'normal', possible_scam: false,
    };
  }

  const rawClean = rawText.replace(/\s+/g, ' ').trim().slice(0, MAX_INPUT_LENGTH);

  // URLs, emails, @mentions and 4+ digit numbers are swapped for placeholders and restored at the end,
  // so no rule (word map, "i" -> "I", capitalisation, tone) can ever touch them.
  const { text: safeText, store } = protectCritical(rawClean);

  const detectView = normalizePhonetics(safeText, 1);
  const language = detectLanguage(detectView);
  const hasQ = safeText.includes('?');
  const isQuestion = hasQ || detectIsQuestion(detectView);
  const urgency = detectUrgency(safeText);
  const possibleScam = detectPossibleScam(rawClean);
  const looseLang = /Hinglish|Arabizi|SMS/.test(language);
  const ctx = { q: hasQ };

  const finish = (base, confidence) => {
    let out = applyTone(base, tone);
    let conf = confidence;

    // Safety net: never lose a protected token (OTP, phone, URL ...)
    const missing = [];
    store.forEach((tok, i) => {
      if (!new RegExp(`zzph${i}zz`, 'i').test(out)) missing.push(tok);
    });
    if (missing.length) {
      out = `${out} ${missing.join(' ')}`.trim();
      conf = Math.min(conf, 0.4);
    }
    if (/\(or (?:yesterday|the day before yesterday|tomorrow)\)/.test(out)) conf = Math.min(conf, 0.5);

    out = restoreCritical(out, store);
    return {
      language,
      normalized: out,
      tone,
      confidence: round2(conf),
      is_question: isQuestion || /\?\s*$/.test(out),
      urgency,
      possible_scam: possibleScam,
    };
  };

  const untouched = (confidence) => ({
    language, normalized: rawClean, tone, confidence, is_question: hasQ, urgency, possible_scam: possibleScam,
  });

  // Scripts the rule engine cannot translate: return as-is with very low confidence
  if (language === 'Hindi (Devanagari)' || language === 'Arabic (Arabic script)') return untouched(0.2);

  // Emoji / symbol only
  if (!/[\p{L}\p{N}]/u.test(safeText)) {
    const mapped = safeGet(EMOJI_MAPPINGS, rawClean);
    return mapped ? finish(mapped, 1.0) : untouched(0.5);
  }

  const phonetic = normalizePhonetics(safeText, looseLang ? 1 : 2);
  const workingText = applyPersonalDict(phonetic, personalDictEntries);
  const workingLower = workingText.toLowerCase().replace(/[.!?]+$/, '').replace(/\s+/g, ' ').trim();

  // 1. Exact phrase
  const phrase = safeGet(PHRASE_MAPPINGS, workingLower);
  if (phrase) return finish(phrase, 1.0);

  // 2. Prefix / suffix extraction
  let coreText = workingText.trim();
  const prefixes = [];
  for (let i = 0; i < 2; i++) {
    const p = PREFIX_PATTERNS.find((x) => x.regex.test(coreText));
    if (!p) break;
    if (!prefixes.includes(p.english)) prefixes.push(p.english);
    coreText = coreText.replace(p.regex, '').trim();
  }
  const prefixText = prefixes.join(', ');

  let suffix = null;
  for (const s of SUFFIX_PATTERNS) {
    if (s.regex.test(coreText)) {
      const rest = coreText.replace(s.regex, '').trim();
      suffix = typeof s.english === 'function' ? s.english(rest) : s.english;
      coreText = rest;
      break;
    }
  }

  const coreLower = coreText.toLowerCase().replace(/[.!?]+$/, '').trim();

  // FIX: message was only a greeting / vocative / time word ("namaste", "bhai", "abhi").
  // Old code re-added the prefix on top of the translated word ("Hello, namaste.").
  if (!coreLower && (prefixes.length || suffix)) {
    const parts = [...prefixes];
    if (suffix) parts.push(suffix.trim().replace(/^,\s*/, ''));
    const msg = parts.join(', ');
    return finish(msg.charAt(0).toUpperCase() + msg.slice(1) + (isQuestion ? '?' : '.'), 0.9);
  }

  if ((prefixes.length || suffix) && coreLower) {
    const phraseHit = safeGet(PHRASE_MAPPINGS, coreLower);
    const hit = phraseHit ? { text: phraseHit, confidence: 1.0 } : matchConversationalPatterns(coreLower, ctx);
    if (hit) {
      let combined = hit.text;
      if (suffix) combined = combineCoreAndSuffix(combined, suffix);
      if (prefixText) combined = combinePrefixAndCore(prefixText, combined);
      return finish(combined, hit.confidence);
    }
  }

  // 3. Whole-sentence pattern (only if it explains everything)
  const whole = matchConversationalPatterns(workingLower, ctx);
  if (whole) return finish(whole.text, whole.confidence);

  // 4. N-gram + word-level fallback
  const beforeNgrams = coreText || workingText;
  let processed = beforeNgrams;
  // n-gram output is already English: mark it so the word map can't re-translate it ("do not know" -> "two not know")
  const mark = (str) => str.split(' ').map((w) => `\u0001${w}`).join(' ');
  for (const ng of CONTEXTUAL_NGRAMS) processed = processed.replace(ng.regex, () => mark(ng.replace));
  const ngramHit = processed !== beforeNgrams;
  processed = resolveKalInText(processed);

  const allowAmbiguous = /Hinglish/.test(language);
  let mapped = 0;
  let alpha = 0;

  const tokens = processed.split(/(\s+|[.,!?;:])/);
  const translated = tokens.map((token) => {
    if (!token || /^\s+$/.test(token) || /^[.,!?;:]$/.test(token) || /^zzph\d+zz$/i.test(token)) return token;
    if (token.includes('\u0001')) return token.replace(/\u0001/g, '');

    const parts = token.match(/^([^\p{L}\p{N}]*)([\s\S]*?)([^\p{L}\p{N}]*)$/u);
    const pre = parts[1];
    const core = parts[2];
    const post = parts[3];
    if (!core) return token;

    if (/\p{L}/u.test(core)) alpha++;
    const lower = core.toLowerCase();
    if (!allowAmbiguous && AMBIGUOUS_WORDS.has(lower)) return token;

    const rep = safeGet(WORD_MAPPINGS, lower);
    if (rep === null) return token;
    mapped++;

    let out = rep;
    if (core.length > 1 && core === core.toUpperCase()) out = rep.toUpperCase();
    else if (core[0] !== core[0].toLowerCase()) out = rep.charAt(0).toUpperCase() + rep.slice(1);
    return pre + out + post;
  });

  let base = translated.join('').replace(/\s+/g, ' ').trim();
  base = applyGrammaticalFixes(base);

  if (suffix) {
    const suffixPlain = suffix.trim().replace(/^,\s*/, '').toLowerCase();
    if (!base.toLowerCase().includes(suffixPlain)) base = combineCoreAndSuffix(base, suffix);
  }
  if (prefixText && !base.toLowerCase().startsWith(prefixText.toLowerCase())) {
    base = combinePrefixAndCore(prefixText, base);
  }
  base = withPunctuation(base, isQuestion);

  // FIX: confidence used to be a hard-coded 1.0 even for word-by-word guesses
  let confidence;
  const covered = mapped + (ngramHit ? 2 : 0);
  if (covered === 0) confidence = /Hinglish|Arabizi/.test(language) ? 0.3 : 0.6;
  else {
    // Hindi is subject-object-verb, so a word-by-word result is never fully reliable for Hinglish
    const cap = /Hinglish|Arabizi/.test(language) ? 0.6 : 0.8;
    confidence = Math.min(cap, 0.45 + 0.35 * Math.min(1, covered / Math.max(alpha, 1)));
  }

  return finish(base, confidence);
}

module.exports = {
  detectLanguage,
  detectIsQuestion,
  detectUrgency,
  detectPossibleScam,
  applyTone,
  normalizePhonetics,
  normalizeWithRules,
};