// src/lib/perplexity.js
// Perplexity API integration for finding YouTube videos and trusted educational sources

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

async function callPerplexity(prompt, systemPrompt) {
  const apiKey = import.meta.env.VITE_PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.warn('No Perplexity API key — falling back to AI-generated links');
    return null;
  }

  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    console.error('Perplexity API error:', response.status);
    return null;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || null;
}

export async function findYouTubeVideos(topic, level, count = 1) {
  const text = await callPerplexity(
    `Find ${count} YouTube video(s) that teach "${topic}" at a ${level || 'beginner'} level. For each video, provide the exact YouTube URL, the video title, and the channel name. Prefer educational channels (Khan Academy, CrashCourse, 3Blue1Brown, Veritasium, TED-Ed, SciShow, etc.) and videos under 15 minutes. Return ONLY valid JSON array: [{"url": "https://www.youtube.com/watch?v=...", "title": "...", "channel": "..."}]`,
    'You are a YouTube educational video curator for K-12 students. Return only valid JSON arrays. Always use full youtube.com/watch?v= URLs. Only suggest real, existing videos you are confident exist. If unsure, return an empty array [].'
  );

  if (!text) return [];
  try {
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export async function findTrustedSources(topic, level, count = 3) {
  const text = await callPerplexity(
    `Find ${count} trusted educational resources for learning "${topic}" at a ${level || 'beginner'} level for K-12 students. Include a mix of articles, interactive tools, and reference sites. Prefer .edu, .org, and well-known educational platforms (Khan Academy, BBC Bitesize, National Geographic Education, Smithsonian, PBS LearningMedia, CK-12, etc.). Return ONLY valid JSON array: [{"title": "...", "url": "https://...", "type": "article|interactive|reference", "trust_level": "trusted|review"}]`,
    'You are an educational resource curator focused on K-12 content. Return only valid JSON arrays. Only suggest real, existing URLs from reputable educational sources. If unsure about a URL, do not include it.'
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
    // Use a CORS proxy approach — HEAD requests to external sites may fail due to CORS
    // For YouTube URLs, validate format instead
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
      const videoId = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (!videoId) return false;
      // Use YouTube oEmbed endpoint (CORS-friendly)
      const resp = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      return resp.ok;
    }
    // For other URLs, try fetch with no-cors (opaque but confirms server responds)
    const response = await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: AbortSignal.timeout(5000) });
    return true; // no-cors returns opaque response but means server responded
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
