import { useState, useCallback } from 'react';
import './BiomeScene.css';
import { getBiome } from '../../biomes';
import ParallaxScene from './ParallaxScene';
import Hotspot from './Hotspot';
import AmbientLayer from './AmbientLayer';
import FieldFigure from './FieldFigure';
import HotspotOverlay from './HotspotOverlay';
import { WorldStateProvider, useWorldState } from './WorldStateContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const ROLE_LABELS = {
  trailheadSign:  'Driving question — tap to read',
  stage:          'Stage',
  guide:          'Talk to your field guide',
  bulletinSubmit: 'Submit your work here',
  mailbox:        'Check your mailbox',
  challenger:     'A stranger approaches',
  reflection:     'Open your reflection journal',
  stretch:        'Side trail — stretch challenge',
  teammate:       'Teammate',
  parentLetter:   'Letter from home',
};

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

function SceneInner({ quest, stages, studentSession, onStageComplete, feedback }) {
  const cfg = getBiome(quest?.biome_id || 'campsite') ?? getBiome('campsite');
  const systemReduced = useReducedMotion();
  const { zoomedHotspot, zoomTo, zoomOut } = useWorldState();
  const [igniting, setIgniting] = useState(null);

  const resolved = resolveHotspots(cfg.hotspots, stages);
  const activeHotspot = resolved.find(h => zoomedHotspot === `${h.role}-${h.configIndex}`);
  const guideHotspot = cfg.hotspots.find(h => h.role === 'guide');

  const handleActivate = useCallback((h) => {
    zoomTo(`${h.role}-${h.configIndex}`);
  }, [zoomTo]);

  const handleStageComplete = useCallback((stageId) => {
    const completedIdx = resolved.findIndex(h => h.role === 'stage' && h.stageData?.id === stageId);
    if (completedIdx >= 0) {
      const nextStageH = resolved.find((h, i) => i > completedIdx && h.role === 'stage' && h.state === 'future');
      if (nextStageH) {
        setIgniting(nextStageH.configIndex);
        setTimeout(() => setIgniting(null), 800);
      }
    }
    onStageComplete?.(stageId);
    zoomOut();
  }, [resolved, onStageComplete, zoomOut]);

  return (
    <div className="biome-scene">
      <ParallaxScene layers={cfg.layers} calmMode={systemReduced}>
        <AmbientLayer ambient={cfg.ambient} calmMode={systemReduced} />

        {guideHotspot && (
          <div
            className="biome-scene__figure"
            style={{ left: guideHotspot.x, top: guideHotspot.y }}
            aria-hidden="true"
          >
            <FieldFigure
              skinTone="medium"
              hairTone="dark"
              outfit="field"
              mood="happy"
              size={72}
              label="Your field guide"
            />
          </div>
        )}

        {resolved.map((h) => (
          <Hotspot
            key={`${h.role}-${h.configIndex}`}
            id={`${h.role}-${h.configIndex}`}
            role={h.role}
            x={h.x}
            y={h.y}
            label={h.role === 'stage' && h.stageData ? h.stageData.title : ROLE_LABELS[h.role] ?? h.role}
            state={h.state}
            igniting={igniting === h.configIndex}
            onActivate={() => handleActivate(h)}
          />
        ))}
      </ParallaxScene>

      {activeHotspot && (
        <HotspotOverlay
          role={activeHotspot.role}
          quest={quest}
          stage={activeHotspot.stageData}
          studentSession={studentSession}
          feedback={feedback}
          onClose={zoomOut}
          onStageComplete={handleStageComplete}
        />
      )}
    </div>
  );
}

export default function BiomeScene({ quest, stages, studentSession, feedback = [], onStageComplete }) {
  return (
    <WorldStateProvider>
      <SceneInner
        quest={quest}
        stages={stages}
        studentSession={studentSession}
        feedback={feedback}
        onStageComplete={onStageComplete}
      />
    </WorldStateProvider>
  );
}
