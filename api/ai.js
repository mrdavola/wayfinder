// api/ai.js — Vercel Serverless Function
// Proxies AI calls to Anthropic or Gemini, keeping API keys server-side

export const config = {
  maxDuration: 60, // Allow up to 60s for AI generation
};

import { requireAnyCaller, SAFETY_PREAMBLE } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Require either a guide JWT or a PIN-verified student session.
  if (await requireAnyCaller(req, res)) return;

  const { provider, systemPrompt, userMessage, messages, maxTokens = 2048 } = req.body;

  // Server-side safety preamble cannot be bypassed by caller-supplied prompts.
  const finalSystemPrompt = systemPrompt
    ? `${SAFETY_PREAMBLE}\n${systemPrompt}`
    : SAFETY_PREAMBLE;

  try {
    let text;
    if (provider === 'anthropic') {
      text = await callAnthropic({ systemPrompt: finalSystemPrompt, userMessage, messages, maxTokens });
    } else {
      text = await callGemini({ systemPrompt: finalSystemPrompt, userMessage, messages });
    }
    res.status(200).json({ text });
  } catch (err) {
    console.error('AI proxy error:', err?.message, err?.status, err?.statusText);
    res.status(500).json({ error: err.message || 'AI call failed', details: err?.status || '' });
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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    systemInstruction: systemPrompt,
  });

  if (messages && messages.length > 0) {
    const converted = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    // Gemini requires history to start with 'user' — drop leading 'model' messages
    const firstUserIdx = converted.findIndex(m => m.role === 'user');
    const history = firstUserIdx >= 0 ? converted.slice(firstUserIdx) : [];
    // Gemini requires alternating user/model roles — deduplicate consecutive same-role messages
    const cleanHistory = [];
    for (const msg of history) {
      if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === msg.role) {
        // Merge consecutive same-role messages
        cleanHistory[cleanHistory.length - 1].parts[0].text += '\n' + msg.parts[0].text;
      } else {
        cleanHistory.push(msg);
      }
    }
    const lastMsg = messages[messages.length - 1];
    const chat = model.startChat({ history: cleanHistory.length > 0 ? cleanHistory : undefined });
    const result = await chat.sendMessage(lastMsg.content);
    return result.response.text();
  } else {
    const result = await model.generateContent(userMessage);
    return result.response.text();
  }
}
