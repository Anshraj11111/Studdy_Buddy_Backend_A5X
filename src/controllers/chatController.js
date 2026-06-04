const SYSTEM_PROMPT = `You are an AI study assistant for Studdy Buddy, a peer-to-peer learning platform focused on Robotics, Programming, AI/ML, IoT, Electronics, and Embedded Systems.

Your role:
- Help students understand their doubts clearly and concisely
- Explain concepts step by step with practical examples
- Be encouraging and supportive
- Keep responses focused and educational
- Use simple language that students can understand

Always respond in a helpful, friendly, and educational manner.`;

// Free models tried in order — if one is rate-limited, next one is tried
const FREE_MODELS = [
  'z-ai/glm-4.5-air:free',
  'google/gemma-4-31b-it:free',
  'moonshotai/kimi-k2.6:free',
  'openai/gpt-oss-20b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-coder:free',
  'openrouter/free',
];

// ── Single model call ────────────────────────────────────────────────────────
async function callModel(apiKey, model, messages) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.APP_URL || 'https://studdy-buddy-a5x.vercel.app',
      'X-Title': 'Studdy Buddy AI',
    },
    body: JSON.stringify({ model, messages, max_tokens: 1024 }),
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg = data?.error?.message || `HTTP ${res.status}`;
    const err = new Error(errMsg);
    err.status = res.status;
    err.isRateLimit = res.status === 429 || errMsg.toLowerCase().includes('rate') || errMsg.toLowerCase().includes('upstream');
    err.isNotFound = res.status === 404 || errMsg.toLowerCase().includes('no endpoints');
    throw err;
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content || !content.trim()) {
    const err = new Error('Empty response');
    err.isRateLimit = true; // treat empty as skip
    throw err;
  }

  return content;
}

// ── Fallback chain across all free models ───────────────────────────────────
async function chatWithOpenRouter(message, history = []) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  // Primary model from env, then fallback list
  const primaryModel = process.env.OPENROUTER_MODEL;
  const modelQueue = primaryModel
    ? [primaryModel, ...FREE_MODELS.filter(m => m !== primaryModel)]
    : FREE_MODELS;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-6).map(h => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content,
    })),
    { role: 'user', content: message.trim() },
  ];

  let lastError = null;

  for (const model of modelQueue) {
    try {
      console.log(`[AI] Trying model: ${model}`);
      const reply = await callModel(apiKey, model, messages);
      console.log(`[AI] Success with: ${model}`);
      return { reply, model };
    } catch (err) {
      console.warn(`[AI] Model ${model} failed: ${err.message}`);
      lastError = err;
      // Only skip to next if rate-limited or not found — hard errors stop the chain
      if (err.isRateLimit || err.isNotFound) {
        continue;
      }
      // Auth error or other hard failure — no point trying more models
      throw err;
    }
  }

  throw lastError || new Error('All models exhausted');
}

// ── Main handler ─────────────────────────────────────────────────────────────
export const chatWithAI = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({ success: false, message: 'AI service not configured.' });
    }

    const { reply, model } = await chatWithOpenRouter(message, history);

    return res.json({ success: true, reply, provider: 'openrouter', model });

  } catch (error) {
    console.error('[AI Chat] All models failed:', error.message);

    if (error.status === 429 || error.message?.includes('rate') || error.message?.includes('exhausted')) {
      return res.status(429).json({
        success: false,
        message: 'AI is temporarily busy. Please try again in a moment.',
      });
    }

    if (error.message?.includes('not configured')) {
      return res.status(500).json({ success: false, message: 'AI service not configured.' });
    }

    return res.status(500).json({
      success: false,
      message: 'AI service temporarily unavailable. Please try again.',
    });
  }
};
