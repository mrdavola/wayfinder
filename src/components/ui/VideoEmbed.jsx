import { useState } from 'react';
import { Play, ExternalLink } from 'lucide-react';

/**
 * Extracts embed URL from a video link.
 * Supports YouTube, Vimeo, Loom.
 */
function getEmbedUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);

    // YouTube
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      let videoId = null;
      if (u.hostname.includes('youtu.be')) {
        videoId = u.pathname.slice(1);
      } else {
        videoId = u.searchParams.get('v');
      }
      if (videoId) {
        // Strip any extra path segments
        videoId = videoId.split('/')[0].split('&')[0];
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    // Vimeo
    if (u.hostname.includes('vimeo.com')) {
      const match = u.pathname.match(/\/(\d+)/);
      if (match) return `https://player.vimeo.com/video/${match[1]}`;
    }

    // Loom
    if (u.hostname.includes('loom.com')) {
      const match = u.pathname.match(/\/share\/([a-f0-9]+)/);
      if (match) return `https://www.loom.com/embed/${match[1]}`;
    }

    return null;
  } catch {
    return null;
  }
}

function getVideoSource(url) {
  if (!url) return 'other';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  if (url.includes('loom.com')) return 'loom';
  return 'other';
}

/**
 * Renders an embedded video player with click-to-load for performance.
 * Supports YouTube, Vimeo, Loom — falls back to external link for others.
 */
export default function VideoEmbed({ url, title, compact = false }) {
  const [loaded, setLoaded] = useState(false);
  const embedUrl = getEmbedUrl(url);
  const source = getVideoSource(url);

  const sourceLabel = {
    youtube: 'YouTube',
    vimeo: 'Vimeo',
    loom: 'Loom',
    other: 'Video',
  }[source];

  const sourceColor = {
    youtube: '#FF0000',
    vimeo: '#1AB7EA',
    loom: '#625DF5',
    other: 'var(--graphite)',
  }[source];

  if (!embedUrl) {
    // Fallback: external link
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: compact ? '6px 10px' : '8px 12px',
          borderRadius: 8,
          background: 'var(--parchment)', border: '1px solid var(--pencil)',
          fontSize: 12, color: 'var(--lab-blue)', textDecoration: 'none',
          fontFamily: 'var(--font-body)',
        }}
      >
        <ExternalLink size={12} />
        <span style={{ flex: 1 }}>{title || 'Watch video'}</span>
        <span style={{ fontSize: 10, color: 'var(--graphite)' }}>{sourceLabel}</span>
      </a>
    );
  }

  if (!loaded) {
    // Click-to-load thumbnail
    return (
      <button
        onClick={() => setLoaded(true)}
        style={{
          width: '100%', position: 'relative',
          height: compact ? 120 : 180,
          borderRadius: compact ? 6 : 10,
          overflow: 'hidden', border: '1px solid var(--pencil)',
          cursor: 'pointer', background: '#000',
          padding: 0,
        }}
      >
        {/* YouTube thumbnail */}
        {source === 'youtube' && (
          <img
            src={`https://img.youtube.com/vi/${embedUrl.split('/embed/')[1]}/mqdefault.jpg`}
            alt={title || 'Video thumbnail'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
          />
        )}
        {/* Play button overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <div style={{
            width: compact ? 36 : 48, height: compact ? 36 : 48, borderRadius: '50%',
            background: sourceColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
          }}>
            <Play size={compact ? 16 : 20} color="white" fill="white" />
          </div>
          {title && (
            <span style={{
              fontSize: compact ? 10 : 12, color: 'white', fontFamily: 'var(--font-body)',
              fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              maxWidth: '80%', textAlign: 'center',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {title}
            </span>
          )}
          <span style={{
            fontSize: 9, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {sourceLabel} — tap to play
          </span>
        </div>
      </button>
    );
  }

  // Loaded: actual iframe
  return (
    <div style={{
      width: '100%', position: 'relative',
      paddingBottom: compact ? '56.25%' : '56.25%',
      height: 0, borderRadius: compact ? 6 : 10,
      overflow: 'hidden', border: '1px solid var(--pencil)',
    }}>
      <iframe
        src={embedUrl}
        title={title || 'Video'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%', border: 'none',
        }}
      />
    </div>
  );
}

export { getEmbedUrl, getVideoSource };
