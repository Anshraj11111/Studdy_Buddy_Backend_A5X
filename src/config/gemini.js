import { GoogleGenerativeAI } from "@google/generative-ai";

let _model = null;

export const getModel = () => {
  if (!_model) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set in environment');
    const genAI = new GoogleGenerativeAI(apiKey);
    _model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }
  return _model;
};

// Keep backward compat
export const model = {
  generateContent: (prompt) => getModel().generateContent(prompt),
};
