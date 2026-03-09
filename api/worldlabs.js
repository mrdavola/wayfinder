// api/worldlabs.js — WorldLabs 3D world generation proxy

import { requireAuth } from './_auth.js';

const BASE_URL = 'https://api.worldlabs.ai/marble/v1';

// Sanitize IDs to prevent SSRF via path traversal
function sanitizeId(id) {
  if (!id || typeof id !== 'string') return null;
  const clean = id.replace(/[^a-zA-Z0-9_-]/g, '');
  return clean === id ? clean : null;
}

export default async function handler(req, res) {
  const apiKey = process.env.WORLDLABS_API_KEY;
  if (!apiKey) {
    return res.status(404).json({ error: 'WORLDLABS_API_KEY not configured' });
  }

  // Require authenticated Supabase session
  if (await requireAuth(req, res)) return;

  const headers = {
    'WLT-Api-Key': apiKey,
    'Content-Type': 'application/json',
  };

  // POST — Generate a new world
  if (req.method === 'POST') {
    const { displayName, textPrompt, imageUrl, model } = req.body || {};

    // Validate imageUrl to prevent SSRF
    if (imageUrl) {
      try {
        const u = new URL(imageUrl);
        if (u.protocol !== 'https:') {
          return res.status(400).json({ error: 'imageUrl must use HTTPS' });
        }
      } catch {
        return res.status(400).json({ error: 'Invalid imageUrl' });
      }
    }

    const worldPrompt = imageUrl
      ? { type: 'image', image_prompt: { url: imageUrl } }
      : { type: 'text', text_prompt: textPrompt };

    const body = {
      display_name: displayName,
      world_prompt: worldPrompt,
      model: model || 'Marble 0.1-mini',
    };

    try {
      const response = await fetch(`${BASE_URL}/worlds:generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET — Poll operation or get world details
  if (req.method === 'GET') {
    const { operationId, worldId } = req.query;

    if (operationId) {
      const safeId = sanitizeId(operationId);
      if (!safeId) return res.status(400).json({ error: 'Invalid operationId' });
      try {
        const response = await fetch(`${BASE_URL}/operations/${safeId}`, { headers });
        const data = await response.json();
        return res.status(response.status).json(data);
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    if (worldId) {
      const safeId = sanitizeId(worldId);
      if (!safeId) return res.status(400).json({ error: 'Invalid worldId' });
      try {
        const response = await fetch(`${BASE_URL}/worlds/${safeId}`, { headers });
        const data = await response.json();
        return res.status(response.status).json(data);
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    return res.status(400).json({ error: 'Missing operationId or worldId query parameter' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
