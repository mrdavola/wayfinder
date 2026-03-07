import { useState } from 'react';
import { GitFork, ArrowRight, Sparkles } from 'lucide-react';

export default function ChoiceFork({ config, onChoose }) {
  const { prompt, choices } = config;
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => { setConfirmed(true); setTimeout(() => onChoose?.(selected), 600); };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ background: 'linear-gradient(135deg, var(--parchment) 0%, #EDE8DC 100%)', borderRadius: 12, padding: 24, border: '1px solid var(--pencil)' }}>
        <div style={{ textAlign: 'center', marginBottom: 12 }}><GitFork size={28} color="var(--compass-gold)" /></div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)', textAlign: 'center', marginBottom: 24, lineHeight: 1.4 }}>{prompt}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(choices || []).map((choice, idx) => (
            <button key={idx} onClick={() => !confirmed && setSelected(idx)} disabled={confirmed}
              style={{ padding: 16, borderRadius: 10, border: '2px solid', borderColor: selected === idx ? 'var(--compass-gold)' : 'var(--pencil)', background: selected === idx ? 'rgba(184,134,11,0.08)' : 'var(--chalk)', textAlign: 'left', cursor: confirmed ? 'default' : 'pointer', transition: 'all 200ms', opacity: confirmed && selected !== idx ? 0.4 : 1 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--ink)', fontWeight: 600, marginBottom: 4 }}>{choice.label}</div>
              {choice.description && <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)' }}>{choice.description}</div>}
              {choice.difficulty === 'stretch' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 6, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--compass-gold)', textTransform: 'uppercase' }}>
                  <Sparkles size={10} /> Stretch path
                </span>
              )}
            </button>
          ))}
        </div>

        {selected !== null && !confirmed && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={handleConfirm} className="btn btn-primary" style={{ fontSize: 14 }}>Choose this path <ArrowRight size={14} /></button>
          </div>
        )}
        {confirmed && (
          <div style={{ textAlign: 'center', marginTop: 16, color: 'var(--compass-gold)', fontFamily: 'var(--font-display)', fontSize: 16 }}>
            Path chosen. The adventure continues...
          </div>
        )}
      </div>
    </div>
  );
}
