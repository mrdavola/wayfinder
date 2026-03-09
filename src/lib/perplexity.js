// src/lib/perplexity.js
// Perplexity API integration for finding YouTube videos and trusted educational sources

import { authedFetch } from './api';

async function callPerplexity(prompt, systemPrompt) {
  // Try server-side proxy first (works on Vercel)
  try {
    const resp = await authedFetch('/api/perplexity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemPrompt }),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.text) return data.text;
    }
  } catch {
    // Server route not available (local dev with Vite)
  }

  // Fallback: direct client-side call using VITE_ key
  const apiKey = import.meta.env.VITE_PERPLEXITY_API_KEY;
  if (!apiKey) return null;

  try {
    const resp = await fetch('https://api.perplexity.ai/chat/completions', {
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
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export async function findYouTubeVideos(topic, level, count = 2) {
  const text = await callPerplexity(
    `Find ${count} real YouTube video(s) that teach "${topic}" at a ${level || 'beginner'} level. For each video, provide the exact YouTube URL, the video title, and the channel name. Prefer educational channels (Khan Academy, CrashCourse, 3Blue1Brown, Veritasium, TED-Ed, SciShow, etc.) and videos under 15 minutes. CRITICAL: Only return videos you found in real search results. Return ONLY valid JSON array: [{"url": "https://www.youtube.com/watch?v=...", "title": "...", "channel": "..."}]`,
    'You are a YouTube educational video curator for K-12 students. You have access to real web search results. Return only valid JSON arrays with REAL video URLs from your search results. Always use full youtube.com/watch?v= URLs. NEVER fabricate or guess video IDs — only return URLs you found in actual search results. If you cannot find a real video, return an empty array [].'
  );

  if (!text) return [];
  try {
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    // Validate each video via YouTube oEmbed before returning
    const validated = await Promise.all(
      parsed.map(async (v) => {
        try {
          const resp = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(v.url)}&format=json`);
          if (resp.ok) {
            const meta = await resp.json();
            return { ...v, title: v.title || meta.title, verified: true };
          }
          return null; // Video doesn't exist
        } catch { return null; }
      })
    );
    return validated.filter(Boolean);
  } catch { return []; }
}

export async function findTrustedSources(topic, level, count = 3) {
  const text = await callPerplexity(
    `Find ${count} trusted educational resources for learning "${topic}" at a ${level || 'beginner'} level for K-12 students. Include a mix of articles, interactive tools, and reference sites. Prefer .edu, .org, and well-known educational platforms (Khan Academy, BBC Bitesize, National Geographic Education, Smithsonian, PBS LearningMedia, CK-12, etc.). CRITICAL: Only return URLs you found in real search results. Return ONLY valid JSON array: [{"title": "...", "url": "https://...", "type": "article|interactive|reference", "trust_level": "trusted|review"}]`,
    'You are an educational resource curator focused on K-12 content. You have access to real web search results. Return only valid JSON arrays with REAL URLs from your search results. NEVER fabricate URLs. If you cannot find real resources, return an empty array [].'
  );

  if (!text) return [];
  try {
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export async function checkLink(url) {
  try {
    // YouTube: use oEmbed (CORS-friendly, reliable)
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
      const videoId = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (!videoId) return false;
      const resp = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      return resp.ok;
    }
    // Non-YouTube: can't reliably verify from browser due to CORS
    // Return null (unknown) instead of fake true
    return null;
  } catch {
    return false;
  }
}

export async function validateResources(resources) {
  const results = await Promise.allSettled(
    resources.map(async (r) => {
      const alive = await checkLink(r.url);
      return { ...r, verified: alive };
    })
  );
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}
