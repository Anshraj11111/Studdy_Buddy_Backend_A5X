import { getModel } from "../config/gemini.js";

const SYSTEM_PROMPT = `You are an AI study assistant for Studdy Buddy, a peer-to-peer learning platform focused on Robotics, Programming, AI/ML, IoT, Electronics, and Embedded Systems.

Your role:
- Help students understand their doubts clearly and concisely
- Explain concepts step by step with practical examples
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

    // Build full prompt with context
    let fullPrompt = SYSTEM_PROMPT + "\n\n";
    
    // Add conversation history (last 6 messages for context)
    const recentHistory = history.slice(-6);
    if (recentHistory.length > 0) {
      fullPrompt += "Previous conversation:\n";
      recentHistory.forEach(h => {
        fullPrompt += `${h.role === 'user' ? 'Student' : 'Assistant'}: ${h.content}\n`;
      });
      fullPrompt += "\n";
    }
    
    fullPrompt += `Student: ${message.trim()}\nAssistant:`;

    const model = getModel();
    const result = await model.generateContent(fullPrompt);
    const response = result.response.text();

    res.json({ success: true, reply: response });

  } catch (error) {
    console.error('Gemini AI Error:', error.message);

    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('API key')) {
      return res.status(500).json({ success: false, message: "AI service configuration error. Please contact support." });
    }
    if (error.message?.includes('QUOTA_EXCEEDED') || error.message?.includes('quota')) {
      return res.status(429).json({ success: false, message: "AI quota exceeded. Please try again later." });
    }
    if (error.message?.includes('not set')) {
      return res.status(500).json({ success: false, message: "AI service not configured." });
    }

    res.status(500).json({
      success: false,
      message: "AI service temporarily unavailable. Please try again.",
    });
  }
};
