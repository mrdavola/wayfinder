import { useMemo } from 'react';

const NODE_W = 140;
const NODE_H = 50;
const V_GAP = 100;
const H_GAP = 180;

// Layout algorithm: assign x,y coordinates to each stage in a tree
function layoutTree(stages, branches, studentChoices) {
  const stageMap = {};
  stages.forEach(s => { stageMap[s.id] = { ...s, children: [], x: 0, y: 0, depth: 0, reachable: false }; });

  // Build adjacency from branches
  const branchMap = {}; // parentStageId → [{branch_index, next_stage_id, label}]
  branches.forEach(b => {
    if (!branchMap[b.stage_id]) branchMap[b.stage_id] = [];
    branchMap[b.stage_id].push(b);
  });

  // Mark reachable stages based on student choices
  const choiceMap = {};
  studentChoices.forEach(c => { choiceMap[c.stage_id] = c.chosen_branch_index; });

  // BFS from first stage
  const firstStage = stages.find(s => s.stage_number === 1) || stages[0];
  if (!firstStage) return { nodes: [], maxDepth: 0, branchMap };

  const queue = [{ id: firstStage.id, depth: 0, xOffset: 0 }];
  const visited = new Set();
  const nodes = [];
  let maxDepth = 0;

  while (queue.length > 0) {
    const { id, depth, xOffset } = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);

    const stage = stageMap[id];
    if (!stage) continue;

    stage.depth = depth;
    stage.x = 400 + xOffset;
    stage.y = 60 + depth * V_GAP;
    stage.reachable = true;
    maxDepth = Math.max(maxDepth, depth);
    nodes.push(stage);

    const stageBranches = branchMap[id];
    if (stageBranches?.length > 0) {
      // This is a branch point
      const chosen = choiceMap[id];
      const spread = (stageBranches.length - 1) * H_GAP / 2;
      stageBranches.forEach((b, i) => {
        if (b.next_stage_id) {
          const branchX = xOffset + (i * H_GAP) - spread;
          const isChosen = chosen === b.branch_index;
          if (stageMap[b.next_stage_id]) {
            stageMap[b.next_stage_id].reachable = isChosen || chosen === undefined;
            stageMap[b.next_stage_id]._branchLabel = b.branch_label;
            stageMap[b.next_stage_id]._fromBranch = { parentId: id, index: i, chosen: isChosen };
          }
          queue.push({ id: b.next_stage_id, depth: depth + 1, xOffset: branchX });
        }
      });
    } else {
      // Linear: find next stage by stage_number
      const nextStage = stages.find(s => s.stage_number === stage.stage_number + 1 && !visited.has(s.id));
      if (nextStage) {
        queue.push({ id: nextStage.id, depth: depth + 1, xOffset });
      }
    }
  }

  return { nodes, maxDepth, branchMap };
}

export default function BranchingMap({ stages, branches, studentChoices, landmarks, activeStageId, onStageClick }) {
  const { nodes, maxDepth, branchMap } = useMemo(
    () => layoutTree(stages || [], branches || [], studentChoices || []),
    [stages, branches, studentChoices]
  );

  const svgHeight = (maxDepth + 1) * V_GAP + 120;

  return (
    <svg viewBox={`0 0 800 ${svgHeight}`} style={{ width: '100%', height: 'auto' }}>
      <rect x="0" y="0" width="800" height={svgHeight} fill="rgba(27,73,101,0.03)" rx="12" />

      {/* Edges */}
      {nodes.map(node => {
        const nodeBranches = (branchMap || {})[node.id];
        if (nodeBranches?.length > 0) {
          return nodeBranches.map((b, i) => {
            const target = nodes.find(n => n.id === b.next_stage_id);
            if (!target) return null;
            return (
              <g key={`${node.id}-${i}`}>
                <line x1={node.x} y1={node.y + NODE_H / 2} x2={target.x} y2={target.y - NODE_H / 2}
                  stroke={target.reachable ? 'var(--compass-gold)' : 'var(--pencil)'}
                  strokeWidth={target.reachable ? 2 : 1}
                  strokeDasharray={target.reachable ? 'none' : '4 4'}
                  opacity={target.reachable ? 1 : 0.3}
                />
                {/* Branch label */}
                <text
                  x={(node.x + target.x) / 2}
                  y={(node.y + NODE_H / 2 + target.y - NODE_H / 2) / 2}
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
        const nextNode = nodes.find(n => n.depth === node.depth + 1 && Math.abs(n.x - node.x) < H_GAP / 2);
        if (!nextNode || (branchMap || {})[node.id]) return null;
        return (
          <line key={`${node.id}-next`}
            x1={node.x} y1={node.y + NODE_H / 2}
            x2={nextNode.x} y2={nextNode.y - NODE_H / 2}
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
              {node.title?.length > 18 ? node.title.slice(0, 16) + '...' : node.title}
            </text>
            {/* Stage type */}
            <text x={node.x} y={node.y + 10} textAnchor="middle"
              fontSize="8" fill={isActive || isCompleted ? 'rgba(255,255,255,0.7)' : 'var(--graphite)'}
              fontFamily="var(--font-mono)">
              {node.stage_type}
            </text>
            {/* Landmark emoji */}
            {landmark && (
              <text x={node.x + NODE_W / 2 - 8} y={node.y - NODE_H / 2 + 14}
                fontSize="14" textAnchor="middle">
                {landmark.landmark_type === 'cave' ? '\u{1F573}\uFE0F' : landmark.landmark_type === 'lighthouse' ? '\u{1F5FC}' : '\u{1F3D4}\uFE0F'}
              </text>
            )}
            {/* Fog for unreachable */}
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
  );
}
