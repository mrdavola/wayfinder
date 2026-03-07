import { useMemo } from 'react';
import MapLandmark from './MapLandmark';
import MapPath from './MapPath';
import ExplorerToken from './ExplorerToken';
import FogOverlay from './FogOverlay';

const NODE_SPACING = 140;
const SVG_WIDTH = 400;
const SVG_CENTER_X = SVG_WIDTH / 2;
const OFFSETS = [-50, 50, 0, -50, 50];
const NODE_RADIUS = 28;

function getNodeX(i) { return SVG_CENTER_X + OFFSETS[i % OFFSETS.length]; }
function getNodeY(i) { return 70 + i * NODE_SPACING; }

export default function TreasureMap({
  stages = [],
  landmarks = [],
  activeCard,
  onNodeClick,
  studentName,
  studentEmoji,
  groupMembers = [],
  recentlyCompleted,
}) {
  const landmarkMap = useMemo(() => {
    const m = {};
    landmarks.forEach(l => { m[l.stage_id || l.stage_number] = l; });
    return m;
  }, [landmarks]);

  const svgHeight = stages.length * NODE_SPACING + 100;
  const activeStageIndex = stages.findIndex(s => s.status === 'active');

  return (
    <svg width={SVG_WIDTH} height={svgHeight} viewBox={`0 0 ${SVG_WIDTH} ${svgHeight}`}
      style={{ overflow: 'visible', maxWidth: '100%' }}>

      {stages.map((stage, i) => {
        if (i === 0) return null;
        const prev = stages[i - 1];
        return (
          <MapPath
            key={`path-${i}`}
            x1={getNodeX(i - 1)} y1={getNodeY(i - 1) + NODE_RADIUS}
            x2={getNodeX(i)} y2={getNodeY(i) - NODE_RADIUS}
            status={prev.status === 'completed' ? 'completed' : 'locked'}
            animated={recentlyCompleted === prev.id}
          />
        );
      })}

      {stages.map((stage, i) => (
        stage.status === 'locked' && (
          <FogOverlay
            key={`fog-${stage.id}`}
            cx={getNodeX(i)} cy={getNodeY(i)}
            radius={60}
            clearing={false}
          />
        )
      ))}

      {stages.map((stage, i) => (
        <MapLandmark
          key={stage.id}
          cx={getNodeX(i)} cy={getNodeY(i)}
          stage={stage}
          landmark={landmarkMap[stage.id] || landmarkMap[stage.stage_number]}
          isSelected={activeCard === stage.id}
          isActive={stage.status === 'active'}
          onClick={() => onNodeClick?.(stage.id)}
        />
      ))}

      {activeStageIndex >= 0 && (
        <ExplorerToken
          cx={getNodeX(activeStageIndex) + NODE_RADIUS + 20}
          cy={getNodeY(activeStageIndex)}
          emoji={studentEmoji}
          name={studentName}
        />
      )}

      {groupMembers.map((member, idx) => {
        const memberStageIdx = stages.findIndex(s => s.id === member.current_stage_id);
        if (memberStageIdx < 0) return null;
        return (
          <ExplorerToken
            key={member.student_id}
            cx={getNodeX(memberStageIdx) - NODE_RADIUS - 20 - (idx * 18)}
            cy={getNodeY(memberStageIdx) + 8}
            emoji={member.avatar_emoji}
            name={member.name}
          />
        );
      })}
    </svg>
  );
}