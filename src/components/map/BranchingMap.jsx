import { useMemo, useRef, useEffect } from 'react';

const NODE_W = 120;
const NODE_H = 44;
const H_GAP = 160;
const V_GAP = 80;

// Layout algorithm: assign x,y coordinates to each stage in a horizontal tree
function layoutTree(stages, branches, studentChoices) {
  const stageMap = {};
  stages.forEach(s => { stageMap[s.id] = { ...s, children: [], x: 0, y: 0, depth: 0, reachable: false }; });

  const branchMap = {};
  branches.forEach(b => {
    if (!branchMap[b.stage_id]) branchMap[b.stage_id] = [];
    branchMap[b.stage_id].push(b);
  });

  const choiceMap = {};
  studentChoices.forEach(c => { choiceMap[c.stage_id] = c.chosen_branch_index; });

  const firstStage = stages.find(s => s.stage_number === 1) || stages[0];
  if (!firstStage) return { nodes: [], maxDepth: 0, maxSpread: 0, branchMap };

  const queue = [{ id: firstStage.id, depth: 0, yOffset: 0 }];
  const visited = new Set();
  const nodes = [];
  let maxDepth = 0;
  let maxSpread = 0;

  while (queue.length > 0) {
    const { id, depth, yOffset } = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);

    const stage = stageMap[id];
    if (!stage) continue;

    stage.depth = depth;
    stage.x = 80 + depth * H_GAP;
    stage.y = 300 + yOffset;
    stage.reachable = true;
    maxDepth = Math.max(maxDepth, depth);
    maxSpread = Math.max(maxSpread, Math.abs(yOffset));
    nodes.push(stage);

    const stageBranches = branchMap[id];
    if (stageBranches?.length > 0) {
      const chosen = choiceMap[id];
      const spread = (stageBranches.length - 1) * V_GAP / 2;
      stageBranches.forEach((b, i) => {
        if (b.next_stage_id) {
          const branchY = yOffset + (i * V_GAP) - spread;
          const isChosen = chosen === b.branch_index;
          if (stageMap[b.next_stage_id]) {
            stageMap[b.next_stage_id].reachable = isChosen || chosen === undefined;
            stageMap[b.next_stage_id]._branchLabel = b.branch_label;
            stageMap[b.next_stage_id]._fromBranch = { parentId: id, index: i, chosen: isChosen };
          }
          queue.push({ id: b.next_stage_id, depth: depth + 1, yOffset: branchY });
        }
      });
    } else {
      const nextStage = stages.find(s => s.stage_number === stage.stage_number + 1 && !visited.has(s.id));
      if (nextStage) {
        queue.push({ id: nextStage.id, depth: depth + 1, yOffset });
      }
    }
  }

  return { nodes, maxDepth, maxSpread, branchMap };
}

export default function BranchingMap({ stages, branches, studentChoices, landmarks, activeStageId, onStageClick }) {
  const scrollRef = useRef(null);
  const { nodes, maxDepth, maxSpread, branchMap } = useMemo(
    () => layoutTree(stages || [], branches || [], studentChoices || []),
    [stages, branches, studentChoices]
  );

  const svgWidth = (maxDepth + 1) * H_GAP + 160;
  const svgHeight = Math.max(200, maxSpread * 2 + 200);

  // Auto-scroll to active stage
  useEffect(() => {
    const activeNode = nodes.find(n => n.id === activeStageId);
    if (activeNode && scrollRef.current) {
      const targetX = activeNode.x - scrollRef.current.clientWidth / 2;
      scrollRef.current.scrollTo({ left: Math.max(0, targetX), behavior: 'smooth' });
    }
  }, [activeStageId, nodes]);

  return (
    <div
      ref={scrollRef}
      style={{
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollSnapType: 'x proximity',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'thin',
        borderRadius: 12,
        background: 'rgba(27,73,101,0.03)',
        padding: '4px 0',
      }}
    >
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ width: svgWidth, height: svgHeight, display: 'block', minWidth: svgWidth }}
      >
        {/* Edges */}
        {nodes.map(node => {
          const nodeBranches = (branchMap || {})[node.id];
          if (nodeBranches?.length > 0) {
            return nodeBranches.map((b, i) => {
              const target = nodes.find(n => n.id === b.next_stage_id);
              if (!target) return null;
              return (
                <g key={`${node.id}-${i}`}>
                  <line
                    x1={node.x + NODE_W / 2} y1={node.y}
                    x2={target.x - NODE_W / 2} y2={target.y}
                    stroke={target.reachable ? 'var(--compass-gold)' : 'var(--pencil)'}
                    strokeWidth={target.reachable ? 2 : 1}
                    strokeDasharray={target.reachable ? 'none' : '4 4'}
                    opacity={target.reachable ? 1 : 0.3}
                  />
                  {/* Branch label */}
                  <text
                    x={(node.x + NODE_W / 2 + target.x - NODE_W / 2) / 2}
                    y={(node.y + target.y) / 2 - 6}
                    textAnchor="middle" fontSize="8" fill="var(--graphite)"
                    fontFamily="var(--font-body)" fontStyle="italic"
                  >
                    {b.branch_label}
                  </text>
                </g>
              );
            });
          }
          // Linear edge to next
          const nextNode = nodes.find(n => n.depth === node.depth + 1 && Math.abs(n.y - node.y) < V_GAP / 2);
          if (!nextNode || (branchMap || {})[node.id]) return null;
          return (
            <line key={`${node.id}-next`}
              x1={node.x + NODE_W / 2} y1={node.y}
              x2={nextNode.x - NODE_W / 2} y2={nextNode.y}
              stroke={nextNode.reachable ? 'var(--compass-gold)' : 'var(--pencil)'}
              strokeWidth={nextNode.reachable ? 2 : 1}
              opacity={nextNode.reachable ? 1 : 0.3}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const isActive = node.id === activeStageId;
          const isCompleted = node.status === 'completed';
          const landmark = landmarks?.find(l => l.stage_id === node.id);
          const opacity = node.reachable ? 1 : 0.3;

          return (
            <g key={node.id} style={{ cursor: 'pointer', opacity }} onClick={() => onStageClick?.(node)}>
              {/* Active pulse */}
              {isActive && (
                <rect
                  x={node.x - NODE_W / 2 - 4} y={node.y - NODE_H / 2 - 4}
                  width={NODE_W + 8} height={NODE_H + 8} rx="14"
                  fill="none" stroke="var(--compass-gold)" strokeWidth={1.5} opacity={0.4}
                >
                  <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
                </rect>
              )}
              <rect x={node.x - NODE_W / 2} y={node.y - NODE_H / 2}
                width={NODE_W} height={NODE_H} rx="10"
                fill={isActive ? 'var(--compass-gold)' : isCompleted ? 'var(--field-green)' : 'var(--chalk)'}
                stroke={isActive ? 'var(--ink)' : 'var(--pencil)'}
                strokeWidth={isActive ? 2 : 1}
              />
              {/* Stage title */}
              <text x={node.x} y={node.y - 4} textAnchor="middle"
                fontSize="10" fontWeight="600"
                fill={isActive || isCompleted ? 'white' : 'var(--ink)'}
                fontFamily="var(--font-body)">
                {node.title?.length > 16 ? node.title.slice(0, 14) + '...' : node.title}
              </text>
              {/* Stage type */}
              <text x={node.x} y={node.y + 10} textAnchor="middle"
                fontSize="8" fill={isActive || isCompleted ? 'rgba(255,255,255,0.7)' : 'var(--graphite)'}
                fontFamily="var(--font-mono)">
                {node.stage_type}
              </text>
              {/* Completed checkmark */}
              {isCompleted && (
                <g>
                  <circle cx={node.x + NODE_W / 2 - 6} cy={node.y - NODE_H / 2 + 6} r={7}
                    fill="var(--field-green)" stroke="var(--chalk)" strokeWidth={1.5} />
                  <text x={node.x + NODE_W / 2 - 6} y={node.y - NODE_H / 2 + 10}
                    textAnchor="middle" fontSize={9} fill="var(--chalk)">✓</text>
                </g>
              )}
              {/* Landmark emoji */}
              {landmark && (
                <text x={node.x - NODE_W / 2 + 10} y={node.y - NODE_H / 2 + 12}
                  fontSize="12" textAnchor="middle">
                  {landmark.landmark_type === 'cave' ? '\u{1F573}\uFE0F' : landmark.landmark_type === 'lighthouse' ? '\u{1F5FC}' : '\u{1F3D4}\uFE0F'}
                </text>
              )}
              {/* Fog overlay for unreachable */}
              {!node.reachable && (
                <rect x={node.x - NODE_W / 2} y={node.y - NODE_H / 2}
                  width={NODE_W} height={NODE_H} rx="10"
                  fill="var(--parchment)" opacity="0.6"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
