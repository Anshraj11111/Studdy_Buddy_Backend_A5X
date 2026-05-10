import { model } from "../config/gemini.js";

const SYSTEM_PROMPT = `You are an AI study assistant for Studdy Buddy, a peer-to-peer learning platform focused on Robotics, Programming, AI/ML, IoT, Electronics, and Embedded Systems.

Your role:
- Help students understand their doubts clearly and concisely
- Explain concepts step by step
- Provide practical examples related to robotics, electronics, programming
- Be encouraging and supportive
- Keep responses focused and educational
- Use simple language that students can understand

Always respond in a helpful, friendly, and educational manner.`;

export const chatWithAI = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    // Build conversation with system context
    const fullPrompt = history.length > 0
      ? `${SYSTEM_PROMPT}\n\nConversation history:\n${history.map(h => `${h.role === 'user' ? 'Student' : 'Assistant'}: ${h.content}`).join('\n')}\n\nStudent: ${message}\nAssistant:`
      : `${SYSTEM_PROMPT}\n\nStudent: ${message}\nAssistant:`;

    const result = await model.generateContent(fullPrompt);
    const response = result.response.text();

    res.json({
      success: true,
      reply: response,
    });

  } catch (error) {
    console.error('Gemini AI Error:', error.message);

    // Handle specific Gemini errors
    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('API key')) {
      return res.status(500).json({ success: false, message: "AI service configuration error" });
    }
    if (error.message?.includes('QUOTA_EXCEEDED') || error.message?.includes('quota')) {
      return res.status(429).json({ success: false, message: "AI service quota exceeded. Please try again later." });
    }

    res.status(500).json({
      success: false,
      message: "AI service temporarily unavailable. Please try again.",
    });
  }
};
