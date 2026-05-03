// src/components/world/AmbientLayer.jsx
import './AmbientLayer.css';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const ELEMENTS = {
  lanternFlicker: () => (
    <div data-ambient="lanternFlicker" className="ambient-lantern-wrap" aria-hidden="true">
      <svg viewBox="0 0 40 60" width="40" height="60" className="ambient-lantern">
        <rect x="10" y="12" width="20" height="28" rx="4" fill="#e8c870" opacity="0.6"/>
        <ellipse cx="20" cy="30" rx="8" ry="12" fill="#f5d080" className="ambient-lantern-flame" opacity="0.9"/>
        <rect x="16" y="4"  width="8" height="10" rx="2" fill="#8a6a40" opacity="0.8"/>
        <line x1="20" y1="0" x2="20" y2="4" stroke="#8a6a40" strokeWidth="2"/>
      </svg>
    </div>
  ),
  hearthFlicker: () => (
    <div data-ambient="hearthFlicker" className="ambient-hearth-wrap" aria-hidden="true">
      <svg viewBox="0 0 60 50" width="60" height="50" className="ambient-hearth">
        {/* warm glow pool */}
        <ellipse cx="30" cy="44" rx="26" ry="6" fill="#d97a2a" opacity="0.25" className="ambient-hearth-glow"/>
        {/* logs */}
        <rect x="8"  y="38" width="44" height="6" rx="2" fill="#5a3a20" opacity="0.85"/>
        <rect x="14" y="33" width="32" height="5" rx="2" fill="#704828" opacity="0.8"/>
        {/* outer flame */}
        <path
          d="M30,40 Q18,28 22,16 Q26,22 30,18 Q34,22 38,16 Q42,28 30,40 Z"
          fill="#f0a050"
          opacity="0.85"
          className="ambient-hearth-flame ambient-hearth-flame--outer"
        />
        {/* inner flame */}
        <path
          d="M30,38 Q24,30 26,22 Q28,26 30,24 Q32,26 34,22 Q36,30 30,38 Z"
          fill="#f8d070"
          opacity="0.95"
          className="ambient-hearth-flame ambient-hearth-flame--inner"
        />
        {/* embers */}
        <circle cx="20" cy="42" r="1.2" fill="#ffb060" opacity="0.9" className="ambient-hearth-ember ambient-hearth-ember--a"/>
        <circle cx="42" cy="42" r="1"   fill="#ffd080" opacity="0.85" className="ambient-hearth-ember ambient-hearth-ember--b"/>
        <circle cx="30" cy="44" r="0.9" fill="#ff9040" opacity="0.9" className="ambient-hearth-ember ambient-hearth-ember--c"/>
      </svg>
    </div>
  ),
  leafFall: () => (
    <div data-ambient="leafFall" className="ambient-leaves-wrap" aria-hidden="true">
      {[0, 1, 2, 3].map(i => (
        <svg
          key={i}
          className="ambient-leaf"
          style={{ '--leaf-delay': `${i * 1.8}s`, '--leaf-x': `${15 + i * 22}%` }}
          viewBox="0 0 16 20" width="14" height="18"
          aria-hidden="true"
        >
          <path d="M8,0 Q16,6 12,14 Q8,20 4,14 Q0,6 8,0 Z" fill="#6a8a3a" opacity="0.75"/>
          <line x1="8" y1="4" x2="8" y2="18" stroke="#4a6a24" strokeWidth="1" opacity="0.5"/>
        </svg>
      ))}
    </div>
  ),
  paperCurl: () => (
    <div data-ambient="paperCurl" className="ambient-paper-wrap" aria-hidden="true">
      <div className="ambient-paper-curl" />
    </div>
  ),
  mothFlutter: () => (
    <div data-ambient="mothFlutter" className="ambient-moth-wrap" aria-hidden="true">
      <svg className="ambient-moth" viewBox="0 0 28 16" width="28" height="16" aria-hidden="true">
        <path d="M14,8 Q6,0 2,4 Q6,12 14,8 Z" fill="#c8b890" opacity="0.65"/>
        <path d="M14,8 Q22,0 26,4 Q22,12 14,8 Z" fill="#c8b890" opacity="0.65"/>
        <line x1="12" y1="6" x2="8" y2="2" stroke="#a09070" strokeWidth="0.8"/>
        <line x1="16" y1="6" x2="20" y2="2" stroke="#a09070" strokeWidth="0.8"/>
      </svg>
    </div>
  ),
};

/**
 * @param {object} props
 * @param {string[]} props.ambient     list of preset ids from biome config
 * @param {boolean}  [props.calmMode]  disables all animations
 */
export default function AmbientLayer({ ambient = [], calmMode = false }) {
  const systemReduced = useReducedMotion();
  const active = ambient.filter(id => ELEMENTS[id]);
  if (active.length === 0) return null;
  return (
    <div
      className="ambient-layer"
      data-calm={(calmMode || systemReduced) ? 'true' : undefined}
      aria-hidden="true"
    >
      {active.map(id => {
        const El = ELEMENTS[id];
        return <El key={id} />;
      })}
    </div>
  );
}
