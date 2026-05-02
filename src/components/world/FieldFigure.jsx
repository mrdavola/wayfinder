// src/components/world/FieldFigure.jsx
// Procedural pencil-and-wash SVG character — fallback when AI portraits aren't available.

const OUTFIT_COLORS = {
  field:    '#8a7050',   // field vest — brown/tan
  lab:      '#e8e8e0',   // lab coat — off-white
  workshop: '#5a4a3a',   // workshop apron — dark brown
};

const SKIN_TONES = {
  light:   '#f0d8b8',
  medium:  '#d4a878',
  dark:    '#8a5a30',
};

const HAIR_TONES = {
  light:  '#c8a850',
  dark:   '#3a2a18',
  grey:   '#9a9a90',
  auburn: '#8a4020',
};

/**
 * @param {object} props
 * @param {'light'|'medium'|'dark'}    [props.skinTone='medium']
 * @param {'light'|'dark'|'grey'|'auburn'} [props.hairTone='dark']
 * @param {'field'|'lab'|'workshop'}   [props.outfit='field']
 * @param {'neutral'|'happy'|'curious'} [props.mood='happy']
 * @param {number}  [props.size=80]    height in px; width scales proportionally
 * @param {string}  [props.label]      accessible aria-label
 * @param {string}  [props.className]
 */
export default function FieldFigure({
  skinTone = 'medium',
  hairTone = 'dark',
  outfit   = 'field',
  mood     = 'happy',
  size     = 80,
  label    = 'Field guide character',
  className = '',
}) {
  const skin  = SKIN_TONES[skinTone]  ?? SKIN_TONES.medium;
  const hair  = HAIR_TONES[hairTone]  ?? HAIR_TONES.dark;
  const body  = OUTFIT_COLORS[outfit] ?? OUTFIT_COLORS.field;
  const w     = Math.round(size * 0.65);

  return (
    <svg
      viewBox="0 0 52 80"
      width={w}
      height={size}
      aria-label={label}
      role="img"
      className={`field-figure ${className}`}
      style={{ overflow: 'visible' }}
    >
      {/* Hair */}
      <ellipse cx="26" cy="16" rx="13" ry="14" fill={hair} opacity="0.95"/>

      {/* Head */}
      <ellipse cx="26" cy="19" rx="11" ry="12" fill={skin}/>

      {/* Eyes */}
      <circle cx="22" cy="18" r="1.4" fill="#3a2a18"/>
      <circle cx="30" cy="18" r="1.4" fill="#3a2a18"/>
      {/* Eye shine */}
      <circle cx="22.7" cy="17.4" r="0.5" fill="white" opacity="0.8"/>
      <circle cx="30.7" cy="17.4" r="0.5" fill="white" opacity="0.8"/>

      {/* Mouth */}
      {mood === 'happy' && (
        <path
          data-feature="mouth-happy"
          d="M22,23 Q26,27 30,23"
          stroke="#5a3a20"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
      )}
      {mood === 'neutral' && (
        <line
          data-feature="mouth-neutral"
          x1="22" y1="23.5" x2="30" y2="23.5"
          stroke="#5a3a20"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      )}
      {mood === 'curious' && (
        <path
          data-feature="mouth-curious"
          d="M22,24 Q24,22 26,23.5 Q28,25 30,23"
          stroke="#5a3a20"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* Neck */}
      <rect x="23" y="29" width="6" height="5" rx="1" fill={skin}/>

      {/* Body / outfit */}
      <rect data-feature="body" x="14" y="34" width="24" height="26" rx="5" fill={body}/>

      {/* Outfit detail lines */}
      <line x1="26" y1="34" x2="26" y2="60" stroke="rgba(0,0,0,0.1)" strokeWidth="0.8"/>
      {outfit === 'lab' && (
        <rect x="21" y="36" width="10" height="6" rx="1" fill="#d0d0c8" opacity="0.7"/>
      )}
      {outfit === 'field' && (
        <>
          <rect x="18" y="37" width="6" height="4" rx="1" fill="#6a5238" opacity="0.6"/>
          <rect x="28" y="37" width="6" height="4" rx="1" fill="#6a5238" opacity="0.6"/>
        </>
      )}
      {outfit === 'workshop' && (
        <rect x="20" y="35" width="12" height="20" rx="2" fill="#3a2a18" opacity="0.3"/>
      )}

      {/* Arms */}
      <rect x="6"  y="34" width="10" height="5" rx="3" fill={body} transform="rotate(-15 11 36.5)"/>
      <rect x="36" y="34" width="10" height="5" rx="3" fill={body} transform="rotate(15 41 36.5)"/>

      {/* Hands */}
      <circle cx="8"  cy="44" r="4" fill={skin}/>
      <circle cx="44" cy="44" r="4" fill={skin}/>

      {/* Legs */}
      <rect x="17" y="58" width="8" height="16" rx="4" fill={body} opacity="0.85"/>
      <rect x="27" y="58" width="8" height="16" rx="4" fill={body} opacity="0.85"/>

      {/* Boots */}
      <ellipse cx="21" cy="74" rx="6" ry="4" fill="#5a4030"/>
      <ellipse cx="31" cy="74" rx="6" ry="4" fill="#5a4030"/>

      {/* Ink outline (very subtle) */}
      <ellipse cx="26" cy="19" rx="11" ry="12" fill="none" stroke="#4a3020" strokeWidth="0.4" opacity="0.4"/>
    </svg>
  );
}
