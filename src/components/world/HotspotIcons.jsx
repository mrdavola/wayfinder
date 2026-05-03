// Iconic SVG props rendered inside each Hotspot button.
// Many roles have an outdoor (campsite) variant and an indoor (lab/workshop/cabin) variant
// so the world reads naturally — a wooden trailhead sign indoors looks comical.

const TRUNK    = '#5a3a18';
const TRUNK_LT = '#7a5a30';
const PARCH    = '#f4ebd4';
const PARCH_LT = '#fdf5e0';
const INK      = '#3a2a18';
const STONE    = '#9a8a70';
const STONE_LT = '#b8a890';
const FLAME    = '#f4c060';
const EMBER    = '#e88a40';
const TIN      = '#4a5a6a';
const TIN_DARK = '#2a3a4a';
const BRASS    = '#b08a40';

const isIndoor = (b) => b === 'lab' || b === 'workshop' || b === 'cabin';

/* ─────────────────── TRAILHEAD ─────────────────── */

function OutdoorTrailheadSign({ title }) {
  return (
    <svg width="120" height="140" viewBox="0 0 120 140" aria-hidden="true">
      <rect x="54" y="40" width="12" height="100" fill={TRUNK}/>
      <rect x="54" y="40" width="3"  height="100" fill={TRUNK_LT} opacity="0.6"/>
      <path d="M2,30 L100,30 L114,46 L100,62 L2,62 Z" fill={TRUNK_LT} stroke={TRUNK} strokeWidth="2"/>
      <text x="50" y="51" fontFamily="Georgia, serif" fontSize="13" textAnchor="middle"
            fill={INK} fontStyle="italic">{title || 'Project'}</text>
      <g transform="translate(60,90)" stroke={INK} strokeWidth="0.8" fill="none" opacity="0.55">
        <circle r="6"/><line x1="0" y1="-6" x2="0" y2="6"/><line x1="-6" y1="0" x2="6" y2="0"/>
      </g>
    </svg>
  );
}

function IndoorProjectBoard({ title }) {
  // A leather-bound clipboard / project ledger leaning against the wall.
  return (
    <svg width="100" height="120" viewBox="0 0 100 120" aria-hidden="true">
      {/* Easel legs */}
      <line x1="20" y1="118" x2="34" y2="58" stroke={TRUNK} strokeWidth="3"/>
      <line x1="80" y1="118" x2="66" y2="58" stroke={TRUNK} strokeWidth="3"/>
      {/* Board */}
      <rect x="14" y="22" width="72" height="80" fill={PARCH} stroke={TRUNK} strokeWidth="3"/>
      <rect x="14" y="22" width="72" height="14" fill={TRUNK} opacity="0.85"/>
      {/* Title strip */}
      <text x="50" y="32" fontFamily="Georgia, serif" fontSize="8" textAnchor="middle"
            fill={PARCH_LT} fontStyle="italic">PROJECT</text>
      {/* Project title (wraps via two short lines) */}
      <text x="50" y="56" fontFamily="Georgia, serif" fontSize="10" textAnchor="middle"
            fill={INK}>{(title || 'Project').slice(0, 18)}</text>
      <text x="50" y="68" fontFamily="Georgia, serif" fontSize="10" textAnchor="middle"
            fill={INK}>{(title || '').slice(18, 36)}</text>
      {/* Underline */}
      <line x1="20" y1="80" x2="80" y2="80" stroke={TRUNK} strokeWidth="0.6" opacity="0.5"/>
      <line x1="20" y1="88" x2="74" y2="88" stroke={TRUNK} strokeWidth="0.6" opacity="0.4"/>
    </svg>
  );
}

export function TrailheadSignIcon({ title, biomeId }) {
  return isIndoor(biomeId)
    ? <IndoorProjectBoard title={title} />
    : <OutdoorTrailheadSign title={title} />;
}

/* ─────────────────── MAILBOX / IN-TRAY ─────────────────── */

function OutdoorMailbox() {
  return (
    <svg width="80" height="120" viewBox="0 0 80 120" aria-hidden="true">
      <rect x="36" y="60" width="8" height="60" fill={TRUNK}/>
      <path d="M4,40 L4,70 L56,70 L56,40 Q56,18 30,18 Q4,18 4,40 Z" fill={TIN} stroke={TIN_DARK} strokeWidth="2"/>
      <rect x="14" y="48" width="32" height="12" rx="2" fill={TIN_DARK} opacity="0.6"/>
      <rect x="58" y="34" width="2" height="22" fill={INK}/>
      <path d="M60,34 L72,38 L60,42 Z" fill="#b8443a"/>
    </svg>
  );
}

function IndoorInTray() {
  // Stacked paper in-tray sitting on the bench
  return (
    <svg width="90" height="64" viewBox="0 0 90 64" aria-hidden="true">
      {/* Lower tray */}
      <path d="M4,46 L86,46 L82,58 L8,58 Z" fill={TIN} stroke={TIN_DARK} strokeWidth="1.5"/>
      <path d="M4,46 L86,46 L86,42 L4,42 Z" fill={TIN_DARK}/>
      {/* Stack of paper */}
      <rect x="14" y="28" width="64" height="14" fill={PARCH_LT} stroke={TRUNK_LT} strokeWidth="0.8"/>
      <rect x="18" y="20" width="58" height="10" fill={PARCH} stroke={TRUNK_LT} strokeWidth="0.8" transform="rotate(-1 18 20)"/>
      <rect x="20" y="14" width="52" height="8" fill={PARCH_LT} stroke={TRUNK_LT} strokeWidth="0.8" transform="rotate(2 20 14)"/>
      {/* Wax seal */}
      <circle cx="64" cy="34" r="3.5" fill="#b8443a"/>
      {/* IN label */}
      <text x="10" y="55" fontFamily="Georgia, serif" fontSize="6" fill={PARCH_LT} fontWeight="bold">IN</text>
    </svg>
  );
}

export function MailboxIcon({ biomeId }) {
  return isIndoor(biomeId) ? <IndoorInTray /> : <OutdoorMailbox />;
}

/* ─────────────────── REFLECTION (campfire / oil lamp) ─────────────────── */

function OutdoorCampfire() {
  return (
    <svg width="90" height="80" viewBox="0 0 90 80" aria-hidden="true">
      <ellipse cx="20" cy="60" rx="10" ry="6" fill={STONE}/>
      <ellipse cx="70" cy="60" rx="10" ry="6" fill={STONE_LT}/>
      <ellipse cx="45" cy="62" rx="14" ry="6" fill={STONE_LT}/>
      <line x1="22" y1="58" x2="68" y2="54" stroke={TRUNK} strokeWidth="6" strokeLinecap="round"/>
      <line x1="26" y1="62" x2="64" y2="58" stroke={TRUNK_LT} strokeWidth="5" strokeLinecap="round"/>
      <path d="M36,52 Q42,32 45,18 Q48,32 54,52 Q49,42 45,48 Q41,42 36,52 Z" fill={EMBER} opacity="0.9"/>
      <path d="M40,52 Q44,38 45,28 Q46,38 50,52 Q47,46 45,48 Q43,46 40,52 Z" fill={FLAME} opacity="0.95"/>
      <ellipse cx="45" cy="58" rx="32" ry="6" fill={EMBER} opacity="0.25"/>
    </svg>
  );
}

function IndoorOilLamp() {
  // Brass oil lamp sitting on the bench/table
  return (
    <svg width="60" height="90" viewBox="0 0 60 90" aria-hidden="true">
      {/* Base saucer */}
      <ellipse cx="30" cy="84" rx="22" ry="5" fill={BRASS}/>
      <ellipse cx="30" cy="80" rx="22" ry="5" fill="#d4a85a"/>
      {/* Reservoir (brass bowl with oil) */}
      <path d="M14,80 Q14,60 30,58 Q46,60 46,80 Z" fill={BRASS} stroke={INK} strokeWidth="1.2"/>
      <ellipse cx="30" cy="60" rx="14" ry="3" fill="#3a2a18" opacity="0.5"/>
      {/* Burner stem */}
      <rect x="26" y="46" width="8" height="14" fill={TIN_DARK}/>
      {/* Glass chimney */}
      <path d="M22,10 L22,46 L38,46 L38,10 Q38,4 30,4 Q22,4 22,10 Z"
            fill={PARCH_LT} stroke={INK} strokeWidth="1.2" opacity="0.85"/>
      {/* Flame inside chimney */}
      <ellipse cx="30" cy="34" rx="5" ry="10" fill={EMBER} opacity="0.9"/>
      <ellipse cx="30" cy="34" rx="2.5" ry="7" fill={FLAME}/>
      {/* Glow */}
      <ellipse cx="30" cy="40" rx="22" ry="4" fill={EMBER} opacity="0.18"/>
    </svg>
  );
}

export function CampfireIcon({ biomeId }) {
  return isIndoor(biomeId) ? <IndoorOilLamp /> : <OutdoorCampfire />;
}

/* ─────────────────── WALL MAP (cabin: view your projects) ─────────────────── */

export function WallMapIcon() {
  return (
    <svg width="100" height="80" viewBox="0 0 100 80" aria-hidden="true">
      {/* Frame */}
      <rect x="2" y="6" width="96" height="68" fill={PARCH_LT} stroke={TRUNK} strokeWidth="3"/>
      <rect x="2" y="6" width="96" height="10" fill={TRUNK} opacity="0.7"/>
      {/* River */}
      <path d="M10,28 Q30,38 50,32 Q70,26 90,40" stroke="#6a8aa8" strokeWidth="2" fill="none" opacity="0.7"/>
      {/* Trail */}
      <path d="M14,60 Q30,52 48,56 Q66,60 86,52" stroke={TRUNK_LT} strokeWidth="1.4" strokeDasharray="3 2" fill="none"/>
      {/* Markers */}
      <circle cx="22" cy="58" r="3" fill="#b8443a"/>
      <circle cx="50" cy="56" r="3" fill="#b8443a"/>
      <circle cx="78" cy="54" r="3" fill="#b8443a"/>
      {/* Tree icons */}
      <path d="M68,38 L72,30 L76,38 Z" fill="#3d5a28" opacity="0.7"/>
      <path d="M30,42 L34,34 L38,42 Z" fill="#3d5a28" opacity="0.7"/>
    </svg>
  );
}

/* ─────────────────── SPECIMEN CABINET (cabin: review your skills) ─────────────────── */

export function SpecimenCabinetIcon() {
  return (
    <svg width="80" height="100" viewBox="0 0 80 100" aria-hidden="true">
      {/* Cabinet body */}
      <rect x="6" y="4" width="68" height="92" fill={TRUNK_LT} stroke={INK} strokeWidth="2"/>
      {/* Glass doors */}
      <rect x="10" y="8"  width="60" height="84" fill={PARCH_LT} stroke={INK} strokeWidth="1"/>
      <line x1="40" y1="8" x2="40" y2="92" stroke={INK} strokeWidth="1.2"/>
      {/* Shelves */}
      <line x1="10" y1="32" x2="70" y2="32" stroke={TRUNK} strokeWidth="1.5"/>
      <line x1="10" y1="56" x2="70" y2="56" stroke={TRUNK} strokeWidth="1.5"/>
      <line x1="10" y1="80" x2="70" y2="80" stroke={TRUNK} strokeWidth="1.5"/>
      {/* Specimen jars on shelves */}
      <rect x="14" y="14" width="10" height="16" rx="1" fill="#b6c19a" stroke={INK} strokeWidth="0.7"/>
      <rect x="28" y="14" width="10" height="16" rx="1" fill="#b6c19a" stroke={INK} strokeWidth="0.7"/>
      <rect x="44" y="14" width="10" height="16" rx="1" fill="#b6c19a" stroke={INK} strokeWidth="0.7"/>
      <rect x="58" y="14" width="10" height="16" rx="1" fill="#b6c19a" stroke={INK} strokeWidth="0.7"/>
      <rect x="14" y="38" width="10" height="16" rx="1" fill="#dfe6cc" stroke={INK} strokeWidth="0.7"/>
      <rect x="28" y="38" width="10" height="16" rx="1" fill="#b8443a" opacity="0.55" stroke={INK} strokeWidth="0.7"/>
      <rect x="44" y="38" width="10" height="16" rx="1" fill="#b6c19a" stroke={INK} strokeWidth="0.7"/>
      <rect x="14" y="62" width="10" height="16" rx="1" fill="#dfe6cc" stroke={INK} strokeWidth="0.7"/>
      <rect x="58" y="62" width="10" height="16" rx="1" fill="#b6c19a" stroke={INK} strokeWidth="0.7"/>
      {/* Knob */}
      <circle cx="36" cy="50" r="1.5" fill={BRASS}/>
      <circle cx="44" cy="50" r="1.5" fill={BRASS}/>
    </svg>
  );
}

/* ─────────────────── BULLETIN BOARD ─────────────────── */
// Same corkboard works in any biome.

export function BulletinBoardIcon() {
  return (
    <svg width="100" height="120" viewBox="0 0 100 120" aria-hidden="true">
      <rect x="10" y="60" width="6"  height="60" fill={TRUNK}/>
      <rect x="84" y="60" width="6"  height="60" fill={TRUNK}/>
      <rect x="6" y="14" width="88" height="64" fill="#c4a870" stroke={TRUNK} strokeWidth="3"/>
      <rect x="14" y="22" width="26" height="22" fill={PARCH} transform="rotate(-4 14 22)"/>
      <rect x="48" y="20" width="22" height="20" fill="#dfe6cc" transform="rotate(3 48 20)"/>
      <rect x="20" y="50" width="30" height="20" fill={PARCH} transform="rotate(-2 20 50)"/>
      <circle cx="20" cy="24" r="1.6" fill="#b8443a"/>
      <circle cx="60" cy="22" r="1.6" fill="#b8443a"/>
    </svg>
  );
}

/* ─────────────────── LANTERN (decorative / fallback) ─────────────────── */

export function LanternIcon({ lit = true }) {
  return (
    <svg width="60" height="100" viewBox="0 0 60 100" aria-hidden="true">
      <path d="M30,4 L30,14" stroke={INK} strokeWidth="2"/>
      <path d="M14,14 Q30,2 46,14" stroke={INK} strokeWidth="2" fill="none"/>
      <path d="M10,14 L50,14 L46,22 L14,22 Z" fill={TIN_DARK}/>
      <rect x="16" y="22" width="28" height="40"
            fill={lit ? '#fde4a0' : '#dfe6cc'} stroke={INK} strokeWidth="1.5" opacity={lit ? 1 : 0.6}/>
      {lit && (
        <>
          <ellipse cx="30" cy="46" rx="6" ry="12" fill={EMBER} opacity="0.85"/>
          <ellipse cx="30" cy="46" rx="3" ry="8"  fill={FLAME}/>
        </>
      )}
      <path d="M14,62 L46,62 L50,70 L10,70 Z" fill={TIN_DARK}/>
      <rect x="22" y="70" width="16" height="6" fill={TIN}/>
    </svg>
  );
}

/* ─────────────────── STAGE CAIRN / WAYPOINT ─────────────────── */

function CairnOutdoor({ state, number }) {
  const dim = state === 'future' ? 0.55 : 1;
  const completed = state === 'completed';
  return (
    <svg width="76" height="86" viewBox="0 0 76 86" aria-hidden="true" opacity={dim}>
      <ellipse cx="38" cy="74" rx="32" ry="10" fill={STONE} stroke={INK} strokeWidth="1" opacity="0.95"/>
      <ellipse cx="38" cy="56" rx="22" ry="8"  fill={STONE_LT} stroke={INK} strokeWidth="1" opacity="0.95"/>
      <ellipse cx="38" cy="40" rx="16" ry="7"  fill={completed ? '#c8a840' : STONE} stroke={INK} strokeWidth="1.2"/>
      <text x="38" y="44" fontFamily="Georgia, serif" fontSize="14" fontWeight="600"
            textAnchor="middle" fill={INK}>{number}</text>
      {completed && (
        <path d="M48,30 L54,36 L62,24" stroke="#3d5a28" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      )}
    </svg>
  );
}

function CairnIndoor({ state, number }) {
  // Indoor stage marker = numbered, leather-bound notebook standing upright on the bench.
  const dim = state === 'future' ? 0.55 : 1;
  const completed = state === 'completed';
  const cover = completed ? '#3d5a28' : (state === 'active' ? '#7a3a30' : '#5a4630');
  return (
    <svg width="68" height="86" viewBox="0 0 68 86" aria-hidden="true" opacity={dim}>
      {/* Pages stack */}
      <rect x="12" y="14" width="44" height="62" fill={PARCH_LT} stroke={TRUNK_LT} strokeWidth="0.8"/>
      <rect x="14" y="12" width="44" height="62" fill={PARCH} stroke={TRUNK_LT} strokeWidth="0.8"/>
      {/* Cover */}
      <rect x="12" y="10" width="44" height="62" fill={cover} stroke={INK} strokeWidth="1.2"/>
      {/* Spine band */}
      <rect x="12" y="20" width="44" height="6" fill={BRASS} opacity="0.85"/>
      <rect x="12" y="60" width="44" height="6" fill={BRASS} opacity="0.85"/>
      {/* Number plate */}
      <rect x="20" y="34" width="28" height="22" fill={PARCH} stroke={INK} strokeWidth="0.8"/>
      <text x="34" y="52" fontFamily="Georgia, serif" fontSize="18" fontWeight="600"
            textAnchor="middle" fill={INK}>{number}</text>
      {completed && (
        <path d="M44,40 L48,44 L54,34" stroke="#3d5a28" strokeWidth="2" fill="none" strokeLinecap="round"/>
      )}
      {/* Bottom shadow */}
      <ellipse cx="34" cy="80" rx="22" ry="3" fill={INK} opacity="0.18"/>
    </svg>
  );
}

export function CairnIcon({ state = 'active', number = 1, biomeId }) {
  return isIndoor(biomeId)
    ? <CairnIndoor state={state} number={number} />
    : <CairnOutdoor state={state} number={number} />;
}

/* ─────────────────── CHALLENGER ─────────────────── */

export function ChallengerIcon() {
  return (
    <svg width="60" height="100" viewBox="0 0 60 100" aria-hidden="true">
      <path d="M14,98 L4,40 Q4,20 30,16 Q56,20 56,40 L46,98 Z" fill="#3a2a30" stroke={INK} strokeWidth="1.2"/>
      <path d="M14,40 Q30,28 46,40 Q42,52 30,52 Q18,52 14,40 Z" fill="#1a1018"/>
      <circle cx="24" cy="42" r="1.2" fill="#fde4a0" opacity="0.9"/>
      <circle cx="36" cy="42" r="1.2" fill="#fde4a0" opacity="0.9"/>
      <line x1="56" y1="30" x2="58" y2="98" stroke={TRUNK} strokeWidth="2.5"/>
    </svg>
  );
}

/* ─────────────────── JOURNAL / STRETCH / PARENT LETTER ─────────────────── */

export function JournalIcon() {
  return (
    <svg width="90" height="70" viewBox="0 0 90 70" aria-hidden="true">
      <path d="M4,12 L42,18 L42,62 L4,58 Z" fill={PARCH} stroke={TRUNK_LT} strokeWidth="1.5"/>
      <path d="M86,12 L48,18 L48,62 L86,58 Z" fill={PARCH} stroke={TRUNK_LT} strokeWidth="1.5"/>
      <rect x="42" y="14" width="6" height="48" fill={TRUNK} rx="1"/>
      <g stroke={TRUNK} strokeWidth="0.6" opacity="0.45">
        <line x1="10" y1="24" x2="38" y2="28"/>
        <line x1="10" y1="32" x2="36" y2="35"/>
        <line x1="10" y1="40" x2="38" y2="44"/>
        <line x1="10" y1="48" x2="34" y2="51"/>
      </g>
      <g stroke={INK} strokeWidth="0.8" opacity="0.6" fill="none">
        <path d="M58,30 Q66,22 74,30 Q72,40 66,42 Q58,38 58,30 Z"/>
        <line x1="58" y1="50" x2="80" y2="52"/>
      </g>
    </svg>
  );
}

export function StretchIcon() {
  return (
    <svg width="80" height="100" viewBox="0 0 80 100" aria-hidden="true">
      <rect x="36" y="20" width="8" height="80" fill={TRUNK}/>
      <path d="M4,28 L60,28 L72,40 L60,52 L4,52 Z" fill={TRUNK_LT} stroke={TRUNK} strokeWidth="1.5"/>
      <text x="36" y="44" fontFamily="Georgia, serif" fontSize="11" fill={INK} textAnchor="middle">stretch</text>
    </svg>
  );
}

export function ParentLetterIcon() {
  return (
    <svg width="80" height="60" viewBox="0 0 80 60" aria-hidden="true">
      <rect x="4" y="10" width="72" height="44" rx="2" fill={PARCH} stroke={TRUNK_LT} strokeWidth="1.5" transform="rotate(-3 4 10)"/>
      <path d="M4,10 L40,32 L76,10" stroke={TRUNK_LT} strokeWidth="1" fill="none" transform="rotate(-3 4 10)"/>
      <circle cx="58" cy="36" r="4" fill="#b8443a" opacity="0.85" transform="rotate(-3 4 10)"/>
    </svg>
  );
}
