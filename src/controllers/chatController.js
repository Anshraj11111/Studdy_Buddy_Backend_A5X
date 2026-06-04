const SYSTEM_PROMPT = `You are an AI study assistant for Studdy Buddy, a peer-to-peer learning platform focused on Robotics, Programming, AI/ML, IoT, Electronics, and Embedded Systems.

Your role:
- Help students understand their doubts clearly and concisely
- Explain concepts step by step with practical examples
- Be encouraging and supportive
- Keep responses focused and educational
- Use simple language that students can understand

Always respond in a helpful, friendly, and educational manner.`;

// ── OpenRouter chat (supports 100+ models via a single API) ─────────────────
async function chatWithOpenRouter(message, history = []) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';

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

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenRouter HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── Gemini fallback ─────────────────────────────────────────────────────────
async function chatWithGemini(message, history = []) {
  const { getModel } = await import('../config/gemini.js');
  let fullPrompt = SYSTEM_PROMPT + '\n\n';
  const recentHistory = history.slice(-6);
  if (recentHistory.length > 0) {
    fullPrompt += 'Previous conversation:\n';
    recentHistory.forEach(h => {
      fullPrompt += `${h.role === 'user' ? 'Student' : 'Assistant'}: ${h.content}\n`;
    });
    fullPrompt += '\n';
  }
  fullPrompt += `Student: ${message.trim()}\nAssistant:`;
  const model = getModel();
  const result = await model.generateContent(fullPrompt);
  return result.response.text();
}

// ── Main handler ─────────────────────────────────────────────────────────────
export const chatWithAI = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    let reply = '';
    let provider = 'openrouter';

    // Try OpenRouter first, fall back to Gemini
    if (process.env.OPENROUTER_API_KEY) {
      try {
        reply = await chatWithOpenRouter(message, history);
      } catch (orErr) {
        console.warn('OpenRouter failed, falling back to Gemini:', orErr.message);
        provider = 'gemini';
        reply = await chatWithGemini(message, history);
      }
    } else {
      provider = 'gemini';
      reply = await chatWithGemini(message, history);
    }

    res.json({ success: true, reply, provider });

  } catch (error) {
    console.error('AI Error:', error.message);

    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('API key')) {
      return res.status(500).json({ success: false, message: 'AI service configuration error.' });
    }
    if (error.message?.includes('QUOTA_EXCEEDED') || error.message?.includes('quota') || error.message?.includes('429')) {
      return res.status(429).json({ success: false, message: 'AI quota exceeded. Please try again later.' });
    }
    if (error.message?.includes('not set')) {
      return res.status(500).json({ success: false, message: 'AI service not configured.' });
    }

    res.status(500).json({
      success: false,
      message: 'AI service temporarily unavailable. Please try again.',
    });
  }
};
