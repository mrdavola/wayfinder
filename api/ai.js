// api/ai.js — Vercel Serverless Function
// Proxies AI calls to Anthropic or Gemini, keeping API keys server-side

import { verifyAuth } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify auth if present (guides are authenticated, students are not)
  // Students need AI access for Field Guide, feedback, etc.
  const { user } = await verifyAuth(req);
  req.user = user; // may be null for student requests

  const { provider, systemPrompt, userMessage, messages, maxTokens = 2048 } = req.body;

  try {
    let text;
    if (provider === 'anthropic') {
      text = await callAnthropic({ systemPrompt, userMessage, messages, maxTokens });
    } else {
      text = await callGemini({ systemPrompt, userMessage, messages });
    }
    res.status(200).json({ text });
  } catch (err) {
    console.error('AI proxy error:', err);
    res.status(500).json({ error: err.message || 'AI call failed' });
  }
}

async function callAnthropic({ systemPrompt, userMessage, messages, maxTokens }) {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msgs = messages || [{ role: 'user', content: userMessage }];
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: msgs,
  });
  return response.content[0].text;
}

async function callGemini({ systemPrompt, userMessage, messages }) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
  });

  if (messages && messages.length > 0) {
    const converted = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const firstUserIdx = converted.findIndex(m => m.role === 'user');
    const history = firstUserIdx > 0 ? converted.slice(firstUserIdx) : converted;
    const lastMsg = messages[messages.length - 1];
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMsg.content);
    return result.response.text();
  } else {
    const result = await model.generateContent(userMessage);
    return result.response.text();
  }
}
