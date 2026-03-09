// api/perplexity.js — Perplexity search proxy

import { requireAuth } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Require authenticated Supabase session
  if (await requireAuth(req, res)) return;

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ text: null });
  }

  try {
    const { prompt, systemPrompt } = req.body;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        temperature: 0.2,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      return res.status(200).json({ text: null });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? null;

    return res.status(200).json({ text });
  } catch {
    return res.status(200).json({ text: null });
  }
}
