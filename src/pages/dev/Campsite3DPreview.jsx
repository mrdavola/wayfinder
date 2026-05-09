// Dev-only preview for the Campsite3D component. Mock stages so we can see
// the trailhead campfire, completed cairns, the active lantern, locked tents,
// and the summit without going through auth or a real Supabase quest.
//
// Visit /dev/campsite to see it.

import { useEffect, useState } from 'react';
import Campsite3D from '../../components/map/Campsite3D';
import useAmbientSound from '../../hooks/useAmbientSound';

const PRESETS = {
  early:  { activeIdx: 1, total: 6, name: 'Early in the journey' },
  mid:    { activeIdx: 3, total: 6, name: 'Mid expedition' },
  late:   { activeIdx: 5, total: 6, name: 'Near the summit' },
  short:  { activeIdx: 1, total: 3, name: 'Short project' },
  long:   { activeIdx: 4, total: 9, name: 'Long expedition' },
};

function buildMockStages(total, activeIdx) {
  return Array.from({ length: total }, (_, i) => ({
    id: `stage-${i}`,
    title: `Stage ${i + 1}`,
    status: i < activeIdx ? 'completed' : i === activeIdx ? 'active' : 'locked',
  }));
}

export default function Campsite3DPreview() {
  const [preset, setPreset] = useState('mid');
  const cfg = PRESETS[preset];
  const stages = buildMockStages(cfg.total, cfg.activeIdx);
  // Burst replay: bumping this re-fires the ember puff at the active stage,
  // so the demo button always works even if the prop is "the same" as before.
  const [burstNonce, setBurstNonce] = useState(0);

  const { enabled: soundEnabled, toggle: toggleSound, play: playSound, stop: stopSound } = useAmbientSound();
  // Auto-play the campfire crackle while the 3D map is up. Honors the user's
  // global ambient toggle: if they've turned sound off, play() is a no-op.
  useEffect(() => {
    playSound('campfire');
    return () => stopSound();
  }, [playSound, stopSound, soundEnabled]);

  return (
    <div style={{
      minHeight: '100vh', padding: '24px 28px', background: 'var(--paper)',
      fontFamily: 'var(--font-body)', color: 'var(--ink)',
    }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, margin: 0 }}>
            Campsite3D — preview
          </h1>
          <p style={{ color: 'var(--graphite)', fontSize: 13, marginTop: 4 }}>
            {cfg.name} — {cfg.total} stages, active = {cfg.activeIdx + 1}.
            Drag to look around, click a waypoint to fire <code>onNodeClick</code>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.entries(PRESETS).map(([key, p]) => (
            <button
              key={key}
              onClick={() => setPreset(key)}
              style={{
                appearance: 'none', cursor: 'pointer',
                padding: '6px 10px', borderRadius: 8,
                border: '1px solid ' + (preset === key ? 'var(--ink)' : 'rgba(0,0,0,0.12)'),
                background: preset === key ? 'var(--ink)' : 'transparent',
                color: preset === key ? 'var(--paper)' : 'var(--ink)',
                fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 0.4,
              }}
            >
              {p.name}
            </button>
          ))}
          <button
            onClick={() => setBurstNonce(n => n + 1)}
            style={{
              appearance: 'none', cursor: 'pointer',
              padding: '6px 10px', borderRadius: 8,
              border: '1px solid var(--specimen-red)',
              background: 'var(--specimen-red)',
              color: 'var(--paper)',
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 0.4,
            }}
            title="Spark an ember burst at the active waypoint (simulates a stage just being completed)"
          >
            ✦ ember burst
          </button>
          <button
            onClick={toggleSound}
            style={{
              appearance: 'none', cursor: 'pointer',
              padding: '6px 10px', borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.12)',
              background: 'transparent',
              color: 'var(--ink)',
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 0.4,
            }}
            title="Global ambient sound — used by the rest of Diagonally too"
          >
            {soundEnabled ? '🔊 sound on' : '🔇 sound off'}
          </button>
        </div>
      </header>

      <Campsite3D
        stages={stages}
        activeCard={`stage-${cfg.activeIdx}`}
        recentlyCompleted={burstNonce ? `stage-${cfg.activeIdx}::${burstNonce}` : null}
        onNodeClick={(id) => {
          // eslint-disable-next-line no-console
          console.log('clicked waypoint:', id);
        }}
        studentName="Ada"
        studentEmoji="🧭"
        height={520}
      />

      <section style={{ marginTop: 18, padding: 16, borderRadius: 10, background: 'var(--parchment)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, margin: 0, marginBottom: 6 }}>Legend</h2>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: 'var(--ink)' }}>
          <li><b>Campfire</b> — the trailhead, where every project starts</li>
          <li><b>Cairn + green pennant</b> — a stage you've completed</li>
          <li><b>Lantern post</b> — your active stage (warm light, gentle pulse)</li>
          <li><b>Fogged tent</b> — locked, not yet reached</li>
          <li><b>Snowy peak</b> — the final stage, your summit</li>
        </ul>
      </section>
    </div>
  );
}
