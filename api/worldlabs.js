const BASE_URL = 'https://api.worldlabs.ai/marble/v1';

export default async function handler(req, res) {
  const apiKey = process.env.WORLDLABS_API_KEY;
  if (!apiKey) {
    return res.status(404).json({ error: 'WORLDLABS_API_KEY not configured' });
  }

  const headers = {
    'WLT-Api-Key': apiKey,
    'Content-Type': 'application/json',
  };

  // POST — Generate a new world
  if (req.method === 'POST') {
    const { displayName, textPrompt, imageUrl, model } = req.body || {};

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
      try {
        const response = await fetch(`${BASE_URL}/operations/${operationId}`, { headers });
        const data = await response.json();
        return res.status(response.status).json(data);
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }

    if (worldId) {
      try {
        const response = await fetch(`${BASE_URL}/worlds/${worldId}`, { headers });
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
