import { useState, useEffect } from 'react';
import { Zap, X, Trophy, RotateCcw } from 'lucide-react';

const ENTRANCE_DURATION = 600; // ms

export default function ChallengerEncounter({
  challengeText,
  epReward = 30,
  onRespond,
  onDismiss,
  studentName,
  defeated, // null | { success: boolean, feedback: string, epAwarded: number }
}) {
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setEntered(true));
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSubmit = async () => {
    if (!response.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onRespond(response.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(26, 26, 46, 0.85)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: entered ? 1 : 0,
      transition: `opacity ${ENTRANCE_DURATION}ms ease`,
    }}>
      <div style={{
        background: 'var(--chalk)', borderRadius: 16, maxWidth: 560, width: '90%',
        padding: '32px 28px', position: 'relative',
        transform: entered ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
        transition: `transform ${ENTRANCE_DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 0 2px var(--compass-gold)',
      }}>
        {/* Close button — only after defeated */}
        {defeated && (
          <button onClick={onDismiss} style={{
            position: 'absolute', top: 12, right: 12, background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--pencil)', padding: 4,
          }}>
            <X size={18} />
          </button>
        )}

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 12px',
            background: defeated?.success
              ? 'var(--field-green)'
              : 'linear-gradient(135deg, var(--compass-gold), var(--specimen-red))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: !defeated ? 'challengerPulse 2s ease-in-out infinite' : 'none',
          }}>
            {defeated?.success
              ? <Trophy size={28} color="white" />
              : <Zap size={28} color="white" />}
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)',
            margin: '0 0 4px', letterSpacing: '-0.01em',
          }}>
            {defeated?.success ? 'Challenge Cleared!' : defeated ? 'Not Quite...' : 'Challenge!'}
          </h2>
          {!defeated && (
            <div style={{
              fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--compass-gold)',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              +{epReward} EP if you nail this
            </div>
          )}
        </div>

        {/* Challenge text */}
        <div style={{
          background: 'var(--parchment)', borderRadius: 10, padding: '16px 18px',
          marginBottom: 20, borderLeft: '3px solid var(--compass-gold)',
        }}>
          <p style={{
            fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, margin: 0,
            fontFamily: 'var(--font-body)',
          }}>
            {challengeText}
          </p>
        </div>

        {/* Result display */}
        {defeated && (
          <div style={{
            padding: '14px 16px', borderRadius: 10, marginBottom: 16,
            background: defeated.success ? 'rgba(45,106,79,0.06)' : 'rgba(184,134,11,0.06)',
            border: `1px solid ${defeated.success ? 'var(--field-green)' : 'var(--compass-gold)'}`,
          }}>
            <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, margin: 0 }}>
              {defeated.feedback}
            </p>
            {defeated.success && (
              <div style={{
                marginTop: 8, fontSize: 12, fontWeight: 700, color: 'var(--field-green)',
                fontFamily: 'var(--font-mono)',
              }}>
                +{defeated.epAwarded} EP earned!
              </div>
            )}
          </div>
        )}

        {/* Response area (only when not yet defeated) */}
        {!defeated && (
          <>
            <textarea
              value={response}
              onChange={e => setResponse(e.target.value)}
              placeholder={`${studentName || 'What do you think'}? Make your case...`}
              rows={4}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 8,
                border: '1.5px solid var(--pencil)', background: 'var(--chalk)',
                fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink)',
                resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={!response.trim() || submitting}
              style={{
                marginTop: 12, width: '100%', padding: '12px 20px', borderRadius: 10,
                border: 'none', fontFamily: 'var(--font-body)', fontSize: 14,
                fontWeight: 700, cursor: response.trim() && !submitting ? 'pointer' : 'not-allowed',
                background: response.trim() && !submitting ? 'var(--ink)' : 'var(--pencil)',
                color: 'var(--chalk)',
                transition: 'background 0.2s ease',
              }}
            >
              {submitting ? 'Thinking...' : 'Stand Your Ground'}
            </button>
          </>
        )}

        {/* Retry / move on option */}
        {defeated && !defeated.success && (
          <button onClick={onDismiss} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            width: '100%', padding: '10px 16px', borderRadius: 8, marginTop: 8,
            border: '1px solid var(--pencil)', background: 'var(--chalk)',
            color: 'var(--ink)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}>
            <RotateCcw size={14} /> Move on
          </button>
        )}

        {/* Dismiss after success */}
        {defeated?.success && (
          <button onClick={onDismiss} style={{
            width: '100%', padding: '10px 16px', borderRadius: 8, marginTop: 8,
            border: 'none', background: 'var(--field-green)', color: 'white',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}>
            Continue
          </button>
        )}
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes challengerPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(184,134,11,0.4); }
          50% { box-shadow: 0 0 0 12px rgba(184,134,11,0); }
        }
      `}</style>
    </div>
  );
}
