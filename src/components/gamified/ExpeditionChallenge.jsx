import { useState, useEffect } from 'react';
import { Compass, Zap, Loader2, ChevronRight, RotateCcw, Sparkles } from 'lucide-react';

const CHALLENGE_THEMES = {
  estimate: { icon: Compass, label: 'Navigation Check', color: 'var(--compass-gold)', verb: 'Estimate' },
  pattern: { icon: Zap, label: 'Signal Decode', color: 'var(--lab-blue)', verb: 'Complete' },
  quick_write: { icon: Compass, label: 'Field Report', color: 'var(--field-green)', verb: 'Record' },
  classify: { icon: Compass, label: 'Supply Sort', color: 'var(--specimen-red)', verb: 'Organize' },
  decode: { icon: Zap, label: 'Cipher Break', color: 'var(--lab-blue)', verb: 'Decode' },
};

export default function ExpeditionChallenge({ challenge, existingResponse, onEvaluate, disabled }) {
  const [response, setResponse] = useState('');
  const [classifyAnswers, setClassifyAnswers] = useState({});
  const [evaluating, setEvaluating] = useState(false);
  const [result, setResult] = useState(existingResponse ? {
    is_successful: existingResponse.is_successful,
    narrative_feedback: existingResponse.ai_feedback,
    ep_awarded: existingResponse.ep_awarded,
  } : null);
  const [showChallenge, setShowChallenge] = useState(false);

  const theme = CHALLENGE_THEMES[challenge.challenge_type] || CHALLENGE_THEMES.estimate;
  const config = challenge.challenge_config || {};
  const completed = !!existingResponse || result?.is_successful;

  useEffect(() => {
    const t = setTimeout(() => setShowChallenge(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async () => {
    if (evaluating || disabled) return;
    const submissionText = challenge.challenge_type === 'classify'
      ? JSON.stringify(classifyAnswers)
      : response;
    if (!submissionText.trim()) return;

    setEvaluating(true);
    const evalResult = await onEvaluate(challenge, submissionText);
    setResult(evalResult);
    setEvaluating(false);
  };

  const handleRetry = () => {
    setResult(null);
    setResponse('');
    setClassifyAnswers({});
  };

  // ---- Completed State ----
  if (completed) {
    return (
      <div style={{
        margin: '12px 0', padding: '14px 16px', borderRadius: 10,
        background: 'rgba(75,139,59,0.06)', border: '1px solid rgba(75,139,59,0.2)',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Sparkles size={14} color="var(--compass-gold)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--field-green)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Challenge Cleared
          </span>
          {(result?.ep_awarded || existingResponse?.ep_awarded) > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: 'var(--compass-gold)' }}>
              +{result?.ep_awarded || existingResponse?.ep_awarded} EP
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: 'var(--graphite)', margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>
          {result?.narrative_feedback || existingResponse?.ai_feedback || 'The path ahead is clear.'}
        </p>
      </div>
    );
  }

  // ---- Failed Attempt ----
  if (result && !result.is_successful) {
    return (
      <div style={{
        margin: '12px 0', padding: '14px 16px', borderRadius: 10,
        background: 'rgba(184,134,11,0.06)', border: '1.5px dashed var(--compass-gold)',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <RotateCcw size={14} color="var(--compass-gold)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--compass-gold)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
            Not quite...
          </span>
          {result.ep_awarded > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--compass-gold)' }}>
              +{result.ep_awarded} EP for trying
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: 'var(--graphite)', margin: '0 0 10px', lineHeight: 1.5, fontStyle: 'italic' }}>
          {result.narrative_feedback}
        </p>
        <button onClick={handleRetry} style={{
          padding: '6px 14px', borderRadius: 6, border: '1px solid var(--pencil)',
          background: 'var(--chalk)', color: 'var(--ink)', fontSize: 11, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'var(--font-body)',
        }}>
          Try Again
        </button>
      </div>
    );
  }

  // ---- Active Challenge ----
  return (
    <div style={{
      margin: '12px 0', borderRadius: 10,
      border: `1.5px solid ${theme.color}`,
      background: 'var(--chalk)',
      overflow: 'hidden',
      opacity: showChallenge ? 1 : 0,
      transform: showChallenge ? 'translateY(0)' : 'translateY(8px)',
      transition: 'all 0.4s ease',
    }}>
      {/* Header bar */}
      <div style={{
        padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8,
        background: `color-mix(in srgb, ${theme.color} 8%, transparent)`,
        borderBottom: `1px solid color-mix(in srgb, ${theme.color} 15%, transparent)`,
      }}>
        <theme.icon size={14} color={theme.color} />
        <span style={{ fontSize: 10, fontWeight: 700, color: theme.color, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {theme.label}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--graphite)' }}>
          +{challenge.ep_reward || 15} EP
        </span>
      </div>

      {/* Challenge body */}
      <div style={{ padding: '14px 16px' }}>
        <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, margin: '0 0 12px', fontWeight: 500 }}>
          {challenge.challenge_text}
        </p>

        {/* TYPE: estimate, pattern, decode -- single input */}
        {(challenge.challenge_type === 'estimate' || challenge.challenge_type === 'pattern' || challenge.challenge_type === 'decode') && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type={challenge.challenge_type === 'estimate' ? 'number' : 'text'}
              value={response}
              onChange={e => setResponse(e.target.value)}
              placeholder={challenge.challenge_type === 'estimate' ? 'Your estimate...' : 'Your answer...'}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 8,
                border: `1.5px solid color-mix(in srgb, ${theme.color} 30%, var(--pencil))`,
                background: 'var(--paper)', fontSize: 14, fontFamily: 'var(--font-body)',
                color: 'var(--ink)', outline: 'none',
              }}
            />
            {config.unit && (
              <span style={{ fontSize: 12, color: 'var(--graphite)', fontWeight: 600 }}>{config.unit}</span>
            )}
          </div>
        )}

        {/* TYPE: quick_write -- textarea */}
        {challenge.challenge_type === 'quick_write' && (
          <textarea
            value={response}
            onChange={e => setResponse(e.target.value)}
            placeholder="Write your field report..."
            rows={3}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8, resize: 'vertical',
              border: `1.5px solid color-mix(in srgb, ${theme.color} 30%, var(--pencil))`,
              background: 'var(--paper)', fontSize: 13, fontFamily: 'var(--font-body)',
              color: 'var(--ink)', outline: 'none', boxSizing: 'border-box',
            }}
          />
        )}

        {/* TYPE: classify -- radio buttons per item per category */}
        {challenge.challenge_type === 'classify' && config.categories && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {config.categories.map(cat => (
              <div key={cat} style={{
                flex: '1 1 140px', padding: 10, borderRadius: 8,
                border: '1px dashed var(--pencil)', background: 'var(--paper)', minWidth: 120,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: theme.color, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 8 }}>
                  {cat}
                </div>
                {(config.items || []).map(item => (
                  <label key={item.text} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0',
                    fontSize: 12, color: 'var(--ink)', cursor: 'pointer',
                  }}>
                    <input type="radio" name={`classify-${item.text}`}
                      checked={classifyAnswers[item.text] === cat}
                      onChange={() => setClassifyAnswers(prev => ({ ...prev, [item.text]: cat }))}
                      style={{ accentColor: theme.color }}
                    />
                    {item.text}
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Submit button */}
        <button onClick={handleSubmit} disabled={evaluating}
          style={{
            marginTop: 12, display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: evaluating ? 'var(--pencil)' : theme.color,
            color: 'white', fontSize: 12, fontWeight: 700, cursor: evaluating ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-body)', transition: 'background 0.15s ease',
          }}>
          {evaluating ? (
            <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Checking...</>
          ) : (
            <><ChevronRight size={13} /> Proceed</>
          )}
        </button>
      </div>
    </div>
  );
}
