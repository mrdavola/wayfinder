export default function TeammatePanel({ teammate }) {
  if (!teammate) {
    return (
      <div className="ho-panel">
        <h2 id="ho-dialog-title" className="ho-title">Teammate</h2>
        <p className="ho-body">No teammate data available.</p>
      </div>
    );
  }

  const { name, role, avatar_emoji } = teammate;
  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div className="ho-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--parchment, #f0ede6)',
          border: '2px solid var(--pencil, #9ca3af)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: avatar_emoji ? 26 : 20,
          fontFamily: avatar_emoji ? undefined : 'var(--font-mono)',
          color: 'var(--ink, #1a1a2e)',
        }}>
          {avatar_emoji || initial}
        </div>
        <div>
          <h2 id="ho-dialog-title" className="ho-title" style={{ margin: 0 }}>{name || 'Teammate'}</h2>
          {role && (
            <p style={{
              margin: '2px 0 0',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: 'var(--graphite, #6b7280)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {role}
            </p>
          )}
        </div>
      </div>
      <p className="ho-body">
        {name ? `${name} is` : 'Your teammate is'} working on this project with you.
        You're both heading toward the same goal.
      </p>
    </div>
  );
}
