const EARNED_TIERS    = new Set(['proficient', 'advanced']);
const PROGRESS_TIERS  = new Set(['emerging', 'developing']);

function tierFor(proficiency) {
  if (EARNED_TIERS.has(proficiency))   return 'earned';
  if (PROGRESS_TIERS.has(proficiency)) return 'progress';
  return 'locked';
}

const FILL_PCT = { earned: 100, progress: 50, locked: 0 };

export default function SpecimenCabinetPanel({ skills }) {
  if (skills.length === 0) {
    return (
      <div className="scp-empty">
        <p>No skills yet — complete project stages to fill your cabinet.</p>
      </div>
    );
  }

  const earnedCount = skills.filter(s => EARNED_TIERS.has(s.proficiency)).length;

  return (
    <div className="scp-root">
      <h2 className="scp-title">Specimen Cabinet</h2>
      <p className="scp-count">{earnedCount} / {skills.length} skills earned</p>
      <ul className="scp-grid">
        {skills.map(s => {
          const tier = tierFor(s.proficiency);
          return (
            <li key={s.id} className="scp-jar" data-tier={tier} title={s.name}>
              <div className="scp-jar-fill" style={{ height: `${FILL_PCT[tier]}%` }} />
              <span className="scp-jar-label">{s.name}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
