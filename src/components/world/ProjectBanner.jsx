import { useEffect, useState, useRef } from 'react';
import './ProjectBanner.css';
import { generateProjectBanner } from '../../lib/artGen';

const CACHE_KEY = (questId, role) => `project-banner:v1:${questId}:${role}`;

/**
 * Project-relevant banner shown at the top of each HotspotOverlay panel.
 *
 * Behavior:
 * 1. Render the deterministic text-card fallback IMMEDIATELY (no flash of empty space).
 * 2. Try localStorage cache for this quest+role; if hit, swap in the image.
 * 3. Otherwise call generateProjectBanner() (fal.ai) in the background.
 * 4. Self-check the resulting image via the <img> onload/onerror — if load fails or
 *    the image is suspiciously small, keep the text-card fallback.
 *
 * @param {object} props
 * @param {object} props.quest                quest record (id, title, driving_question, description)
 * @param {string} props.role                 hotspot role driving the banner subject
 * @param {string} [props.subtitle]           override the subtitle line in the fallback card
 */
export default function ProjectBanner({ quest, role = 'trailheadSign', subtitle }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [imageOk, setImageOk]   = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    if (!quest?.id) return undefined;

    const key = CACHE_KEY(quest.id, role);
    let cached = null;
    try { cached = localStorage.getItem(key); } catch { /* no-op */ }
    if (cached) {
      setImageUrl(cached);
      return undefined;
    }

    (async () => {
      const url = await generateProjectBanner(quest, role);
      if (cancelledRef.current) return;
      if (!url) return;
      try { localStorage.setItem(key, url); } catch { /* no-op */ }
      setImageUrl(url);
    })();

    return () => { cancelledRef.current = true; };
  }, [quest?.id, role]);

  const showImage = imageUrl && imageOk;
  const tagline = subtitle ?? quest?.driving_question ?? quest?.description ?? null;

  return (
    <div className={`project-banner${showImage ? ' project-banner--with-image' : ''}`}>
      {/* Always render the fallback so layout never jumps */}
      <div className="project-banner__fallback" aria-hidden={showImage ? 'true' : 'false'}>
        <span className="project-banner__eyebrow">your project</span>
        <h3 className="project-banner__title">{quest?.title || 'Project'}</h3>
        {tagline && <p className="project-banner__tagline">{tagline}</p>}
      </div>
      {imageUrl && (
        <img
          className="project-banner__image"
          src={imageUrl}
          alt={`Illustration for ${quest?.title || 'this project'}`}
          loading="lazy"
          onLoad={(e) => {
            const img = e.currentTarget;
            // Self-check: if the image came back blank/black/microscopic, ignore it.
            if (img.naturalWidth < 200 || img.naturalHeight < 100) {
              setImageOk(false);
              return;
            }
            setImageOk(true);
          }}
          onError={() => setImageOk(false)}
        />
      )}
    </div>
  );
}
