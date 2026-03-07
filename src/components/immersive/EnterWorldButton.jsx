import { Sparkles } from 'lucide-react';

export default function EnterWorldButton({ sceneUrl, sceneDescription, onClick }) {
  if (!sceneUrl) return null;

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', position: 'relative', overflow: 'hidden',
        borderRadius: 14, border: '2px solid var(--compass-gold)',
        background: 'var(--ink)', cursor: 'pointer',
        padding: 0, display: 'block',
        boxShadow: '0 4px 24px rgba(184,134,11,0.2)',
        transition: 'transform 200ms, box-shadow 200ms',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(184,134,11,0.35)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(184,134,11,0.2)'; }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${sceneUrl})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(2px) brightness(0.4)',
      }} />
      <div style={{
        position: 'relative', zIndex: 1,
        padding: '28px 24px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--compass-gold)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 30px rgba(184,134,11,0.5)',
          animation: 'enterWorldPulse 2s ease-in-out infinite',
        }}>
          <Sparkles size={22} color="var(--ink)" />
        </div>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 22,
          color: 'white', letterSpacing: '0.02em',
        }}>
          Enter Your World
        </span>
        {sceneDescription && (
          <span style={{
            fontSize: 12, color: 'rgba(255,255,255,0.7)',
            fontFamily: 'var(--font-body)', maxWidth: 400, textAlign: 'center',
          }}>
            {sceneDescription}
          </span>
        )}
      </div>
      <style>{`
        @keyframes enterWorldPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(184,134,11,0.4); }
          50% { box-shadow: 0 0 40px rgba(184,134,11,0.7); }
        }
      `}</style>
    </button>
  );
}
