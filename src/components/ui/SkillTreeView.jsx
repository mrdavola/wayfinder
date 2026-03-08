/**
 * SkillTreeView.jsx
 * Interactive SVG skill tree visualization with force-directed layout.
 *
 * Props:
 *   studentSkills  {array}   Student's skills [{ skill_id/id, proficiency/current_level_label, ... }]
 *   allSkills      {array}   Full skills catalog [{ id, name, category, description, ... }]
 *   dependencies   {array}   [{ skill_id, depends_on_skill_id, relationship }]
 *   compact        {boolean} 320px height if true, 450px if false
 *   onSkillClick   {fn}      Optional callback when a node is clicked
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { X } from 'lucide-react';

const NODE_RADIUS = 28;

const PROFICIENCY_COLORS = {
  advanced: '#16a34a',
  proficient: '#2D6A4F',
  developing: '#B8860B',
  emerging: '#9CA3AF',
  unrated: '#e5e7eb',
};

const CATEGORY_COLORS = {
  core: '#1B4965',
  soft: '#B8860B',
  interest: '#2D6A4F',
};

/* ---------- force-directed layout ---------- */

function layoutNodes(nodes, edges, width, height) {
  const padding = NODE_RADIUS + 8;
  const positions = nodes.map((_, i) => {
    const angle = (2 * Math.PI * i) / (nodes.length || 1);
    const rx = (width / 2 - padding) * 0.6;
    const ry = (height / 2 - padding) * 0.6;
    return { x: width / 2 + rx * Math.cos(angle), y: height / 2 + ry * Math.sin(angle) };
  });

  const idToIdx = {};
  nodes.forEach((n, i) => { idToIdx[n.id] = i; });

  for (let iter = 0; iter < 50; iter++) {
    const forces = positions.map(() => ({ x: 0, y: 0 }));

    // Repulsion between all pairs
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        let dx = positions[i].x - positions[j].x;
        let dy = positions[i].y - positions[j].y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        let f = 800 / (dist * dist);
        let fx = (dx / dist) * f;
        let fy = (dy / dist) * f;
        forces[i].x += fx;
        forces[i].y += fy;
        forces[j].x -= fx;
        forces[j].y -= fy;
      }
    }

    // Attraction for connected nodes (spring toward 120px)
    const restLength = 120;
    for (const edge of edges) {
      const iA = idToIdx[edge.from];
      const iB = idToIdx[edge.to];
      if (iA === undefined || iB === undefined) continue;
      let dx = positions[iB].x - positions[iA].x;
      let dy = positions[iB].y - positions[iA].y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      let f = (dist - restLength) * 0.05;
      let fx = (dx / dist) * f;
      let fy = (dy / dist) * f;
      forces[iA].x += fx;
      forces[iA].y += fy;
      forces[iB].x -= fx;
      forces[iB].y -= fy;
    }

    // Apply forces
    for (let i = 0; i < positions.length; i++) {
      positions[i].x += forces[i].x;
      positions[i].y += forces[i].y;
      // Clamp
      positions[i].x = Math.max(padding, Math.min(width - padding, positions[i].x));
      positions[i].y = Math.max(padding, Math.min(height - padding, positions[i].y));
    }
  }

  return positions;
}

/* ---------- helpers ---------- */

function getProficiency(studentSkill) {
  if (!studentSkill) return 'unrated';
  return studentSkill.proficiency || studentSkill.current_level_label || 'unrated';
}

function truncateLabel(name, compact) {
  const max = compact ? 12 : 14;
  if (!name) return '';
  return name.length > max ? name.slice(0, max) + '\u2026' : name;
}

/* ---------- component ---------- */

export default function SkillTreeView({
  studentSkills = [],
  allSkills = [],
  dependencies = [],
  compact = false,
  onSkillClick,
}) {
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ width: 600, height: compact ? 320 : 450 });
  const [selectedId, setSelectedId] = useState(null);

  // Responsive sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setDims({ width: w, height: compact ? 320 : 450 });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [compact]);

  // Build student skill map
  const studentMap = useMemo(() => {
    const m = {};
    studentSkills.forEach((s) => { m[s.skill_id || s.id] = s; });
    return m;
  }, [studentSkills]);

  // Filter skills: rated + connected unrated
  const { visibleSkills, visibleEdges, ratedSet } = useMemo(() => {
    const rated = new Set();
    studentSkills.forEach((s) => {
      const id = s.skill_id || s.id;
      const prof = getProficiency(s);
      if (prof && prof !== 'unrated') rated.add(id);
    });

    const connected = new Set();
    dependencies.forEach((d) => {
      if (rated.has(d.skill_id)) connected.add(d.depends_on_skill_id);
      if (rated.has(d.depends_on_skill_id)) connected.add(d.skill_id);
    });

    const showSet = new Set([...rated, ...connected]);
    const skills = allSkills.filter((s) => showSet.has(s.id));
    const edges = dependencies
      .filter((d) => showSet.has(d.skill_id) && showSet.has(d.depends_on_skill_id))
      .map((d) => ({ from: d.depends_on_skill_id, to: d.skill_id, relationship: d.relationship }));

    return { visibleSkills: skills, visibleEdges: edges, ratedSet: rated };
  }, [studentSkills, allSkills, dependencies]);

  // Layout
  const positions = useMemo(() => {
    if (visibleSkills.length === 0) return [];
    return layoutNodes(visibleSkills, visibleEdges, dims.width, dims.height);
  }, [visibleSkills, visibleEdges, dims.width, dims.height]);

  const posMap = useMemo(() => {
    const m = {};
    visibleSkills.forEach((s, i) => { m[s.id] = positions[i]; });
    return m;
  }, [visibleSkills, positions]);

  const handleNodeClick = useCallback((skill) => {
    setSelectedId((prev) => (prev === skill.id ? null : skill.id));
    if (onSkillClick) onSkillClick(skill);
  }, [onSkillClick]);

  // Selected skill info
  const selectedSkill = useMemo(() => {
    if (!selectedId) return null;
    return allSkills.find((s) => s.id === selectedId) || null;
  }, [selectedId, allSkills]);

  const selectedProficiency = selectedSkill ? getProficiency(studentMap[selectedSkill.id]) : null;

  // Empty state
  if (visibleSkills.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: compact ? 320 : 450,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--parchment)',
          borderRadius: 12,
          border: '1px solid var(--pencil)',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 40 }}>🌱</span>
        <span style={{ fontFamily: 'var(--font-body)', color: 'var(--graphite)', fontSize: 15 }}>
          No skills tracked yet
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', position: 'relative' }}
    >
      <svg
        width={dims.width}
        height={dims.height}
        viewBox={`0 0 ${dims.width} ${dims.height}`}
        style={{
          display: 'block',
          background: 'var(--parchment)',
          borderRadius: 12,
          border: '1px solid var(--pencil)',
        }}
      >
        <defs>
          {/* Glow filter for advanced/proficient nodes */}
          <filter id="skill-glow-advanced" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
            <feFlood floodColor="#16a34a" floodOpacity="0.45" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="skill-glow-proficient" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
            <feFlood floodColor="#2D6A4F" floodOpacity="0.35" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {visibleEdges.map((edge, i) => {
          const from = posMap[edge.from];
          const to = posMap[edge.to];
          if (!from || !to) return null;
          return (
            <line
              key={`edge-${i}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="var(--pencil)"
              strokeWidth={1.5}
              strokeOpacity={0.5}
              strokeDasharray={edge.relationship === 'optional' ? '4 3' : undefined}
            />
          );
        })}

        {/* Nodes */}
        {visibleSkills.map((skill) => {
          const pos = posMap[skill.id];
          if (!pos) return null;
          const isRated = ratedSet.has(skill.id);
          const prof = getProficiency(studentMap[skill.id]);
          const profColor = PROFICIENCY_COLORS[prof] || PROFICIENCY_COLORS.unrated;
          const catColor = CATEGORY_COLORS[skill.category] || 'var(--graphite)';
          const isSelected = selectedId === skill.id;

          const glowFilter =
            prof === 'advanced'
              ? 'url(#skill-glow-advanced)'
              : prof === 'proficient'
              ? 'url(#skill-glow-proficient)'
              : undefined;

          return (
            <g
              key={skill.id}
              onClick={() => handleNodeClick(skill)}
              style={{ cursor: 'pointer' }}
              role="button"
              tabIndex={0}
              aria-label={`${skill.name} — ${prof}`}
            >
              {/* Outer ring (category) */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={NODE_RADIUS}
                fill="none"
                stroke={catColor}
                strokeWidth={3}
                opacity={isRated ? 1 : 0.35}
                filter={glowFilter}
              />
              {/* Inner fill (proficiency) */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={NODE_RADIUS - 3}
                fill={isRated ? profColor : 'var(--chalk)'}
                opacity={isRated ? 0.18 : 0.12}
              />
              {/* Selection ring */}
              {isSelected && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={NODE_RADIUS + 4}
                  fill="none"
                  stroke="var(--compass-gold)"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                />
              )}
              {/* Proficiency indicator dot on rated nodes */}
              {isRated && (
                <circle
                  cx={pos.x + NODE_RADIUS * 0.65}
                  cy={pos.y - NODE_RADIUS * 0.65}
                  r={5}
                  fill={profColor}
                  stroke="var(--paper)"
                  strokeWidth={1.5}
                />
              )}
              {/* Label */}
              <text
                x={pos.x}
                y={pos.y + NODE_RADIUS + 14}
                textAnchor="middle"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 11,
                  fill: isRated ? 'var(--ink)' : 'var(--graphite)',
                  opacity: isRated ? 1 : 0.55,
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {truncateLabel(skill.name, compact)}
              </text>
              {/* Skill initial inside node */}
              <text
                x={pos.x}
                y={pos.y + 5}
                textAnchor="middle"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 16,
                  fontWeight: 600,
                  fill: isRated ? catColor : 'var(--graphite)',
                  opacity: isRated ? 0.8 : 0.35,
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {(skill.name || '?')[0].toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Detail popup */}
      {selectedSkill && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 220,
            background: 'var(--paper)',
            border: '1px solid var(--pencil)',
            borderRadius: 10,
            padding: '14px 16px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            fontFamily: 'var(--font-body)',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--ink)', lineHeight: 1.2 }}>
              {selectedSkill.name}
            </span>
            <button
              onClick={() => setSelectedId(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 2,
                color: 'var(--graphite)',
                flexShrink: 0,
              }}
              aria-label="Close detail"
            >
              <X size={16} />
            </button>
          </div>

          {selectedSkill.description && (
            <p style={{ fontSize: 12, color: 'var(--graphite)', margin: '0 0 10px', lineHeight: 1.4 }}>
              {selectedSkill.description}
            </p>
          )}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {/* Proficiency badge */}
            <span
              style={{
                display: 'inline-block',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                padding: '2px 8px',
                borderRadius: 100,
                background: PROFICIENCY_COLORS[selectedProficiency] || PROFICIENCY_COLORS.unrated,
                color: selectedProficiency === 'emerging' || selectedProficiency === 'unrated' ? 'var(--ink)' : '#fff',
              }}
            >
              {selectedProficiency || 'unrated'}
            </span>
            {/* Category badge */}
            {selectedSkill.category && (
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  padding: '2px 8px',
                  borderRadius: 100,
                  background: CATEGORY_COLORS[selectedSkill.category] || 'var(--graphite)',
                  color: '#fff',
                }}
              >
                {selectedSkill.category}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
