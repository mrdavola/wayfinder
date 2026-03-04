import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  BookOpen,
  Users,
  X,
  Compass,
  ArrowRight,
  ArrowLeft,
  Award,
  Zap,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import WayfinderLogoIcon from '../components/icons/WayfinderLogo';
import TopBar from '../components/layout/TopBar';

// ── Pathway Options ────────────────────────────────────────────────────────────

const PATHWAY_OPTIONS = [
  { value: 'all',              label: 'All Pathways' },
  { value: 'material_science', label: 'Material Science' },
  { value: 'biology',          label: 'Biology' },
  { value: 'healthcare',       label: 'Healthcare & Sports' },
  { value: 'engineering',      label: 'Engineering' },
  { value: 'math',             label: 'Mathematics' },
  { value: 'writing',          label: 'Writing & ELA' },
];

const GRADE_OPTIONS = [
  { value: 'all', label: 'All Grades' },
  { value: 'K-2', label: 'K–2' },
  { value: '3-5', label: '3–5' },
  { value: '6-8', label: '6–8' },
  { value: '9-12', label: '9–12' },
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'rated',   label: 'Best Rated' },
  { value: 'newest',  label: 'Newest' },
];

// ── Standards Registry ────────────────────────────────────────────────────────
// Real standard descriptions + Learning Commons Knowledge Graph UUIDs (kg_uuid)

const STANDARDS_REGISTRY = {
  // CCSS Math — verified via Learning Commons Knowledge Graph
  '4.NF.B.3': {
    subject: 'Math',
    domain: 'Number & Operations — Fractions',
    description: 'Understand a fraction a/b with a > 1 as a sum of fractions 1/b.',
    kg_uuid: '6b9e2c7a-d7cc-11e8-824f-0242ac160002',
  },
  '3.NF.A.1': {
    subject: 'Math',
    domain: 'Number & Operations — Fractions',
    description: 'Understand a fraction 1/b as the quantity formed by 1 part when a whole is partitioned into b equal parts.',
    kg_uuid: '6b9bf846-d7cc-11e8-824f-0242ac160002',
  },
  '6.SP.B.4': {
    subject: 'Math',
    domain: 'Statistics & Probability',
    description: 'Display numerical data in plots on a number line, including dot plots, histograms, and box plots.',
    kg_uuid: '6b9ee4bb-d7cc-11e8-824f-0242ac160002',
  },
  '6.RP.A.1': {
    subject: 'Math',
    domain: 'Ratios & Proportional Relationships',
    description: 'Understand the concept of a ratio and use ratio language to describe a ratio relationship between two quantities.',
    kg_uuid: '6b9c2b26-d7cc-11e8-824f-0242ac160002',
  },
  '5.NF.B.5': {
    subject: 'Math',
    domain: 'Number & Operations — Fractions',
    description: 'Interpret multiplication as scaling (resizing), by comparing the size of a product to the size of one factor.',
    kg_uuid: '6b9f70d0-d7cc-11e8-824f-0242ac160002',
  },
  '4.MD.A.2': {
    subject: 'Math',
    domain: 'Measurement & Data',
    description: 'Use the four operations to solve word problems involving distances, intervals of time, liquid volumes, masses of objects, and money.',
    kg_uuid: '6b9d484a-d7cc-11e8-824f-0242ac160002',
  },
  'MP1': {
    subject: 'Math Practice',
    domain: 'Standards for Mathematical Practice',
    description: 'Make sense of problems and persevere in solving them.',
    kg_uuid: '6b9ca36a-d7cc-11e8-824f-0242ac160002',
  },
  'MP4': {
    subject: 'Math Practice',
    domain: 'Standards for Mathematical Practice',
    description: 'Model with mathematics.',
    kg_uuid: '6b9f345f-d7cc-11e8-824f-0242ac160002',
  },
  // CCSS ELA — standard descriptions (no KG UUID available)
  'W.4.1': {
    subject: 'ELA',
    domain: 'Writing',
    description: 'Write opinion pieces on topics or texts, supporting a point of view with reasons and information.',
  },
  'W.5.2': {
    subject: 'ELA',
    domain: 'Writing',
    description: 'Write informative/explanatory texts to examine a topic and convey ideas and information clearly.',
  },
  'W.6.1': {
    subject: 'ELA',
    domain: 'Writing',
    description: 'Write arguments to support claims with clear reasons and relevant evidence.',
  },
  'SL.3.4': {
    subject: 'ELA',
    domain: 'Speaking & Listening',
    description: 'Report on a topic or text, tell a story, or recount an experience with appropriate facts and relevant details, speaking clearly at an understandable pace.',
  },
  // NGSS Science & Engineering
  'NGSS.4-PS3-2': {
    subject: 'Science',
    domain: 'Physical Science',
    description: 'Make observations to provide evidence that energy can be transferred from place to place by sound, light, heat, and electric currents.',
  },
  'NGSS.MS-LS1-1': {
    subject: 'Science',
    domain: 'Life Science',
    description: 'Conduct an investigation to provide evidence that living things are made of cells; either one cell or many different numbers and types of cells.',
  },
  'NGSS.MS-PS1-2': {
    subject: 'Science',
    domain: 'Physical Science',
    description: 'Analyze and interpret data on the properties of substances before and after they interact to determine if a chemical reaction has occurred.',
  },
  'NGSS.MS-ETS1-1': {
    subject: 'Engineering',
    domain: 'Engineering, Technology & Applications',
    description: 'Define the criteria and constraints of a design problem with sufficient precision to ensure a successful solution.',
  },
  'NGSS.MS-ESS3-3': {
    subject: 'Science',
    domain: 'Earth & Space Science',
    description: 'Apply scientific principles to design a method for monitoring and minimizing a human impact on the environment.',
  },
};

// ── PBL Elements — BIE 7 Gold Standard ───────────────────────────────────────

const PBL_ELEMENTS = {
  dq:   { key: 'dq',   label: 'Driving Question',   color: 'var(--specimen-red)',  description: 'A challenging, open-ended problem or question that anchors the project and gives it purpose.' },
  si:   { key: 'si',   label: 'Sustained Inquiry',   color: 'var(--lab-blue)',      description: 'A rigorous, extended process of posing questions, finding resources, and applying information.' },
  auth: { key: 'auth', label: 'Authenticity',        color: 'var(--field-green)',   description: 'Real-world context, tasks, tools, quality standards, and/or impact that connect to students\' lives.' },
  sv:   { key: 'sv',   label: 'Student Voice',       color: 'var(--compass-gold)',  description: 'Students make meaningful decisions about the project, their process, and how they work.' },
  ref:  { key: 'ref',  label: 'Reflection',          color: 'var(--graphite)',      description: 'Students and teachers reflect on learning, the effectiveness of inquiry, and the quality of student work.' },
  cr:   { key: 'cr',   label: 'Critique & Revision', color: 'var(--specimen-red)',  description: 'Students give, receive, and use feedback to improve their process and products.' },
  pp:   { key: 'pp',   label: 'Public Product',      color: 'var(--lab-blue)',      description: 'Students make their work public by presenting, displaying, or delivering it to an audience beyond the classroom.' },
};

// ── Enriched Fallback Templates ───────────────────────────────────────────────

const FALLBACK_TEMPLATES = [
  {
    id: 'qt1',
    title: 'Minecraft to Material Science',
    subtitle: 'Which material would make the best battery for an electric scooter startup?',
    description: 'Students enter a real material science lab context, choosing battery materials for an EV startup using AI-powered testing tools.',
    career_pathway: 'material_science',
    interest_tags: ['Minecraft', 'Building', 'Gaming'],
    grade_band: '3-5',
    total_duration_days: 10,
    academic_standards: ['4.NF.B.3', 'W.4.1', 'NGSS.4-PS3-2', 'MP4'],
    pbl_elements: ['dq', 'auth', 'cr', 'pp'],
    usage_count: 47,
    rating: 4.8,
    is_public: true,
    narrative_hook: "You've been hired as a junior material scientist at a fast-growing electric scooter startup. They need a better battery — lighter, stronger, and cheaper to build. Your Minecraft instincts for choosing the right materials are exactly what this team needs.",
    stages: [
      { stage_number: 1, title: 'The Battery Problem', type: 'research', duration_days: 2, description: 'Research what makes a battery work well and build your material research file.' },
      { stage_number: 2, title: 'The Material Lab', type: 'experiment', duration_days: 3, description: 'Test 5 candidate materials against your criteria using a weighted scoring system.' },
      { stage_number: 3, title: 'Simulation Chamber', type: 'simulate', duration_days: 1, description: 'Present your recommendation to Dr. Reyes and defend it under pressure.' },
      { stage_number: 4, title: 'The Final Report', type: 'present', duration_days: 2, description: 'Write a 1-page brief the CEO can take to investors.' },
      { stage_number: 5, title: 'Field Notes', type: 'reflect', duration_days: 2, description: 'Synthesize what you discovered and share it with the Project Library.' },
    ],
  },
  {
    id: 'qt2',
    title: 'Animal Lovers to Biotech Pioneers',
    subtitle: 'How is AI helping scientists design medicines that save animal and human lives?',
    description: 'Learners join a biotech lab using AI to discover medicines for a rare disease affecting both elephants and humans.',
    career_pathway: 'biology',
    interest_tags: ['Animals', 'Science', 'Nature'],
    grade_band: '3-5',
    total_duration_days: 12,
    academic_standards: ['5.NF.B.5', 'W.5.2', 'NGSS.MS-LS1-1', 'MP1'],
    pbl_elements: ['dq', 'si', 'auth', 'ref', 'pp'],
    usage_count: 31,
    rating: 4.6,
    is_public: true,
    narrative_hook: "You and your team have been recruited as junior researchers at BioFrontier, a biotech lab that uses AI to discover new medicines — targeting a rare disease that affects both elephants and humans.",
    stages: [
      { stage_number: 1, title: 'How Living Systems Work', type: 'research', duration_days: 2, description: 'Divide research with your team and build a shared Disease Profile document.' },
      { stage_number: 2, title: 'The Molecule Hunt', type: 'experiment', duration_days: 3, description: 'Analyze effectiveness data for 6 candidate molecules and rank your top two.' },
      { stage_number: 3, title: 'Lab Defense', type: 'simulate', duration_days: 2, description: 'Present findings to the chief scientist and defend your methodology.' },
      { stage_number: 4, title: 'Research Report', type: 'present', duration_days: 3, description: 'Write a collaborative research report suitable for peer review.' },
      { stage_number: 5, title: 'Reflection Journal', type: 'reflect', duration_days: 2, description: 'Record what you learned about AI in medicine and future career paths.' },
    ],
  },
  {
    id: 'qt3',
    title: 'Cooking Chemistry: The Kitchen Lab',
    subtitle: 'What happens when you cook food? Chemistry explains everything from bread rising to chocolate melting.',
    description: 'Learners become culinary scientists, investigating the chemistry behind everyday cooking with an AI sous-chef.',
    career_pathway: 'biology',
    interest_tags: ['Cooking', 'Science', 'Art'],
    grade_band: 'K-2',
    total_duration_days: 8,
    academic_standards: ['4.MD.A.2', 'MP4', 'NGSS.MS-PS1-2'],
    pbl_elements: ['sv', 'auth', 'ref'],
    usage_count: 22,
    rating: 4.9,
    is_public: true,
    narrative_hook: "You've just been hired as a culinary scientist at a food innovation lab. Every recipe is a chemical reaction — and the AI sous-chef wants your help figuring out why cakes rise, sauces emulsify, and caramel goes wrong.",
    stages: [
      { stage_number: 1, title: 'The Kitchen Lab', type: 'research', duration_days: 2, description: 'Investigate chemical reactions hidden inside everyday cooking processes.' },
      { stage_number: 2, title: 'Ingredient Experiments', type: 'experiment', duration_days: 3, description: 'Test how changing one ingredient changes the chemical outcome of a recipe.' },
      { stage_number: 3, title: 'The Taste Test', type: 'simulate', duration_days: 1, description: 'Present your food invention to a panel of food scientists.' },
      { stage_number: 4, title: 'Recipe Report', type: 'present', duration_days: 2, description: 'Document your invention with a detailed ingredient analysis.' },
    ],
  },
  {
    id: 'qt4',
    title: 'Space Architects: Designing a Mars Habitat',
    subtitle: 'Can you design a habitat that keeps humans alive on Mars? Every material choice could mean life or death.',
    description: 'Learners prototype a Mars habitat module for NASA, choosing materials to withstand radiation, temperature extremes, and atmospheric pressure.',
    career_pathway: 'engineering',
    interest_tags: ['Space', 'Building', 'Science'],
    grade_band: '6-8',
    total_duration_days: 14,
    academic_standards: ['6.RP.A.1', 'MP1', 'NGSS.MS-ETS1-1'],
    pbl_elements: ['dq', 'auth', 'pp', 'cr'],
    usage_count: 18,
    rating: 4.7,
    is_public: true,
    narrative_hook: "NASA has selected your team to prototype a Mars habitat module. You have a materials budget, a weight limit, and a list of Martian conditions that will challenge every decision you make.",
    stages: [
      { stage_number: 1, title: 'Mars Conditions Briefing', type: 'research', duration_days: 2, description: 'Research radiation levels, temperature extremes, and atmospheric pressure on Mars.' },
      { stage_number: 2, title: 'Material Selection', type: 'experiment', duration_days: 4, description: 'Evaluate candidate materials for structural integrity, insulation, and radiation shielding.' },
      { stage_number: 3, title: 'Habitat Design', type: 'simulate', duration_days: 3, description: 'Present your habitat blueprint to a NASA review board and answer hard questions.' },
      { stage_number: 4, title: 'Mission Report', type: 'present', duration_days: 3, description: 'Write a technical report with diagrams explaining your design decisions.' },
      { stage_number: 5, title: 'Astronaut Debrief', type: 'reflect', duration_days: 2, description: 'Reflect on what living on Mars would really mean for humankind.' },
    ],
  },
  {
    id: 'qt5',
    title: 'Music Math: The Sound of Fractions',
    subtitle: 'What do fractions have to do with music? More than you think — rhythm is math in disguise.',
    description: 'Learners join a music production studio and discover how time signatures, beat patterns, and rhythm are fraction problems in disguise.',
    career_pathway: 'math',
    interest_tags: ['Music', 'Art', 'Math'],
    grade_band: '3-5',
    total_duration_days: 7,
    academic_standards: ['3.NF.A.1', 'SL.3.4', 'MP4'],
    pbl_elements: ['sv', 'pp', 'cr'],
    usage_count: 39,
    rating: 4.5,
    is_public: true,
    narrative_hook: "You've just joined a music production studio where every beat grid is a fraction problem. The AI composer needs your help turning mathematical patterns into actual songs.",
    stages: [
      { stage_number: 1, title: 'The Beat Grid', type: 'research', duration_days: 2, description: 'Learn how time signatures map to fractions and whole numbers.' },
      { stage_number: 2, title: 'Composition Challenge', type: 'experiment', duration_days: 3, description: 'Compose a 16-bar piece using fraction-based rhythm patterns.' },
      { stage_number: 3, title: 'Performance Pitch', type: 'present', duration_days: 2, description: 'Perform or present your composition and explain the math behind it.' },
    ],
  },
  {
    id: 'qt6',
    title: 'Sports Analytics: The Numbers Behind the Game',
    subtitle: 'What can data tell us about athletic performance, injury risk, and team strategy?',
    description: 'Learners become junior analytics consultants for a professional sports team, uncovering patterns in game data and presenting to coaching staff.',
    career_pathway: 'healthcare',
    interest_tags: ['Sports', 'Gaming', 'Math'],
    grade_band: '6-8',
    total_duration_days: 9,
    academic_standards: ['6.SP.B.4', 'W.6.1', 'MP1'],
    pbl_elements: ['dq', 'si', 'pp'],
    usage_count: 26,
    rating: 4.4,
    is_public: true,
    narrative_hook: "You've been hired as a junior analytics consultant for a professional sports team. The head coach wants data-driven recommendations — and you're the one who has to find the patterns in thousands of rows of game stats.",
    stages: [
      { stage_number: 1, title: 'Stats Dive', type: 'research', duration_days: 2, description: 'Explore real game data to identify patterns in player performance.' },
      { stage_number: 2, title: 'Analysis Sprint', type: 'experiment', duration_days: 3, description: 'Build visualizations that reveal insights the coaching staff hasn\'t seen.' },
      { stage_number: 3, title: 'Coach Presentation', type: 'simulate', duration_days: 2, description: 'Present your findings to the coaching staff and field questions.' },
      { stage_number: 4, title: 'Analytics Report', type: 'present', duration_days: 2, description: 'Write a strategy memo with data visualizations and a clear recommendation.' },
    ],
  },
  {
    id: 'qt7',
    title: 'The Climate Engineer',
    subtitle: 'A coastal city faces rising seas. Can your team design a solution before the next storm?',
    description: 'Students become climate adaptation engineers for a real coastal city, evaluating 3 strategies using ratio math and systems thinking, then pitching to a simulated city council.',
    career_pathway: 'engineering',
    interest_tags: ['Environment', 'Science', 'Building'],
    grade_band: '6-8',
    total_duration_days: 12,
    academic_standards: ['6.RP.A.1', 'W.6.1', 'NGSS.MS-ETS1-1', 'NGSS.MS-ESS3-3', 'MP1'],
    pbl_elements: ['dq', 'si', 'auth', 'sv', 'pp', 'cr'],
    usage_count: 14,
    rating: 4.8,
    is_public: true,
    narrative_hook: "The city of Portside is underwater — figuratively, not yet literally. Rising seas, stronger storms, and failing infrastructure mean the city council has 90 days to pick an adaptation strategy. They've hired your engineering firm. The clock is ticking.",
    stages: [
      { stage_number: 1, title: 'Threat Assessment', type: 'research', duration_days: 2, description: 'Analyze sea-level projection data, flood maps, and infrastructure reports for Portside.' },
      { stage_number: 2, title: 'Strategy Comparison', type: 'experiment', duration_days: 3, description: 'Evaluate three adaptation strategies — sea walls, wetland restoration, floating infrastructure — using cost/benefit ratios.' },
      { stage_number: 3, title: 'Community Tradeoffs', type: 'simulate', duration_days: 2, description: 'Role-play a community meeting with stakeholders who have conflicting priorities.' },
      { stage_number: 4, title: 'City Council Pitch', type: 'present', duration_days: 3, description: 'Present your engineering recommendation with data visualizations and a written proposal.' },
      { stage_number: 5, title: 'Systems Debrief', type: 'reflect', duration_days: 2, description: 'Reflect on complex systems thinking and the tradeoffs engineers face in the real world.' },
    ],
  },
  {
    id: 'qt8',
    title: 'Story Architects: Writing That Changes Minds',
    subtitle: 'Can a well-crafted story actually change how someone thinks? Prove it.',
    description: 'Students become writers-in-residence at a digital publishing house, crafting opinion and narrative pieces for a real audience — then pitching their strongest work to an AI editor simulation.',
    career_pathway: 'writing',
    interest_tags: ['Writing', 'Art', 'Reading'],
    grade_band: '3-5',
    total_duration_days: 8,
    academic_standards: ['W.4.1', 'W.5.2', 'SL.3.4'],
    pbl_elements: ['sv', 'cr', 'pp', 'ref'],
    usage_count: 11,
    rating: 4.6,
    is_public: true,
    narrative_hook: "Inkwell Publishing has just launched a student writing imprint — but they only accept pieces that have gone through at least three rounds of revision and have a real point of view. You've been accepted as a writer-in-residence. Now you have to prove you belong.",
    stages: [
      { stage_number: 1, title: 'Finding Your Angle', type: 'research', duration_days: 2, description: 'Choose a topic you care about. Research both sides of the argument and find your voice.' },
      { stage_number: 2, title: 'First Draft', type: 'experiment', duration_days: 2, description: 'Write a complete first draft opinion piece. Share with a partner for peer review.' },
      { stage_number: 3, title: 'Editor\'s Desk', type: 'simulate', duration_days: 1, description: 'Pitch your piece to the AI editor. Answer tough questions and get revision notes.' },
      { stage_number: 4, title: 'Final Submission', type: 'present', duration_days: 2, description: 'Submit your final revised piece to the Inkwell collection. Read aloud to the group.' },
      { stage_number: 5, title: 'Writer\'s Reflection', type: 'reflect', duration_days: 1, description: 'Compare your first draft to your final. What changed? What does revision mean to you now?' },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTabColor(pathway) {
  const map = {
    material_science: 'var(--lab-blue)',
    biology: 'var(--field-green)',
    healthcare: 'var(--specimen-red)',
    engineering: 'var(--compass-gold)',
    math: 'var(--lab-blue)',
    writing: 'var(--field-green)',
  };
  return map[pathway] ?? 'var(--graphite)';
}

function getPathwayLabel(pathway) {
  if (!pathway) return null;
  const map = {
    material_science: 'Material Science',
    biology: 'Biology',
    healthcare: 'Healthcare & Sports',
    engineering: 'Engineering',
    math: 'Mathematics',
    writing: 'Writing & ELA',
  };
  return map[pathway] ?? pathway;
}

function getStageTypeLabel(type) {
  const map = {
    research: 'Research',
    experiment: 'Experiment',
    simulate: 'Simulation',
    present: 'Presentation',
    reflect: 'Reflection',
  };
  return map[type] ?? type;
}

function getInitials(fullName) {
  if (!fullName) return '?';
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function resolveStandard(code) {
  // Try exact match, then strip CCSS prefix variants
  if (STANDARDS_REGISTRY[code]) return STANDARDS_REGISTRY[code];
  // Try stripping CCSS.MATH.CONTENT. or CCSS.ELA-LITERACY.
  const stripped = code
    .replace(/^CCSS\.MATH\.CONTENT\./, '')
    .replace(/^CCSS\.ELA-LITERACY\./, '')
    .replace(/^CCSS\./, '');
  return STANDARDS_REGISTRY[stripped] ?? null;
}

function normalizeTemplate(row) {
  // DB schema uses stages_data or stages (after migration 004)
  // FALLBACK_TEMPLATES use stages directly
  const stagesRaw = row.stages ?? row.stages_data ?? [];
  const stages = Array.isArray(stagesRaw) ? stagesRaw : [];
  return {
    id: row.id,
    title: row.title ?? '(Untitled)',
    subtitle: row.subtitle ?? '',
    description: row.description ?? '',
    career_pathway: row.career_pathway ?? null,
    interest_tags: row.interest_tags ?? [],
    grade_band: row.grade_band ?? null,
    total_duration_days: row.total_duration_days ?? null,
    academic_standards: row.academic_standards ?? [],
    pbl_elements: row.pbl_elements ?? [],
    usage_count: row.usage_count ?? 0,
    rating: row.rating ?? 0,
    is_public: row.is_public ?? true,
    narrative_hook: row.narrative_hook ?? '',
    stages,
    created_at: row.created_at ?? null,
  };
}

function applyFilters(templates, { searchQuery, selectedPathway, selectedGrade, sortBy }) {
  let results = [...templates];

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    results = results.filter((t) => {
      return (
        t.title.toLowerCase().includes(q) ||
        (t.subtitle || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.interest_tags || []).some((tag) => tag.toLowerCase().includes(q)) ||
        (t.academic_standards || []).some((s) => s.toLowerCase().includes(q))
      );
    });
  }

  if (selectedPathway !== 'all') {
    results = results.filter((t) => t.career_pathway === selectedPathway);
  }

  if (selectedGrade !== 'all') {
    results = results.filter((t) => t.grade_band === selectedGrade);
  }

  if (sortBy === 'popular') {
    results.sort((a, b) => (b.usage_count ?? 0) - (a.usage_count ?? 0));
  } else if (sortBy === 'rated') {
    results.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  } else if (sortBy === 'newest') {
    results.sort((a, b) => {
      if (a.created_at && b.created_at) return new Date(b.created_at) - new Date(a.created_at);
      return 0;
    });
  }

  return results;
}

// ── Walkthrough Tour ──────────────────────────────────────────────────────────

const TOUR_STEPS = [
  {
    icon: <Compass size={48} color="var(--compass-gold)" />,
    title: 'Welcome to the Project Library',
    body: 'Discover project-based learning projects you can customize for your learners. Every project is designed around the Buck Institute\'s 7 Gold Standard PBL elements and aligned to real CCSS and NGSS academic standards.',
    visual: null,
  },
  {
    icon: <Search size={40} color="var(--lab-blue)" />,
    title: 'Filter by Pathway, Grade & Keyword',
    body: 'Search by topic, interest, or standard code — try typing "4.NF" or "NGSS". Filter by career pathway (Material Science, Engineering, Biology, and more) and grade band to find the right fit.',
    visual: (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {['3-5', 'Material Science', 'Engineering', '6-8', 'Math'].map(label => (
          <span key={label} style={{
            padding: '4px 10px',
            borderRadius: 20,
            border: '1px solid var(--pencil)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--graphite)',
            background: 'var(--parchment)',
          }}>{label}</span>
        ))}
      </div>
    ),
  },
  {
    icon: <BookOpen size={40} color="var(--field-green)" />,
    title: 'Real Standards, Verified by Learning Commons',
    body: 'Each project is tagged with CCSS Math, ELA, and NGSS standards. Standards with a "KG" badge are verified against the Learning Commons Knowledge Graph — the authoritative standards registry.',
    visual: (
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { code: '4.NF.B.3', desc: 'Understand a fraction a/b as a sum of fractions 1/b.', kg: true },
          { code: '6.RP.A.1', desc: 'Understand the concept of a ratio and ratio language.', kg: true },
          { code: 'W.4.1', desc: 'Write opinion pieces supporting a point of view.', kg: false },
        ].map(s => (
          <div key={s.code} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--lab-blue)',
              whiteSpace: 'nowrap',
              paddingTop: 1,
            }}>{s.code}</span>
            {s.kg && (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                background: 'var(--field-green)',
                color: 'var(--chalk)',
                borderRadius: 3,
                padding: '1px 4px',
                fontWeight: 600,
                flexShrink: 0,
                marginTop: 2,
              }}>KG</span>
            )}
            <span style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              color: 'var(--graphite)',
              lineHeight: 1.4,
            }}>{s.desc}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: <Award size={40} color="var(--specimen-red)" />,
    title: 'Gold Standard PBL — Built Into Every Project',
    body: 'Projects are designed around the Buck Institute\'s 7 Gold Standard PBL elements. Colored badges on each card show which elements the project covers — from Driving Question to Public Product.',
    visual: (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {Object.values(PBL_ELEMENTS).map(el => (
          <span key={el.key} style={{
            padding: '3px 8px',
            borderRadius: 20,
            border: `1px solid ${el.color}`,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: el.color,
            whiteSpace: 'nowrap',
          }}>{el.label}</span>
        ))}
      </div>
    ),
  },
  {
    icon: <Zap size={40} color="var(--compass-gold)" />,
    title: 'Preview, Customize & Launch',
    body: 'Click "Preview" on any card to see the full project — stages, narrative hook, and detailed standards breakdown. Hit "Use This Project" to load it into the Project Builder, where you personalize it for your learners.',
    visual: null,
  },
];

function WalkthroughTour({ onComplete }) {
  const [step, setStep] = useState(0);
  const total = TOUR_STEPS.length;
  const current = TOUR_STEPS[step];
  const isLast = step === total - 1;
  const isFirst = step === 0;

  function handleComplete() {
    localStorage.setItem('wayfinder_library_toured', '1');
    onComplete();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(26,26,46,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: 'var(--chalk)',
          borderRadius: 16,
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 32px 80px rgba(26,26,46,0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px 0',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--graphite)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Project Library Tour
          </span>
          <button
            onClick={handleComplete}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--graphite)',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Skip tour"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 28px 24px' }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            {current.icon}
          </div>

          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            color: 'var(--ink)',
            lineHeight: 1.25,
            marginBottom: 10,
            textAlign: 'center',
          }}>
            {current.title}
          </h2>

          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--graphite)',
            lineHeight: 1.6,
            textAlign: 'center',
          }}>
            {current.body}
          </p>

          {current.visual && (
            <div style={{
              marginTop: 16,
              padding: '12px 14px',
              background: 'var(--parchment)',
              borderRadius: 8,
              border: '1px solid var(--pencil)',
            }}>
              {current.visual}
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 6,
          paddingBottom: 4,
        }}>
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i === step ? 'var(--ink)' : 'var(--pencil)',
                transition: 'all 200ms ease',
              }}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px 20px',
          gap: 12,
        }}>
          {!isFirst ? (
            <button
              className="btn btn-ghost"
              onClick={() => setStep(s => s - 1)}
              style={{ fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ArrowLeft size={14} />
              Back
            </button>
          ) : (
            <button
              className="btn btn-ghost"
              onClick={handleComplete}
              style={{ fontSize: 'var(--text-sm)' }}
            >
              Skip tour
            </button>
          )}

          {isLast ? (
            <button
              className="btn btn-primary"
              onClick={handleComplete}
              style={{ fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              Start Exploring
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => setStep(s => s + 1)}
              style={{ fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {isFirst ? 'Take the Tour' : 'Next'}
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── StarRating ────────────────────────────────────────────────────────────────

function StarRating({ rating }) {
  const filled = Math.floor(rating || 0);
  const hasHalf = (rating || 0) - filled >= 0.5;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const isFilled = i < filled;
        const isHalf = !isFilled && i === filled && hasHalf;
        const clipId = `sc-${i}-${Math.random().toString(36).slice(2, 6)}`;
        return (
          <svg key={i} width={12} height={12} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            {isHalf && (
              <defs>
                <clipPath id={clipId}><rect x="0" y="0" width="12" height="24" /></clipPath>
              </defs>
            )}
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              stroke="var(--pencil)" strokeWidth={1.5} strokeLinejoin="round" fill="none"
            />
            {(isFilled || isHalf) && (
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill="var(--compass-gold)"
                clipPath={isHalf ? `url(#${clipId})` : undefined}
              />
            )}
          </svg>
        );
      })}
    </span>
  );
}

// TopBar is provided by the shared component imported above.

// ── PBL Badge ─────────────────────────────────────────────────────────────────

function PblBadge({ elementKey }) {
  const el = PBL_ELEMENTS[elementKey];
  if (!el) return null;
  return (
    <span
      title={el.description}
      style={{
        padding: '2px 7px',
        borderRadius: 20,
        border: `1px solid ${el.color}`,
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        color: el.color,
        whiteSpace: 'nowrap',
        cursor: 'default',
        letterSpacing: '0.01em',
      }}
    >
      {el.label}
    </span>
  );
}

// ── Quest Card ────────────────────────────────────────────────────────────────

function QuestCard({ template, onPreview }) {
  const navigate = useNavigate();
  const tabColor = getTabColor(template.career_pathway);
  const standardsCount = (template.academic_standards || []).length;
  const kgCount = (template.academic_standards || []).filter(code => resolveStandard(code)?.kg_uuid).length;
  const pblKeys = (template.pbl_elements || []).slice(0, 3);
  const extraPbl = (template.pbl_elements || []).length - pblKeys.length;

  function handleUseQuest(e) {
    e.stopPropagation();
    localStorage.setItem('wayfinder_template', JSON.stringify(template));
    navigate('/quest/new');
  }

  return (
    <div
      className="specimen-card"
      style={{ '--tab-color': tabColor, display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}
    >
      {/* Title + rating */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <h3 style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
          fontSize: 'var(--text-base)',
          color: 'var(--ink)',
          lineHeight: 1.3,
          flex: 1,
        }}>
          {template.title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, paddingTop: 2 }}>
          <StarRating rating={template.rating} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            color: 'var(--compass-gold)',
            fontWeight: 500,
          }}>
            {(template.rating || 0).toFixed(1)}
          </span>
        </div>
      </div>

      {/* Subtitle */}
      {(template.subtitle || template.description) && (
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-sm)',
          color: 'var(--graphite)',
          lineHeight: 1.4,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          flex: '1 1 auto',
        }}>
          {template.subtitle || template.description}
        </p>
      )}

      {/* Interest tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {(template.interest_tags || []).slice(0, 3).map((tag) => (
          <span key={tag} className="skill-tag default">{tag}</span>
        ))}
      </div>

      {/* PBL badges */}
      {pblKeys.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {pblKeys.map(key => <PblBadge key={key} elementKey={key} />)}
          {extraPbl > 0 && (
            <span style={{
              padding: '2px 7px',
              borderRadius: 20,
              border: '1px solid var(--pencil)',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--graphite)',
            }}>
              +{extraPbl} more
            </span>
          )}
        </div>
      )}

      {/* Meta: grade + duration */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-xs)',
        color: 'var(--graphite)',
      }}>
        {template.grade_band && <span>Grade {template.grade_band.replace('-', '–')}</span>}
        {template.total_duration_days && <span>~{template.total_duration_days} days</span>}
      </div>

      {/* Standards + usage */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <BookOpen size={12} color="var(--graphite)" />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            color: 'var(--graphite)',
          }}>
            {standardsCount} standard{standardsCount !== 1 ? 's' : ''}
            {kgCount > 0 && (
              <span style={{
                marginLeft: 5,
                background: 'var(--field-green)',
                color: 'var(--chalk)',
                borderRadius: 3,
                padding: '1px 4px',
                fontSize: 9,
                fontWeight: 600,
              }}>
                {kgCount} KG
              </span>
            )}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Users size={12} color="var(--graphite)" />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            color: 'var(--graphite)',
          }}>
            {template.usage_count ?? 0}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          className="btn btn-ghost"
          onClick={(e) => { e.stopPropagation(); onPreview(template); }}
          style={{ flex: 1, justifyContent: 'center', fontSize: 'var(--text-sm)' }}
        >
          Preview
        </button>
        <button
          className="btn btn-primary"
          onClick={handleUseQuest}
          style={{ flex: 1, justifyContent: 'center', fontSize: 'var(--text-sm)' }}
        >
          Use This Project
        </button>
      </div>
    </div>
  );
}

// ── Preview Modal ─────────────────────────────────────────────────────────────

function PreviewModal({ template, onClose }) {
  const navigate = useNavigate();

  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  function handleUseQuest() {
    localStorage.setItem('wayfinder_template', JSON.stringify(template));
    onClose();
    navigate('/quest/new');
  }

  const STAGE_TYPE_COLORS = {
    research: 'var(--lab-blue)',
    experiment: 'var(--field-green)',
    simulate: 'var(--compass-gold)',
    present: 'var(--specimen-red)',
    reflect: 'var(--graphite)',
  };

  const standardsWithInfo = (template.academic_standards || []).map(code => ({
    code,
    info: resolveStandard(code),
  }));

  const pblCovered = (template.pbl_elements || []).map(k => PBL_ELEMENTS[k]).filter(Boolean);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(26,26,46,0.5)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--chalk)',
          borderRadius: 12,
          width: '100%',
          maxWidth: 680,
          maxHeight: '88vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(26,26,46,0.24)',
        }}
      >
        {/* Modal header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--pencil)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, paddingRight: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              {template.career_pathway && (
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: 'var(--chalk)',
                  background: getTabColor(template.career_pathway),
                  borderRadius: 100, padding: '2px 8px',
                  letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 500,
                }}>
                  {getPathwayLabel(template.career_pathway)}
                </span>
              )}
              {template.grade_band && (
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: 'var(--graphite)',
                  border: '1px solid var(--pencil)', borderRadius: 100, padding: '2px 8px',
                }}>
                  Grade {template.grade_band.replace('-', '–')}
                </span>
              )}
              {template.total_duration_days && (
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: 'var(--graphite)',
                  border: '1px solid var(--pencil)', borderRadius: 100, padding: '2px 8px',
                }}>
                  ~{template.total_duration_days} days
                </span>
              )}
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-xl)',
              color: 'var(--ink)',
              lineHeight: 1.2,
              marginBottom: 4,
            }}>
              {template.title}
            </h2>
            {template.subtitle && (
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color: 'var(--graphite)',
                lineHeight: 1.4,
              }}>
                {template.subtitle}
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
              {(template.interest_tags || []).map(tag => (
                <span key={tag} className="skill-tag default">{tag}</span>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 4, color: 'var(--graphite)',
              display: 'flex', alignItems: 'center', flexShrink: 0,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>

          {/* Narrative hook */}
          {template.narrative_hook && (
            <div style={{
              background: 'var(--parchment)',
              borderLeft: '3px solid var(--compass-gold)',
              borderRadius: '0 6px 6px 0',
              padding: '14px 16px',
              marginBottom: 24,
            }}>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color: 'var(--ink)',
                lineHeight: 1.6,
                fontStyle: 'italic',
              }}>
                {template.narrative_hook}
              </p>
            </div>
          )}

          {/* Stages */}
          {template.stages && template.stages.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <h4 style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                color: 'var(--graphite)', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 12,
              }}>
                Project Stages
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {template.stages.map(stage => (
                  <div key={stage.stage_number} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'var(--parchment)', border: '1px solid var(--pencil)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                      color: 'var(--graphite)', flexShrink: 0, marginTop: 1,
                    }}>
                      {stage.stage_number}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{
                          fontFamily: 'var(--font-body)', fontWeight: 600,
                          fontSize: 'var(--text-sm)', color: 'var(--ink)',
                        }}>
                          {stage.title}
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-mono)', fontSize: 9,
                          color: STAGE_TYPE_COLORS[stage.type] ?? 'var(--graphite)',
                          border: `1px solid ${STAGE_TYPE_COLORS[stage.type] ?? 'var(--graphite)'}`,
                          borderRadius: 100, padding: '1px 7px',
                          textTransform: 'uppercase', letterSpacing: '0.04em', opacity: 0.8,
                        }}>
                          {getStageTypeLabel(stage.type)}
                        </span>
                      </div>
                      <p style={{
                        fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)',
                        color: 'var(--graphite)', lineHeight: 1.5,
                      }}>
                        {stage.description}
                      </p>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--pencil)',
                        marginTop: 3, display: 'block',
                      }}>
                        {stage.duration_days} day{stage.duration_days !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Academic Standards — enriched */}
          {standardsWithInfo.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <h4 style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  Academic Standards
                </h4>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9,
                  background: 'var(--field-green)', color: 'var(--chalk)',
                  borderRadius: 3, padding: '1px 5px', fontWeight: 600,
                }}>
                  Learning Commons KG
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {standardsWithInfo.map(({ code, info }) => (
                  <div
                    key={code}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      padding: '10px 12px',
                      background: 'var(--parchment)',
                      borderRadius: 8,
                      border: '1px solid var(--pencil)',
                    }}
                  >
                    <div style={{ flexShrink: 0, paddingTop: 1 }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--lab-blue)',
                        display: 'block',
                      }}>
                        {code}
                      </span>
                      {info?.kg_uuid && (
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 8,
                          background: 'var(--field-green)',
                          color: 'var(--chalk)',
                          borderRadius: 3,
                          padding: '1px 4px',
                          fontWeight: 600,
                          marginTop: 3,
                          display: 'inline-block',
                        }}>
                          KG verified
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {info ? (
                        <>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 9,
                            color: 'var(--graphite)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            display: 'block',
                            marginBottom: 3,
                          }}>
                            {info.subject} · {info.domain}
                          </span>
                          <p style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--ink)',
                            lineHeight: 1.5,
                          }}>
                            {info.description}
                          </p>
                        </>
                      ) : (
                        <p style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: 'var(--text-xs)',
                          color: 'var(--graphite)',
                        }}>
                          {code}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PBL Elements */}
          {pblCovered.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <h4 style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  PBL Gold Standard Alignment
                </h4>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9,
                  background: 'var(--compass-gold)', color: 'var(--chalk)',
                  borderRadius: 3, padding: '1px 5px', fontWeight: 600,
                }}>
                  BIE
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pblCovered.map(el => (
                  <div
                    key={el.key}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      padding: '8px 12px',
                      borderLeft: `3px solid ${el.color}`,
                      background: 'var(--parchment)',
                      borderRadius: '0 6px 6px 0',
                    }}
                  >
                    <div style={{ flexShrink: 0, paddingTop: 2 }}>
                      <CheckCircle2 size={14} color={el.color} />
                    </div>
                    <div>
                      <span style={{
                        fontFamily: 'var(--font-body)',
                        fontWeight: 600,
                        fontSize: 'var(--text-xs)',
                        color: 'var(--ink)',
                        display: 'block',
                        marginBottom: 2,
                      }}>
                        {el.label}
                      </span>
                      <p style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--graphite)',
                        lineHeight: 1.4,
                      }}>
                        {el.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {(template.pbl_elements || []).length < 7 && (
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 11,
                  color: 'var(--graphite)',
                  marginTop: 10,
                  fontStyle: 'italic',
                }}>
                  This project covers {pblCovered.length} of the 7 BIE Gold Standard PBL elements.
                  The Project Builder lets you incorporate additional elements.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--pencil)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          flexShrink: 0,
        }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: 'var(--text-sm)' }}>
            Close
          </button>
          <button className="btn btn-primary" onClick={handleUseQuest} style={{ fontSize: 'var(--text-sm)' }}>
            Use This Project
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card Skeleton ─────────────────────────────────────────────────────────────

function PulseLine({ width, height, mb = 0 }) {
  return (
    <div style={{
      width, height,
      background: 'var(--pencil)',
      borderRadius: 4, marginBottom: mb,
      animation: 'pulse 1.5s ease-in-out infinite',
      opacity: 0.45,
    }} />
  );
}

function CardSkeleton() {
  return (
    <div style={{
      background: 'var(--parchment)',
      border: '1px solid var(--pencil)',
      borderRadius: 8,
      padding: 'var(--space-6)',
      paddingLeft: 'calc(var(--space-6) + 8px)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: 'var(--pencil)', opacity: 0.5, borderRadius: '8px 0 0 8px',
      }} />
      <PulseLine width="70%" height={16} mb={10} />
      <PulseLine width="95%" height={12} mb={5} />
      <PulseLine width="80%" height={12} mb={16} />
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <PulseLine width={55} height={20} />
        <PulseLine width={55} height={20} />
        <PulseLine width={55} height={20} />
      </div>
      <PulseLine width="50%" height={11} mb={12} />
      <div style={{ display: 'flex', gap: 8 }}>
        <PulseLine width="48%" height={34} />
        <PulseLine width="48%" height={34} />
      </div>
    </div>
  );
}

// ── Filter Bar ────────────────────────────────────────────────────────────────

function FilterBar({ searchQuery, setSearchQuery, selectedPathway, setSelectedPathway, selectedGrade, setSelectedGrade, sortBy, setSortBy, count }) {
  const selectStyle = {
    background: 'var(--chalk)',
    border: '1px solid var(--pencil)',
    borderRadius: 6,
    padding: '7px 12px',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--ink)',
    cursor: 'pointer',
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    paddingRight: 28,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
    backgroundSize: '12px',
  };

  return (
    <div style={{
      background: 'var(--chalk)',
      borderBottom: '1px solid var(--pencil)',
      padding: '12px 24px',
      position: 'sticky',
      top: 56,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1120, margin: '0 auto',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <Search
            size={15}
            color="var(--graphite)"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <input
            type="text"
            placeholder="Search projects, standards, interests…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--chalk)', border: '1px solid var(--pencil)',
              borderRadius: 6, padding: '7px 10px 7px 32px',
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
              color: 'var(--ink)', outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                color: 'var(--graphite)', display: 'flex', alignItems: 'center',
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <select value={selectedPathway} onChange={e => setSelectedPathway(e.target.value)} style={selectStyle}>
          {PATHWAY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)} style={selectStyle}>
          {GRADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selectStyle}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)',
          color: 'var(--graphite)', whiteSpace: 'nowrap', marginLeft: 'auto',
        }}>
          {count} project{count !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}

// ── QuestLibrary ──────────────────────────────────────────────────────────────

export default function QuestLibrary() {
  const { profile, signOut } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [showTour, setShowTour] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPathway, setSelectedPathway] = useState('all');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [sortBy, setSortBy] = useState('popular');

  // Show tour for first-time visitors
  useEffect(() => {
    if (!localStorage.getItem('wayfinder_library_toured')) {
      // Slight delay so the page renders first
      const t = setTimeout(() => setShowTour(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  // Fetch from Supabase, with client-side dedup
  useEffect(() => {
    async function fetchTemplates() {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from('quest_templates')
        .select('*')
        .eq('is_public', true)
        .order('usage_count', { ascending: false });

      if (err) {
        setError(err.message);
        setTemplates(FALLBACK_TEMPLATES);
      } else if (!data || data.length === 0) {
        setTemplates(FALLBACK_TEMPLATES);
      } else {
        // Deduplicate by title (keep first/highest usage_count occurrence)
        const seen = new Set();
        const deduped = data
          .map(normalizeTemplate)
          .filter(t => {
            const key = t.title.toLowerCase().trim();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        setTemplates(deduped.length > 0 ? deduped : FALLBACK_TEMPLATES);
      }

      setLoading(false);
    }

    fetchTemplates();
  }, []);

  const filtered = applyFilters(templates, { searchQuery, selectedPathway, selectedGrade, sortBy });

  function clearFilters() {
    setSearchQuery('');
    setSelectedPathway('all');
    setSelectedGrade('all');
    setSortBy('popular');
  }

  const hasActiveFilters = searchQuery.trim() !== '' || selectedPathway !== 'all' || selectedGrade !== 'all';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.2; }
        }
      `}</style>

      <TopBar />

      {/* Page header */}
      <div style={{
        background: 'var(--chalk)',
        borderBottom: '1px solid var(--pencil)',
        padding: '24px 24px 20px',
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-2xl)',
              color: 'var(--ink)',
              lineHeight: 1.2,
              marginBottom: 6,
            }}>
              Project Library
            </h1>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              color: 'var(--graphite)',
            }}>
              Standards-aligned, project-based learning projects — ready to personalize for your learners.
            </p>
          </div>
          <button
            onClick={() => setShowTour(true)}
            className="btn btn-ghost"
            style={{
              fontSize: 'var(--text-xs)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
            }}
          >
            <MapPin size={13} />
            Tour Guide
          </button>
        </div>
      </div>

      {/* PBL legend strip */}
      <div style={{
        background: 'var(--parchment)',
        borderBottom: '1px solid var(--pencil)',
        padding: '8px 24px',
        overflowX: 'auto',
      }}>
        <div style={{
          maxWidth: 1120, margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: 10,
          whiteSpace: 'nowrap',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: 'var(--graphite)', textTransform: 'uppercase',
            letterSpacing: '0.08em', flexShrink: 0,
          }}>
            BIE Gold Standard PBL:
          </span>
          {Object.values(PBL_ELEMENTS).map(el => (
            <span key={el.key} title={el.description} style={{
              padding: '2px 8px', borderRadius: 20,
              border: `1px solid ${el.color}`,
              fontFamily: 'var(--font-mono)', fontSize: 9,
              color: el.color, cursor: 'default', flexShrink: 0,
            }}>
              {el.label}
            </span>
          ))}
        </div>
      </div>

      <FilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedPathway={selectedPathway}
        setSelectedPathway={setSelectedPathway}
        selectedGrade={selectedGrade}
        setSelectedGrade={setSelectedGrade}
        sortBy={sortBy}
        setSortBy={setSortBy}
        count={filtered.length}
      />

      {/* Main content */}
      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px 48px' }}>
        {/* Error banner */}
        {error && (
          <div style={{
            background: 'rgba(184,134,11,0.08)',
            border: '1px solid rgba(184,134,11,0.25)',
            borderRadius: 8, padding: '10px 16px', marginBottom: 24,
            fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
            color: 'var(--compass-gold)',
          }}>
            Could not connect to the library database. Showing curated project examples.
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <Compass size={44} color="var(--pencil)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
              No projects match your filters.
            </h3>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
              color: 'var(--graphite)', marginBottom: 'var(--space-4)',
            }}>
              Try adjusting your search or clearing the active filters.
            </p>
            {hasActiveFilters && (
              <button className="btn btn-ghost" onClick={clearFilters}>Clear filters</button>
            )}
          </div>
        )}

        {/* Quest grid */}
        {!loading && filtered.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
          }}>
            {filtered.map(template => (
              <QuestCard
                key={template.id}
                template={template}
                onPreview={t => setPreviewTemplate(t)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Preview modal */}
      {previewTemplate && (
        <PreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}

      {/* Walkthrough tour */}
      {showTour && (
        <WalkthroughTour onComplete={() => setShowTour(false)} />
      )}
    </div>
  );
}
