const SYSTEM_PROMPT = `You are an AI study assistant for Studdy Buddy, a peer-to-peer learning platform focused on Robotics, Programming, AI/ML, IoT, Electronics, and Embedded Systems.

Your role:
- Help students understand their doubts clearly and concisely
- Explain concepts step by step with practical examples
- Be encouraging and supportive
- Keep responses focused and educational
- Use simple language that students can understand

Always respond in a helpful, friendly, and educational manner.`;

// ── OpenRouter chat ──────────────────────────────────────────────────────────
async function chatWithOpenRouter(message, history = []) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const model = process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free';

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-6).map(h => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content,
    })),
    { role: 'user', content: message.trim() },
  ];

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
    const errMsg = data?.error?.message || `OpenRouter HTTP ${res.status}`;
    console.error('[OpenRouter] Error response:', JSON.stringify(data));
    const err = new Error(errMsg);
    err.status = res.status;
    throw err;
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from OpenRouter');
  }

  return content;
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

    console.log('[AI Chat] Request:', message.substring(0, 60), '| model:', process.env.OPENROUTER_MODEL || 'openrouter/free');

    const reply = await chatWithOpenRouter(message, history);

    return res.json({ success: true, reply, provider: 'openrouter' });

  } catch (error) {
    console.error('[AI Chat] Error:', error.message);

    if (error.status === 429 || error.message?.includes('rate') || error.message?.includes('429')) {
      return res.status(429).json({
        success: false,
        message: 'AI is temporarily busy. Please try again in a moment.',
      });
    }

    if (error.message?.includes('not configured') || error.message?.includes('not set')) {
      return res.status(500).json({ success: false, message: 'AI service not configured.' });
    }

    return res.status(500).json({
      success: false,
      message: 'AI service temporarily unavailable. Please try again.',
    });
  }
};
