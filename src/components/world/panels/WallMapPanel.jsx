import { Link } from 'react-router-dom';

const BIOME_LABELS = { campsite: 'Campsite', lab: 'Lab', workshop: 'Workshop' };
const BIOME_ORDER  = ['campsite', 'lab', 'workshop'];

function projectHref(project) {
  return project.biome_id ? `/world/${project.id}` : `/q/${project.id}`;
}

function BiomeGroup({ biomeId, projects }) {
  return (
    <div className="wmp-group">
      <h3 className="wmp-group-label">{BIOME_LABELS[biomeId] ?? biomeId}</h3>
      <ul className="wmp-list">
        {projects.map(p => (
          <li key={p.id} className="wmp-item">
            <Link to={projectHref(p)} className="wmp-link">{p.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function WallMapPanel({ projects, completedProjects }) {
  if (projects.length === 0 && completedProjects.length === 0) {
    return (
      <div className="wmp-empty">
        <p>No active projects yet. Your guide will assign your first one soon.</p>
      </div>
    );
  }

  const byBiome = {};
  const unassigned = [];
  for (const p of projects) {
    if (p.biome_id && BIOME_LABELS[p.biome_id]) {
      if (!byBiome[p.biome_id]) byBiome[p.biome_id] = [];
      byBiome[p.biome_id].push(p);
    } else {
      unassigned.push(p);
    }
  }

  return (
    <div className="wall-map-panel">
      {BIOME_ORDER.filter(id => byBiome[id]).map(id => (
        <BiomeGroup key={id} biomeId={id} projects={byBiome[id]} />
      ))}
      {unassigned.length > 0 && (
        <div className="wmp-group">
          <h3 className="wmp-group-label">Unassigned</h3>
          <ul className="wmp-list">
            {unassigned.map(p => (
              <li key={p.id} className="wmp-item">
                <Link to={projectHref(p)} className="wmp-link">{p.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
