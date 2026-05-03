// Public demo page — showcases the biome scene system end-to-end with
// mock data. No auth, no DB; safe to share publicly.
//
// URL params (optional, for deep-linking a demo state):
//   ?biome=campsite|lab|workshop|cabin     (default: campsite)
//   ?phase=fresh|midway|almost-done|done   (default: fresh)
//   ?team=solo|group                       (default: group)
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import './DemoPage.css';
import BiomeScene from '../../components/world/BiomeScene';

const BIOMES = [
  { id: 'campsite', label: 'Campsite',  blurb: 'Outdoor expedition — open-ended projects' },
  { id: 'lab',      label: 'Lab',       blurb: 'Indoor study — science / observation' },
  { id: 'workshop', label: 'Workshop',  blurb: 'Maker space — engineering / build' },
  { id: 'cabin',    label: 'Cabin',     blurb: 'Home base — your hub between projects' },
];

const PHASES = [
  { id: 'fresh',       label: 'Fresh',         help: 'Just starting — Stage 1 active' },
  { id: 'midway',      label: 'Mid-project',   help: 'Stage 1 done, Stage 2 active' },
  { id: 'almost-done', label: 'Almost there',  help: 'Stages 1–2 done, Stage 3 active' },
  { id: 'done',        label: 'Complete',      help: 'All three stages completed' },
];

const TEAM_PRESETS = [
  { id: 'solo',  label: 'Solo' },
  { id: 'group', label: 'Group' },
];

const MOCK_QUESTS = {
  campsite: {
    id: 'demo-campsite',
    title: 'How can our cafeteria reduce food waste?',
    description: 'Investigate where food waste comes from in our school and design a system that measurably reduces it within 4 weeks.',
    driving_question: 'How might we cut cafeteria food waste by half before the term ends?',
    biome_id: 'campsite',
    character_image_url: null,
  },
  lab: {
    id: 'demo-lab',
    title: 'What lives in our schoolyard pond?',
    description: 'Catalog the species in our pond ecosystem and analyze the food web.',
    driving_question: 'How healthy is the pond ecosystem at the back of campus?',
    biome_id: 'lab',
    character_image_url: null,
  },
  workshop: {
    id: 'demo-workshop',
    title: 'Design a chair that costs under $20',
    description: 'Prototype a chair that supports 200 lbs using only $20 of materials.',
    driving_question: 'Can we build a chair worth keeping for the price of a pizza?',
    biome_id: 'workshop',
    character_image_url: null,
  },
  cabin: {
    id: 'demo-cabin',
    title: 'Your home base',
    description: 'Switch between projects, review your skills, read messages.',
    driving_question: null,
    biome_id: 'cabin',
    character_image_url: null,
  },
};

const STAGE_TEMPLATES = {
  campsite: [
    { title: 'Observe & Map',
      description: 'Spend two lunches counting and weighing what gets thrown out.',
      challenge:   'Produce a one-page map of the trash flow with at least three measurements.',
      deliverable_description: 'Photo + tally sheet.' },
    { title: 'Interview Sources',
      description: 'Talk to lunch staff and three students about why food gets tossed.',
      challenge:   'Find one root cause that surprised you.',
      deliverable_description: 'Two-paragraph interview summary.' },
    { title: 'Prototype a Fix',
      description: 'Pick the smallest intervention that could meaningfully change the metric.',
      challenge:   'Build a paper or physical prototype you can run for one lunch.',
      deliverable_description: 'Prototype + one-week measurement plan.' },
  ],
  lab: [
    { title: 'Survey the pond',
      description: 'Identify and photograph at least eight distinct species.',
      challenge:   'Note where each species was found and the time of day.',
      deliverable_description: 'Field notebook page with sketches and labels.' },
    { title: 'Build the food web',
      description: 'Map who eats whom using your survey data.',
      challenge:   'Identify the apex predator and the most vulnerable producer.',
      deliverable_description: 'Annotated diagram.' },
    { title: 'Health diagnosis',
      description: 'Compare your findings against a healthy reference ecosystem.',
      challenge:   'Make one prediction about how the pond will change in five years.',
      deliverable_description: 'Two-page report.' },
  ],
  workshop: [
    { title: 'Sketch & spec',
      description: 'Sketch three concepts with materials and rough costs.',
      challenge:   'Defend why your final pick is the strongest under load.',
      deliverable_description: 'Three sketches + chosen design with bill of materials.' },
    { title: 'Build the prototype',
      description: 'Build it with the cheapest valid materials you can source.',
      challenge:   'Stay under $20 even when something breaks.',
      deliverable_description: 'Photo of finished chair + receipts.' },
    { title: 'Stress test',
      description: 'Sit on it. Have your largest classmate sit on it. Document failures.',
      challenge:   'Identify the weakest joint and propose a fix.',
      deliverable_description: 'Test log + revision plan.' },
  ],
};

const TEAMMATES = [
  { student_id: 't1', name: 'Maya',   role: 'Lead',     avatar_emoji: null },
  { student_id: 't2', name: 'Jordan', role: 'Research', avatar_emoji: null },
];

function buildStages(biomeId, phase) {
  if (biomeId === 'cabin') return [];
  const tpl = STAGE_TEMPLATES[biomeId] || STAGE_TEMPLATES.campsite;
  const phaseMap = {
    'fresh':       ['active',    'locked',    'locked'],
    'midway':      ['completed', 'active',    'locked'],
    'almost-done': ['completed', 'completed', 'active'],
    'done':        ['completed', 'completed', 'completed'],
  };
  const states = phaseMap[phase] || phaseMap.fresh;
  const biomeStateOf = (s) => (s === 'completed' ? 'completed' : s === 'active' ? 'active' : 'future');
  return tpl.map((stage, i) => ({
    id: `s${i + 1}`,
    stage_number: i + 1,
    title: stage.title,
    description: stage.description,
    challenge:   stage.challenge,
    deliverable_description: stage.deliverable_description,
    status: states[i],
    biomeState: biomeStateOf(states[i]),
  }));
}

const SESSION = { studentId: 'demo-student', studentName: 'Alex', pin: '0000' };

export default function DemoPage() {
  const [params, setParams] = useSearchParams();
  const biomeId = BIOMES.some(b => b.id === params.get('biome')) ? params.get('biome') : 'campsite';
  const phase   = PHASES.some(p => p.id === params.get('phase'))   ? params.get('phase')   : 'fresh';
  const team    = TEAM_PRESETS.some(t => t.id === params.get('team')) ? params.get('team') : 'group';

  const setParam = useCallback((key, value) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  }, [params, setParams]);

  const quest = MOCK_QUESTS[biomeId] || MOCK_QUESTS.campsite;
  const stages = useMemo(() => buildStages(biomeId, phase), [biomeId, phase]);
  // Cabin is a hub — no teammates regardless of team preset
  const teammates = (biomeId === 'cabin' || team === 'solo') ? [] : TEAMMATES;

  // Hide the controls toolbar via "?ui=off" so screenshots stay clean
  const uiHidden = params.get('ui') === 'off';

  // Quick keyboard shortcuts: 1-4 switch biome, q/w/e/r switch phase
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const biomeKey = ['1', '2', '3', '4'].indexOf(e.key);
      if (biomeKey >= 0) setParam('biome', BIOMES[biomeKey].id);
      const phaseKey = ['q', 'w', 'e', 'r'].indexOf(e.key.toLowerCase());
      if (phaseKey >= 0) setParam('phase', PHASES[phaseKey].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setParam]);

  return (
    <div className="demo-page">
      <BiomeScene
        quest={quest}
        stages={stages}
        studentSession={SESSION}
        feedback={[]}
        teammates={teammates}
        onStageComplete={() => {}}
        forceBiome={biomeId}
      />

      {!uiHidden && (
        <div className="demo-toolbar" role="region" aria-label="Demo controls">
          <div className="demo-toolbar__brand">
            <span className="demo-toolbar__badge">demo</span>
            <span className="demo-toolbar__name">Diagonally world</span>
          </div>

          <DemoSelect
            label="Biome"
            value={biomeId}
            onChange={(v) => setParam('biome', v)}
            options={BIOMES.map(b => ({ value: b.id, label: b.label, hint: b.blurb }))}
          />

          {biomeId !== 'cabin' && (
            <>
              <DemoSelect
                label="Phase"
                value={phase}
                onChange={(v) => setParam('phase', v)}
                options={PHASES.map(p => ({ value: p.id, label: p.label, hint: p.help }))}
              />
              <DemoSelect
                label="Team"
                value={team}
                onChange={(v) => setParam('team', v)}
                options={TEAM_PRESETS.map(t => ({ value: t.id, label: t.label }))}
              />
            </>
          )}

          <div className="demo-toolbar__hint" aria-hidden="true">
            <kbd>1</kbd>–<kbd>4</kbd> biome · <kbd>q</kbd>–<kbd>r</kbd> phase
          </div>
        </div>
      )}
    </div>
  );
}

function DemoSelect({ label, value, onChange, options }) {
  return (
    <label className="demo-select">
      <span className="demo-select__label">{label}</span>
      <span className="demo-select__chips">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            className={`demo-chip${o.value === value ? ' demo-chip--on' : ''}`}
            onClick={() => onChange(o.value)}
            title={o.hint}
            aria-pressed={o.value === value}
          >
            {o.label}
          </button>
        ))}
      </span>
    </label>
  );
}
