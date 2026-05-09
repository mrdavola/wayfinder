import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ImmersiveWorldView from '../../components/immersive/ImmersiveWorldView';

const DEFAULT_PANORAMA = 'https://threejs.org/examples/textures/2294472375_24a3b8ef46_o.jpg';

const SAMPLE_STAGES = [
  {
    id: 's1',
    stage_number: 1,
    title: 'Notice the Pattern',
    description: 'Look around. What do you see repeating in this place?',
    status: 'active',
    deliverable: 'Write down three things that catch your eye.',
    guiding_questions: [
      'What stands out at first glance?',
      'What repeats?',
      'What feels out of place?',
    ],
  },
  {
    id: 's2',
    stage_number: 2,
    title: 'Form a Question',
    description: 'Turn what you noticed into a question worth investigating.',
    status: 'locked',
    guiding_questions: ['What surprised you?', 'What would you change?'],
  },
  {
    id: 's3',
    stage_number: 3,
    title: 'Test an Idea',
    description: 'Pick one prediction and design a way to check it.',
    status: 'locked',
  },
  {
    id: 's4',
    stage_number: 4,
    title: 'Share What You Found',
    description: 'Tell someone what you learned and what surprised you.',
    status: 'completed',
  },
];

const SAMPLE_HOTSPOTS = [
  { stage_number: 1, position: { yaw: -30, pitch: -5 }, label: 'Notice the Pattern', icon: 'search' },
  { stage_number: 2, position: { yaw: 60, pitch: 0 }, label: 'Form a Question', icon: 'lightbulb' },
  { stage_number: 3, position: { yaw: 150, pitch: -10 }, label: 'Test an Idea', icon: 'flask' },
  { stage_number: 4, position: { yaw: -120, pitch: 5 }, label: 'Share What You Found', icon: 'mic' },
];

export default function WorldDemo() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sceneUrl = params.get('img') || DEFAULT_PANORAMA;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [submissions, setSubmissions] = useState({});

  return (
    <ImmersiveWorldView
      sceneUrl={sceneUrl}
      hotspots={SAMPLE_HOTSPOTS}
      stages={SAMPLE_STAGES}
      activeStageId="s1"
      onStageSelect={() => {}}
      onSubmit={(stageId, text) => setSubmissions((s) => ({ ...s, [stageId]: text }))}
      onExit={() => navigate('/')}
      onGoToStage={(id) => window.alert(`Demo only — would navigate to stage ${id}`)}
      isMobile={isMobile}
      studentName="Demo Explorer"
      questId="demo"
      xp={120}
      submissions={submissions}
    />
  );
}
