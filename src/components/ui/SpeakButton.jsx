import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import useSpeech from '../../hooks/useSpeech';

export default function SpeakButton({ text, size = 'sm' }) {
  const { speak, stop, speaking, loading, supported } = useSpeech();
  if (!supported) return null;
  const isSmall = size === 'sm';
  return (
    <button
      onClick={() => speaking ? stop() : speak(text)}
      disabled={loading}
      title={loading ? 'Loading audio...' : speaking ? 'Stop reading' : 'Read aloud'}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: isSmall ? '4px 8px' : '6px 12px',
        borderRadius: 20,
        border: `1px solid ${speaking ? 'var(--compass-gold)' : 'var(--pencil)'}`,
        background: speaking ? 'rgba(184,134,11,0.08)' : 'transparent',
        color: speaking ? 'var(--compass-gold)' : 'var(--graphite)',
        fontSize: isSmall ? 11 : 12,
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        cursor: loading ? 'wait' : 'pointer',
        transition: 'all 150ms',
        flexShrink: 0,
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading
        ? <Loader2 size={isSmall ? 12 : 14} style={{ animation: 'spin 1s linear infinite' }} />
        : speaking
          ? <VolumeX size={isSmall ? 12 : 14} />
          : <Volume2 size={isSmall ? 12 : 14} />}
      {loading ? 'Loading...' : speaking ? 'Stop' : 'Listen'}
    </button>
  );
}
