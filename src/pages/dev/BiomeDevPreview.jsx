// Dev-only preview of BiomeScene with mocked quest/stages/teammates.
// Used to iterate on visuals without needing a real DB record.
// Mounted at /dev/biome and /dev/biome/:biomeId in dev only (see App.jsx).
import { useParams } from 'react-router-dom';
import BiomeScene from '../../components/world/BiomeScene';

const MOCK_QUEST = {
  id: 'mock-quest-1',
  title: 'How can our cafeteria reduce food waste?',
  description: 'Investigate where food waste comes from in our school and design a system that measurably reduces it within 4 weeks.',
  driving_question: 'How might we cut cafeteria food waste by half before the term ends?',
  career_pathway: null,
  biome_id: 'campsite',
  character_image_url: null,
};

const MOCK_STAGES = [
  {
    id: 's1', stage_number: 1, title: 'Observe & Map',
    description: 'Spend two lunches counting and weighing what gets thrown out.',
    challenge: 'Produce a one-page map of the trash flow with at least three measurements.',
    deliverable_description: 'Photo + tally sheet.',
    status: 'active',  biomeState: 'active',
  },
  {
    id: 's2', stage_number: 2, title: 'Interview Sources',
    description: 'Talk to lunch staff and three students about why food gets tossed.',
    challenge: 'Find one root cause that surprised you.',
    deliverable_description: 'Two-paragraph interview summary.',
    status: 'locked', biomeState: 'future',
  },
  {
    id: 's3', stage_number: 3, title: 'Prototype a Fix',
    description: 'Pick the smallest intervention that could meaningfully change the metric.',
    challenge: 'Build a paper or physical prototype you can run for one lunch.',
    deliverable_description: 'Prototype + one-week measurement plan.',
    status: 'locked', biomeState: 'future',
  },
];

const MOCK_TEAMMATES = [
  { student_id: 't1', name: 'Maya',   role: 'Lead',     avatar_emoji: null },
  { student_id: 't2', name: 'Jordan', role: 'Research', avatar_emoji: null },
];

const MOCK_FEEDBACK = [];

const MOCK_SESSION = {
  studentId:   'mock-student',
  studentName: 'Alex',
  pin: '0000',
};

export default function BiomeDevPreview() {
  const { biomeId } = useParams();
  // Cabin is a hub (no stages); render it with empty stages and no teammates so the
  // hub-style hotspots shine instead of being crowded out.
  const isCabin = biomeId === 'cabin';
  return (
    <BiomeScene
      quest={MOCK_QUEST}
      stages={isCabin ? [] : MOCK_STAGES}
      studentSession={MOCK_SESSION}
      feedback={MOCK_FEEDBACK}
      teammates={isCabin ? [] : MOCK_TEAMMATES}
      onStageComplete={() => {}}
      forceBiome={biomeId}
    />
  );
}
