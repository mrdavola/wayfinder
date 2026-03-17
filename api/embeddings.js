// api/embeddings.js — Vercel Serverless Function
// Proxies embedding calls to Gemini, keeping API keys server-side

export const config = { maxDuration: 60 };

import { verifyAuth } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user } = await verifyAuth(req);
  req.user = user;

  const { action, content, contentType, taskType, dimensions } = req.body;

  try {
    if (action === 'embed') {
      const embedding = await generateEmbedding({ content, contentType, taskType, dimensions });
      return res.status(200).json({ embedding });
    }

    if (action === 'similarity') {
      const { vectorA, vectorB } = req.body;
      const score = cosineSimilarity(vectorA, vectorB);
      return res.status(200).json({ score });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('Embedding error:', err);
    res.status(500).json({ error: err.message || 'Embedding failed' });
  }
}

/**
 * Generate an embedding via Gemini REST API.
 * Uses the REST endpoint directly because the @google/generative-ai v0.24.1 SDK
 * does not support outputDimensionality in EmbedContentRequest.
 */
async function generateEmbedding({
  content,
  contentType = 'text',
  taskType = 'SEMANTIC_SIMILARITY',
  dimensions = 768,
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const modelId = 'gemini-embedding-exp-03-07';

  // Build content parts based on type
  let parts;
  if (contentType === 'text') {
    parts = [{ text: typeof content === 'string' ? content : JSON.stringify(content) }];
  } else if (contentType === 'image') {
    // content should be { data: base64string, mimeType: 'image/png' }
    parts = [{ inline_data: { data: content.data, mime_type: content.mimeType } }];
  } else if (contentType === 'multimodal') {
    // content is an array of parts (text + images mixed)
    // Normalize part keys for the REST API (camelCase → snake_case)
    parts = content.map((p) => {
      if (p.text) return { text: p.text };
      if (p.inlineData || p.inline_data) {
        const d = p.inlineData || p.inline_data;
        return { inline_data: { data: d.data, mime_type: d.mimeType || d.mime_type } };
      }
      return p;
    });
  } else {
    parts = [{ text: typeof content === 'string' ? content : JSON.stringify(content) }];
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:embedContent?key=${apiKey}`;

  const body = {
    model: `models/${modelId}`,
    content: { parts },
    taskType,
    outputDimensionality: dimensions,
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    throw new Error(`Gemini embedding API error (${resp.status}): ${errBody}`);
  }

  const data = await resp.json();
  return data.embedding.values;
}

/**
 * Cosine similarity between two float arrays.
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0,
    magA = 0,
    magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
