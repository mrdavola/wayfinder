import { ai, explorations } from './api';
import { findYouTubeVideos, findTrustedSources, validateResources } from './perplexity';

export async function generateExploration({ studentId, skillName, skillId, level, studentAge, studentInterests }) {
  // 1. Create exploration record
  const { data: exploration, error } = await explorations.create({ studentId, skillName, skillId });
  if (error || !exploration) throw new Error('Failed to create exploration: ' + (error?.message || 'unknown'));

  // 2. Generate tree via AI
  const tree = await ai.generateExplorationTree({ skillName, level, studentAge, studentInterests });
  if (!tree?.nodes?.length) throw new Error('AI failed to generate exploration tree');

  // 3. Enrich each node with videos + resources (in parallel)
  const enrichedNodes = await Promise.all(
    tree.nodes.map(async (node) => {
      const [videos, sources] = await Promise.all([
        findYouTubeVideos(node.video_search_query || node.title, level, 1).catch(() => []),
        findTrustedSources(node.title, level, 3).catch(() => []),
      ]);

      const allResources = sources.map(s => ({ ...s, type: s.type || 'article' }));
      const validated = await validateResources(allResources).catch(() => allResources);

      return {
        ...node,
        video_url: videos[0]?.url || null,
        video_title: videos[0]?.title || null,
        resources: validated.filter(r => r.verified !== false),
      };
    })
  );

  // 4. Compute layout positions
  const childrenByParent = {};
  enrichedNodes.forEach(n => {
    const pid = n.parent_id === null ? 'root' : n.parent_id;
    if (!childrenByParent[pid]) childrenByParent[pid] = [];
    childrenByParent[pid].push(n);
  });

  const rootX = 300, rootY = 50, levelSpacing = 110, siblingSpacing = 150;

  function assignPositions(nodeId, x, y) {
    const children = childrenByParent[nodeId] || [];
    const totalWidth = Math.max(0, (children.length - 1) * siblingSpacing);
    children.forEach((child, i) => {
      child._x = x - totalWidth / 2 + i * siblingSpacing;
      child._y = y + levelSpacing;
      assignPositions(child.id, child._x, child._y);
    });
  }

  const root = enrichedNodes.find(n => n.parent_id === null);
  if (root) {
    root._x = rootX;
    root._y = rootY;
    assignPositions(root.id, rootX, rootY);
  }

  // 5. Insert nodes sequentially (resolve numeric parent IDs → UUIDs)
  const sorted = [...enrichedNodes].sort((a, b) => {
    if (a.parent_id === null) return -1;
    if (b.parent_id === null) return 1;
    return (a.sort_order || 0) - (b.sort_order || 0);
  });

  const nodeIdMap = {}; // AI numeric id → DB UUID

  for (const node of sorted) {
    const parentUUID = node.parent_id != null ? nodeIdMap[node.parent_id] : null;
    const { data: inserted } = await explorations.createNodes([{
      exploration_id: exploration.id,
      parent_node_id: parentUUID || null,
      title: node.title,
      description: node.description,
      node_type: node.parent_id === null ? 'root' : 'skill',
      status: node.parent_id === null ? 'active' : 'locked',
      one_pager: node.one_pager,
      video_url: node.video_url,
      video_title: node.video_title,
      action_item: node.action_item,
      resources: node.resources || [],
      x: node._x || 0,
      y: node._y || 0,
      sort_order: node.sort_order || 0,
    }]);

    if (inserted?.[0]) {
      nodeIdMap[node.id] = inserted[0].id;
    }
  }

  // 6. Return exploration ID
  return exploration.id;
}
