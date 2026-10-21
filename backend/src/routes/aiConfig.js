const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { callOpenAI } = require('../services/aiProviders');

/**
 * GET /api/ai/status
 * Get current AI engine connection status
 */
router.get('/status', (req, res) => {
  const hasKey = Boolean(config.OPENAI_API_KEY || process.env.OPENAI_API_KEY);
  res.json({
    status: 'ok',
    openaiConfigured: hasKey,
    provider: hasKey ? 'OpenAI' : 'Local Contextual AI Engine',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    maskedKey: hasKey
      ? `${(config.OPENAI_API_KEY || process.env.OPENAI_API_KEY).slice(0, 7)}...${(config.OPENAI_API_KEY || process.env.OPENAI_API_KEY).slice(-4)}`
      : null
  });
});

/**
 * POST /api/ai/key
 * Set or update OpenAI API Key at runtime and save to .env
 */
router.post('/key', async (req, res) => {
  try {
    const { apiKey, model } = req.body;
    if (!apiKey || !apiKey.trim().startsWith('sk-')) {
      return res.status(400).json({ error: 'Please enter a valid OpenAI API key starting with sk-' });
    }

    const cleanKey = apiKey.trim();
    const cleanModel = (model || 'gpt-4o-mini').trim();

    // Verify key by calling OpenAI with a sample sentence
    const OpenAI = require('openai');
    const testClient = new OpenAI({ apiKey: cleanKey });

    const completion = await testClient.chat.completions.create({
      model: cleanModel,
      messages: [
        { role: 'system', content: 'You are a test validator. Return JSON: {"status": "ok"}' },
        { role: 'user', content: 'test connection' }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 30
    });

    if (!completion || !completion.choices || completion.choices.length === 0) {
      return res.status(400).json({ error: 'OpenAI returned an empty response. Please verify key permissions.' });
    }

    // Update active memory config
    config.OPENAI_API_KEY = cleanKey;
    process.env.OPENAI_API_KEY = cleanKey;
    process.env.OPENAI_MODEL = cleanModel;

    // Persist to backend/.env safely
    const envPath = path.resolve(__dirname, '../../.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    if (/^OPENAI_API_KEY=/m.test(envContent)) {
      envContent = envContent.replace(/^OPENAI_API_KEY=.*$/m, `OPENAI_API_KEY=${cleanKey}`);
    } else {
      envContent += `\nOPENAI_API_KEY=${cleanKey}\n`;
    }

    if (/^OPENAI_MODEL=/m.test(envContent)) {
      envContent = envContent.replace(/^OPENAI_MODEL=.*$/m, `OPENAI_MODEL=${cleanModel}`);
    } else {
      envContent += `OPENAI_MODEL=${cleanModel}\n`;
    }

    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');

    return res.json({
      success: true,
      message: 'OpenAI connected successfully! All normalizations will now be handled directly by OpenAI.',
      model: cleanModel
    });
  } catch (err) {
    return res.status(400).json({
      error: `OpenAI connection failed: ${err.message || 'Invalid API key or network error'}`
    });
  }
});

/**
 * POST /api/ai/test
 * Test message normalization directly
 */
router.post('/test', async (req, res) => {
  try {
    const { text, tone = 'Natural' } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    const result = await callOpenAI(text, tone);
    if (!result) {
      return res.status(503).json({ error: 'OpenAI call failed or not configured.' });
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
