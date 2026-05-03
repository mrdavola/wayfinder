import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import './BiomeScene.css';
import { getBiome } from '../../biomes';
import { suggestBiome } from '../../biomes/suggest';
import ParallaxScene from './ParallaxScene';
import Hotspot from './Hotspot';
import AmbientLayer from './AmbientLayer';
import HotspotOverlay from './HotspotOverlay';
import SceneHeader from './SceneHeader';
import SceneFigure from './SceneFigure';
import TrailPath from './TrailPath';
import { WorldStateProvider, useWorldState } from './WorldStateContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { computeTeammatePositions } from '../../lib/teammatePositions';

const ROLE_LABELS = {
  trailheadSign:  'Project sign',
  stage:          'Stage',
  guide:          'Field Guide',
  bulletinSubmit: 'Submit work',
  mailbox:        'Mailbox',
  challenger:     'A stranger',
  reflection:     'Reflect',
  stretch:        'Stretch challenge',
  teammate:       'Teammate',
  parentLetter:   'Letter from home',
  wallMap:        'Field map',
  specimenCabinet:'Cabinet',
  bulletinBoard:  'Bulletin board',
};

const OUTFIT_BY_BIOME = {
  campsite: 'field',
  lab:      'lab',
  workshop: 'workshop',
  cabin:    'field',
};

const VALID_BIOMES = new Set(['campsite', 'lab', 'workshop', 'cabin']);

function resolveHotspots(configHotspots, stages) {
  return configHotspots.map((h, i) => {
    let state = 'active';
    let stageData = null;
    if (h.role === 'stage') {
      stageData = stages[h.stageIndex] ?? null;
      state = stageData ? stageData.biomeState : 'future';
    }
    return { ...h, configIndex: i, state, stageData };
  });
}

function computeProgress(stages) {
  const total = stages.length;
  const completed = stages.filter(s => s.biomeState === 'completed').length;
  return { completed, total };
}

function findCurrentStageHotspot(resolved) {
  // The "current" stage is the first active stage; if none, the first future stage.
  const active = resolved.find(h => h.role === 'stage' && h.state === 'active');
  if (active) return active;
  const future = resolved.find(h => h.role === 'stage' && h.state === 'future');
  if (future) return future;
  // All completed — stand at the last stage
  const lastStage = [...resolved].reverse().find(h => h.role === 'stage');
  return lastStage || null;
}

function pctOffset(value, deltaPct) {
  // Add or subtract a percentage from a percent string ("54%" + 8 → "calc(54% + 8%)")
  if (deltaPct === 0) return value;
  const sign = deltaPct >= 0 ? '+' : '-';
  return `calc(${value} ${sign} ${Math.abs(deltaPct)}%)`;
}

function SceneInner({ quest, stages, studentSession, onStageComplete, feedback, teammates = [], forceBiome }) {
  // Resolve which biome to render. Explicit `forceBiome` (dev previews, story tooling) wins.
  const resolvedBiomeId =
    (forceBiome && VALID_BIOMES.has(forceBiome)) ? forceBiome : suggestBiome(quest);
  const cfg = getBiome(resolvedBiomeId) ?? getBiome('campsite');
  const isIndoor = cfg.id === 'lab' || cfg.id === 'workshop' || cfg.id === 'cabin';

  const systemReduced = useReducedMotion();
  const { zoomedHotspot, zoomTo, zoomOut } = useWorldState();
  const [igniting, setIgniting] = useState(null);
  const igniteTimer = useRef(null);

  const resolved = useMemo(
    () => resolveHotspots(cfg.hotspots, stages),
    [cfg.hotspots, stages]
  );

  const teammateHotspots = useMemo(() => {
    const positions = computeTeammatePositions(teammates.length);
    return teammates.map((tm, i) => ({
      role: 'teammate',
      x: positions[i]?.x ?? '60%',
      y: positions[i]?.y ?? '74%',
      configIndex: resolved.length + i,
      state: 'active',
      stageData: null,
      label: tm.name || 'Teammate',
      teammateData: tm,
    }));
  }, [resolved.length, teammates]);

  const allHotspots = useMemo(
    () => [...resolved, ...teammateHotspots],
    [resolved, teammateHotspots]
  );

  useEffect(() => () => clearTimeout(igniteTimer.current), []);

  const activeHotspot = allHotspots.find(h => zoomedHotspot === `${h.role}-${h.configIndex}`);
  const guideHotspot  = resolved.find(h => h.role === 'guide');
  const stageWaypoints = useMemo(
    () => resolved.filter(h => h.role === 'stage'),
    [resolved]
  );
  const currentStage = findCurrentStageHotspot(resolved);
  const progress = useMemo(() => computeProgress(stages), [stages]);

  const handleActivate = useCallback((h) => {
    zoomTo(`${h.role}-${h.configIndex}`);
  }, [zoomTo]);

  const handleStageComplete = useCallback((stageId) => {
    const completedIdx = resolved.findIndex(h => h.role === 'stage' && h.stageData?.id === stageId);
    if (completedIdx >= 0) {
      const nextStageH = resolved.find((h, i) => i > completedIdx && h.role === 'stage' && h.state === 'future');
      if (nextStageH) {
        setIgniting(nextStageH.configIndex);
        igniteTimer.current = setTimeout(() => setIgniting(null), 800);
      }
    }
    onStageComplete?.(stageId);
    zoomOut();
  }, [resolved, onStageComplete, zoomOut]);

  const handleExitToList = useCallback(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'list');
    window.location.href = url.toString();
  }, []);

  const guideOutfit = OUTFIT_BY_BIOME[cfg.id] ?? 'field';

  // Player stands BESIDE the current stage cairn — offset by ~6% so the cairn stays visible.
  // Choose a side based on stage index parity to avoid a column of figures stacking up.
  const playerX = currentStage
    ? pctOffset(currentStage.x, currentStage.stageData?.stage_number % 2 === 0 ? 6 : -6)
    : '50%';
  const playerY = currentStage
    ? pctOffset(currentStage.y, 8)
    : '70%';

  return (
    <div className="biome-scene" data-biome={cfg.id}>
      <ParallaxScene layers={cfg.layers} calmMode={systemReduced}>
        <AmbientLayer ambient={cfg.ambient} calmMode={systemReduced} />

        {/* Visible trail connecting stage waypoints, biased to skim the cairn bases */}
        {stageWaypoints.length >= 2 && (
          <TrailPath
            waypoints={stageWaypoints.map(s => ({ x: s.x, y: s.y, state: s.state }))}
            style={isIndoor ? 'indoor' : 'outdoor'}
            yOffsetPct={6}
          />
        )}

        {/* Field Guide NPC — clickable figure standing in the scene */}
        {guideHotspot && (
          <SceneFigure
            x={guideHotspot.x}
            y={guideHotspot.y}
            imageUrl={quest?.character_image_url || null}
            name="Field Guide"
            role="guide"
            figureProps={{ skinTone: 'medium', hairTone: 'dark', outfit: guideOutfit, mood: 'happy' }}
            ariaLabel="Talk to your field guide"
            figureLabel="Your field guide"
            onClick={() => handleActivate(guideHotspot)}
          />
        )}

        {/* Player avatar standing beside the current stage cairn */}
        {currentStage && (
          <SceneFigure
            x={playerX}
            y={playerY}
            name={studentSession?.studentName || 'You'}
            role="player"
            size={60}
            figureProps={{
              skinTone: studentSession?.skinTone || 'medium',
              hairTone: studentSession?.hairTone || 'auburn',
              outfit: 'field',
              mood: 'curious',
            }}
          />
        )}

        {/* All interactive hotspots — guide handled separately above */}
        {allHotspots
          .filter(h => h.role !== 'guide')
          .map((h) => (
            <Hotspot
              key={`${h.role}-${h.configIndex}`}
              id={`${h.role}-${h.configIndex}`}
              role={h.role}
              x={h.x}
              y={h.y}
              label={h.label ?? (h.role === 'stage' && h.stageData
                ? `Stage ${h.stageData.stage_number}: ${h.stageData.title}`
                : ROLE_LABELS[h.role] ?? h.role)}
              sceneTitle={quest?.title}
              stageNumber={h.stageData?.stage_number ?? (h.role === 'stage' ? h.stageIndex + 1 : undefined)}
              teammate={h.teammateData}
              biomeId={cfg.id}
              state={h.state}
              igniting={igniting === h.configIndex}
              onActivate={() => handleActivate(h)}
            />
        ))}
      </ParallaxScene>

      <SceneHeader
        quest={quest}
        progress={progress}
        onExit={handleExitToList}
      />

      {activeHotspot && (
        <HotspotOverlay
          role={activeHotspot.role}
          quest={quest}
          stage={activeHotspot.stageData}
          studentSession={studentSession}
          feedback={feedback}
          teammate={activeHotspot.teammateData ?? null}
          onClose={zoomOut}
          onStageComplete={handleStageComplete}
        />
      )}
    </div>
  );
}

export default function BiomeScene({
  quest,
  stages,
  studentSession,
  feedback = [],
  teammates = [],
  onStageComplete,
  forceBiome,
}) {
  return (
    <WorldStateProvider>
      <SceneInner
        quest={quest}
        stages={stages}
        studentSession={studentSession}
        feedback={feedback}
        teammates={teammates}
        onStageComplete={onStageComplete}
        forceBiome={forceBiome}
      />
    </WorldStateProvider>
  );
}
