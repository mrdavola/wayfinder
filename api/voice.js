// api/voice.js — ElevenLabs TTS proxy

import { verifyAuth } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify auth if present (students use TTS but aren't authenticated)
  const { user } = await verifyAuth(req);
  req.user = user;

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(404).json({ error: 'ElevenLabs API key not configured' });
  }

  const { text, voiceId = '21m00Tcm4TlvDq8ikWAM' } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  // Sanitize voiceId to prevent SSRF via path traversal
  const safeVoiceId = voiceId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeVoiceId || safeVoiceId !== voiceId) {
    return res.status(400).json({ error: 'Invalid voiceId' });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${safeVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: text.slice(0, 5000), // Limit text length
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'ElevenLabs API request failed',
        status: response.status,
        detail: errorText.slice(0, 200),
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    return res.send(buffer);
  } catch (err) {
    console.error('Voice proxy error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
