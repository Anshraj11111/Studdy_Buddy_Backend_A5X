const SYSTEM_PROMPT = `You are an AI study assistant for Studdy Buddy, a peer-to-peer learning platform focused on Robotics, Programming, AI/ML, IoT, Electronics, and Embedded Systems.

Your role:
- Help students understand their doubts clearly and concisely
- Explain concepts step by step with practical examples
- Be encouraging and supportive
- Keep responses focused and educational
- Use simple language that students can understand

Always respond in a helpful, friendly, and educational manner.`;

// Priority-ordered list — tested live, fastest & most reliable first.
// If one fails/rate-limits, automatically tries next.
const MODEL_CHAIN = [
  // Tier 1 — fastest responders (< 2s)
  'liquid/lfm-2.5-1.2b-instruct:free',
  'liquid/lfm-2.5-1.2b-thinking:free',

  // Tier 2 — reliable mid-speed (2–3s)
  'google/gemma-4-26b-a4b-it:free',
  'openai/gpt-oss-120b:free',

  // Tier 3 — slower but solid fallbacks (3–6s)
  'openai/gpt-oss-20b:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'moonshotai/kimi-k2.6:free',
  'nvidia/nemotron-3-super-120b-a12b:free',

  // Tier 4 — extras that sometimes work
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'nvidia/nemotron-nano-9b-v2:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'z-ai/glm-4.5-air:free',
  'qwen/qwen3-coder:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
  'poolside/laguna-xs.2:free',
  'poolside/laguna-m.1:free',
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
    signal: AbortSignal.timeout(20000), // 20s per model max
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg = data?.error?.message || `HTTP ${res.status}`;
    const err = new Error(errMsg);
    err.status = res.status;
    // Skip to next model on rate-limit, not-found, or upstream errors
    err.skip = res.status === 429 || res.status === 404 ||
      errMsg.toLowerCase().includes('rate') ||
      errMsg.toLowerCase().includes('upstream') ||
      errMsg.toLowerCase().includes('no endpoints') ||
      errMsg.toLowerCase().includes('provider');
    throw err;
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content || !content.trim()) {
    const err = new Error('Empty response');
    err.skip = true;
    throw err;
  }

  return content.trim();
}

// ── Fallback chain ───────────────────────────────────────────────────────────
async function chatWithAI_internal(message, history = []) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || !apiKey.trim()) throw new Error('OPENROUTER_API_KEY not configured');

  // If env overrides primary model, put it first
  const primaryModel = process.env.OPENROUTER_MODEL;
  const chain = primaryModel && !MODEL_CHAIN.includes(primaryModel)
    ? [primaryModel, ...MODEL_CHAIN]
    : primaryModel
      ? [primaryModel, ...MODEL_CHAIN.filter(m => m !== primaryModel)]
      : MODEL_CHAIN;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-6).map(h => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content,
    })),
    { role: 'user', content: message.trim() },
  ];

  let lastError = null;

  for (const model of chain) {
    try {
      console.log(`[AI] Trying: ${model}`);
      const reply = await callModel(apiKey, model, messages);
      console.log(`[AI] ✅ Success: ${model}`);
      return { reply, model };
    } catch (err) {
      console.warn(`[AI] ❌ ${model}: ${err.message.substring(0, 80)}`);
      lastError = err;
      if (err.skip) continue;   // rate-limit / not-found → try next
      throw err;                 // auth error or unexpected → stop
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

    const { reply, model } = await chatWithAI_internal(message, history);
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
