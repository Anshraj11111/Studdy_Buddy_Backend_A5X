import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.OPENROUTER_API_KEY;
const model = 'google/gemini-2.0-flash-001';

console.log('Testing paid model:', model);

const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': 'https://studdy-buddy-a5x.vercel.app',
    'X-Title': 'Studdy Buddy AI',
  },
  body: JSON.stringify({
    model,
    messages: [
      { role: 'system', content: 'You are a helpful study assistant.' },
      { role: 'user', content: 'What is ESP32? Explain in 2 lines.' }
    ],
    max_tokens: 150
  }),
});

const data = await res.json();
if (!res.ok) {
  console.error('FAILED:', data?.error?.message);
} else {
  console.log('\n✅ Paid model working!');
  console.log('Reply:', data.choices?.[0]?.message?.content);
}
