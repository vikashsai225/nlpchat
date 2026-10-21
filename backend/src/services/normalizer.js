const db = require('../db');
const { callGemini, callOpenAI, callAnthropic } = require('./aiProviders');
const { normalizeWithRules } = require('./ruleEngine');
const { generateSmartReplies } = require('./smartReplies');

const ALLOWED_TONES = ['Natural', 'Friendly', 'Formal', 'Concise'];
const ALLOWED_URGENCY = ['low', 'normal', 'high'];
const MAX_INPUT_LENGTH = 2000;
const PROVIDER_TIMEOUT_MS = 8000;

// Providers are tried in this order. The first safe result wins.
const PROVIDERS = [
  { name: 'openai', fn: callOpenAI },
  { name: 'gemini', fn: callGemini },
  { name: 'anthropic', fn: callAnthropic },
];

const SCAM_PATTERNS = [
  /\botp\b.*\b(share|send|bata|batao|de do)\b/i,
  /\b(kyc|pan)\b.*\b(update|expire|block|suspend)/i,
  /\b(lottery|jackpot|prize|reward)\b.*\b(won|jeet|claim)/i,
  /\b(account|card)\b.*\b(blocked|suspended|band)\b/i,
  /\b(click|tap)\b.*\b(link|here)\b/i,
  /\b(send|transfer)\b.*\b(money|paise|rs\.?|₹|upi)\b.*\b(urgent|immediately|abhi)\b/i,
];

const PREAMBLE_RE =
  /^\s*(here(?:'s| is)[^:\n]{0,60}:|normalized(?: text| message)?\s*:|output\s*:)\s*/i;

function withTimeout(promise, milliseconds, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${milliseconds}ms`)),
      milliseconds
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function getSafeTone(tone) {
  if (typeof tone !== 'string') return 'Natural';
  const match = ALLOWED_TONES.find((t) => t.toLowerCase() === tone.trim().toLowerCase());
  return match || 'Natural';
}

function cleanModelOutput(text) {
  if (typeof text !== 'string') return '';
  let out = text.trim();
  out = out.replace(/^```[a-z]*\n?|```$/gi, '').trim(); // markdown fences
  out = out.replace(PREAMBLE_RE, '');
  // Remove quotes added by a model around the complete response.
  if (/^["“'].*["”']$/s.test(out)) out = out.slice(1, -1).trim();
  return out;
}

function extractCriticalTokens(text) {
  const tokens = new Set();
  (text.match(/https?:\/\/\S+|www\.\S+/gi) || []).forEach((t) => tokens.add(t.replace(/[.,!?]+$/, '').toLowerCase()));
  (text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || []).forEach((t) => tokens.add(t.toLowerCase()));
  (text.match(/@\w+/g) || []).forEach((t) => tokens.add(t.toLowerCase()));
  // Keep long numbers such as OTPs, phone numbers, and account numbers safe.
  (text.match(/\d[\d,\s-]{2,}\d/g) || []).forEach((t) => {
    const digits = t.replace(/\D/g, '');
    if (digits.length >= 4) tokens.add(digits);
  });
  return [...tokens];
}

function preservesCriticalTokens(raw, normalized) {
  const normLower = normalized.toLowerCase();
  const normDigits = normalized.replace(/\D/g, '');
  return extractCriticalTokens(raw).every((tok) =>
    /^\d+$/.test(tok) ? normDigits.includes(tok) : normLower.includes(tok)
  );
}

function isValidResult(result, rawText) {
  if (!result || typeof result.normalized !== 'string') return false;
  const out = result.normalized.trim();
  if (!out) return false;

  // length sanity (skip very short messages like "ok", "hmm")
  if (rawText.length >= 15) {
    const ratio = out.length / rawText.length;
    if (ratio < 0.2 || ratio > 4) return false;
  }

  // model refusal / meta-talk instead of a translation
  if (/^(i('m| am) sorry|i can('|no)t|as an ai)/i.test(out)) return false;

  // URLs, emails, mentions, OTP/phone/amount must survive
  if (!preservesCriticalTokens(rawText, out)) return false;

  return true;
}

function localScamCheck(text) {
  return SCAM_PATTERNS.some((re) => re.test(text));
}

function clamp01(n, fallback) {
  return typeof n === 'number' && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback;
}

function emptyNormalization(tone) {
  return {
    language: 'English',
    normalized: '',
    tone,
    confidence: 1,
    is_question: false,
    urgency: 'normal',
    possible_scam: false,
    smart_replies: [],
  };
}

function cleanInput(rawText) {
  return rawText.replace(/\s+/g, ' ').trim().slice(0, MAX_INPUT_LENGTH);
}

async function getPersonalDictionary(userId) {
  if (!userId) return [];

  try {
    const rows = await db.query(
      'SELECT slang_term, normalized_meaning FROM personal_dictionary WHERE user_id = ?',
      [userId]
    );
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.warn('[normalize] personal dictionary fetch failed:', error.message);
    return [];
  }
}

async function findProviderResult(text, tone, personalDict) {
  for (const provider of PROVIDERS) {
    try {
      const candidate = await withTimeout(
        provider.fn(text, tone, personalDict),
        PROVIDER_TIMEOUT_MS,
        provider.name
      );

      if (candidate && typeof candidate.normalized === 'string') {
        candidate.normalized = cleanModelOutput(candidate.normalized);
      }

      if (isValidResult(candidate, text)) {
        return { result: candidate, source: provider.name };
      }

      console.warn(`[normalize] ${provider.name} returned an invalid result`);
    } catch (error) {
      console.warn(`[normalize] ${provider.name} failed:`, error.message);
    }
  }

  return { result: null, source: 'none' };
}

function getRuleResult(text, tone, personalDict) {
  try {
    const result = normalizeWithRules(text, tone, personalDict);
    if (result && typeof result.normalized === 'string' && result.normalized.trim()) {
      return result;
    }
  } catch (error) {
    console.error('[normalize] rule engine failed:', error.message);
  }
  return null;
}

async function normalizeMessage({ rawText, targetTone = 'Natural', userId = null }) {
  const tone = getSafeTone(targetTone);

  if (typeof rawText !== 'string' || !rawText.trim()) {
    return emptyNormalization(tone);
  }

  const text = cleanInput(rawText);
  const personalDict = await getPersonalDictionary(userId);
  let { result, source } = await findProviderResult(text, tone, personalDict);

  if (!result) {
    result = getRuleResult(text, tone, personalDict);
    if (result) {
      source = 'rules';
    }
  }

  if (!result) {
    result = { normalized: text, language: 'Unknown', confidence: 0.1 };
    source = 'passthrough';
  }

  const normalized = result.normalized.trim() || text;
  const isQuestion = Boolean(result.is_question) || /\?\s*$/.test(normalized);

  let smartReplies = [];
  try {
    smartReplies = generateSmartReplies(normalized, isQuestion) || [];
  } catch (err) {
    console.warn('[normalize] smart replies failed:', err.message);
  }

  const urgency = ALLOWED_URGENCY.includes(result.urgency) ? result.urgency : 'normal';

  return {
    language: result.language || 'Unknown',
    normalized,
    tone,
    confidence: source === 'passthrough' ? 0.1 : clamp01(result.confidence, 0.8),
    is_question: isQuestion,
    urgency,
    // Warn when either the AI or the local safety check detects a scam.
    possible_scam: Boolean(result.possible_scam) || localScamCheck(text) || localScamCheck(normalized),
    smart_replies: smartReplies,
    source,
  };
}

module.exports = { normalizeMessage };
