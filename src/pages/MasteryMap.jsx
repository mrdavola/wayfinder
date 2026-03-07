import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Map, GitBranch, Loader2 } from 'lucide-react';
import { masteryMap } from '../lib/api';
import { supabase } from '../lib/supabase';
import WayfinderLogoIcon from '../components/icons/WayfinderLogo';

const ISLANDS = {
  core: { cx: 280, cy: 200, rx: 130, ry: 90, color: 'var(--lab-blue)', label: 'Core Skills' },
  soft: { cx: 580, cy: 160, rx: 110, ry: 80, color: 'var(--compass-gold)', label: 'Explorer Skills' },
  interest: { cx: 430, cy: 380, rx: 140, ry: 85, color: 'var(--field-green)', label: 'Discovery Skills' },
};

const RATING_OPACITY = { 0: 0.15, 1: 0.3, 2: 0.5, 3: 0.75, 4: 1 };
const RATING_LABELS = ['Uncharted', 'Emerging', 'Developing', 'Proficient', 'Advanced'];

function skillPosition(island, index, total) {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
  const r = 0.55;
  return {
    x: island.cx + island.rx * r * Math.cos(angle),
    y: island.cy + island.ry * r * Math.sin(angle),
  };
}

export default function MasteryMap() {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('world');
  const [selectedSkill, setSelectedSkill] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    const load = async () => {
      setLoading(true);
      const [{ data: s }, profile] = await Promise.all([
        supabase.from('students').select('*').eq('id', studentId).single(),
        masteryMap.getFullProfile(studentId),
      ]);
      setStudent(s);
      setData(profile);
      setLoading(false);
    };
    load();
  }, [studentId]);

  const categorized = useMemo(() => {
    if (!data?.assessments) return {};
    const cats = { core: [], soft: [], interest: [] };
    const skillCategories = {};
    (data.studentSkills || []).forEach(s => {
      skillCategories[s.skill_name] = s.category || 'interest';
    });
    Object.entries(data.assessments).forEach(([name, info]) => {
      const cat = skillCategories[name] || 'interest';
      const bucket = cats[cat] || cats.interest;
      bucket.push({ name, ...info });
    });
    return cats;
  }, [data]);

  const stats = useMemo(() => {
    if (!data?.assessments) return {};
    const all = Object.values(data.assessments);
    const total = all.length;
    const mastered = all.filter(a => a.latest.rating >= 3).length;
    const sorted = [...all].sort((a, b) => b.latest.rating - a.latest.rating);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];
    return { total, mastered, pct: total ? Math.round((mastered / total) * 100) : 0, strongest, weakest };
  }, [data]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={20} color="var(--graphite)" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--font-body)' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }`}</style>

      <header style={{
        height: 48, background: 'var(--chalk)', borderBottom: '1px solid var(--pencil)',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8,
      }}>
        <Link to={`/students/${studentId}`} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--graphite)', textDecoration: 'none', fontSize: 12 }}>
          <ArrowLeft size={14} /> Back to profile
        </Link>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', border: '1px solid var(--pencil)', borderRadius: 6, overflow: 'hidden' }}>
            <button onClick={() => setView('world')} style={{
              padding: '4px 10px', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600,
              background: view === 'world' ? 'var(--ink)' : 'var(--chalk)',
              color: view === 'world' ? 'var(--chalk)' : 'var(--graphite)',
              display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)',
            }}><Map size={11} /> World Map</button>
            <button onClick={() => setView('graph')} style={{
              padding: '4px 10px', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600,
              background: view === 'graph' ? 'var(--ink)' : 'var(--chalk)',
              color: view === 'graph' ? 'var(--chalk)' : 'var(--graphite)',
              display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)',
            }}><GitBranch size={11} /> Knowledge Graph</button>
          </div>
          <WayfinderLogoIcon size={16} color="var(--compass-gold)" />
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 24px 0' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', margin: '0 0 4px' }}>
          {student?.avatar_emoji || '🧭'} {student?.name}'s Mastery Map
        </h1>
        <div style={{ display: 'flex', gap: 20, fontSize: 11, color: 'var(--graphite)', marginBottom: 16 }}>
          <span><strong>{stats.total || 0}</strong> skills discovered</span>
          <span><strong>{stats.pct || 0}%</strong> proficient or above</span>
          {stats.strongest && <span>Strongest: <strong>{stats.strongest.name}</strong></span>}
          {stats.weakest && stats.total > 1 && <span>Growing: <strong>{stats.weakest.name}</strong></span>}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 32px' }}>
        {view === 'world' ? (
          <div style={{ background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 14, padding: 16, position: 'relative' }}>
            <svg viewBox="0 0 860 500" style={{ width: '100%', height: 'auto' }}>
              <rect x="0" y="0" width="860" height="500" rx="10" fill="rgba(27,73,101,0.04)" />
              <text x="790" y="40" fontSize="10" fill="var(--pencil)" fontFamily="var(--font-mono)" textAnchor="middle">N</text>
              <line x1="790" y1="44" x2="790" y2="60" stroke="var(--pencil)" strokeWidth="0.5" />

              {Object.entries(ISLANDS).map(([cat, island]) => {
                const skills = categorized[cat] || [];
                return (
                  <g key={cat}>
                    <ellipse cx={island.cx} cy={island.cy} rx={island.rx} ry={island.ry}
                      fill={`color-mix(in srgb, ${island.color} 8%, var(--parchment))`}
                      stroke={island.color} strokeWidth="1.5" strokeDasharray={skills.length === 0 ? '4 4' : 'none'}
                      opacity={skills.length === 0 ? 0.3 : 1}
                    />
                    <text x={island.cx} y={island.cy - island.ry + 16} textAnchor="middle"
                      fontSize="9" fontWeight="700" fill={island.color}
                      fontFamily="var(--font-mono)" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {island.label}
                    </text>
                    {skills.length === 0 && (
                      <text x={island.cx} y={island.cy + 4} textAnchor="middle"
                        fontSize="9" fill="var(--pencil)" fontStyle="italic">
                        Uncharted territory
                      </text>
                    )}
                    {skills.map((skill, i) => {
                      const pos = skillPosition(island, i, skills.length);
                      const rating = skill.latest?.rating || 0;
                      const opacity = RATING_OPACITY[rating] || 0.15;
                      const size = 6 + rating * 2;
                      return (
                        <g key={skill.name} style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedSkill(selectedSkill === skill.name ? null : skill.name)}>
                          <circle cx={pos.x} cy={pos.y} r={size}
                            fill={island.color} opacity={opacity}
                            stroke={selectedSkill === skill.name ? 'var(--ink)' : 'none'}
                            strokeWidth={selectedSkill === skill.name ? 2 : 0}
                          />
                          {rating >= 3 && (
                            <circle cx={pos.x} cy={pos.y} r={size + 3}
                              fill="none" stroke={island.color} strokeWidth="0.5"
                              opacity={0.4} style={{ animation: 'pulse 2s infinite' }}
                            />
                          )}
                          <text x={pos.x} y={pos.y + size + 10} textAnchor="middle"
                            fontSize="8" fill="var(--graphite)" fontFamily="var(--font-body)">
                            {skill.name.length > 14 ? skill.name.slice(0, 12) + '...' : skill.name}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {data?.connections?.slice(0, 20).map((conn, i) => {
                let fromPos = null, toPos = null;
                Object.entries(ISLANDS).forEach(([cat, island]) => {
                  const skills = categorized[cat] || [];
                  skills.forEach((s, idx) => {
                    const pos = skillPosition(island, idx, skills.length);
                    if (s.name === conn.from) fromPos = pos;
                    if (s.name === conn.to) toPos = pos;
                  });
                });
                if (!fromPos || !toPos) return null;
                return (
                  <line key={i} x1={fromPos.x} y1={fromPos.y} x2={toPos.x} y2={toPos.y}
                    stroke="var(--pencil)" strokeWidth="0.5" strokeDasharray="3 3" opacity={0.4}
                  />
                );
              })}
            </svg>

            {selectedSkill && data?.assessments[selectedSkill] && (
              <div style={{
                position: 'absolute', bottom: 16, left: 16, right: 16,
                background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 10,
                padding: '12px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{selectedSkill}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                    background: 'rgba(27,73,101,0.08)', color: 'var(--lab-blue)',
                    fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                  }}>
                    {RATING_LABELS[data.assessments[selectedSkill].latest.rating]}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--graphite)', margin: '0 0 4px', lineHeight: 1.4 }}>
                  <strong>Evidence:</strong> {data.assessments[selectedSkill].latest.evidence || 'No details yet'}
                </p>
                <p style={{ fontSize: 10, color: 'var(--pencil)', margin: 0 }}>
                  {data.assessments[selectedSkill].history.length} observations
                </p>
              </div>
            )}
          </div>
        ) : (
          <KnowledgeGraph assessments={data?.assessments || {}} connections={data?.connections || []} />
        )}
      </div>
    </div>
  );
}

function KnowledgeGraph({ assessments, connections }) {
  const nodes = useMemo(() => {
    const entries = Object.entries(assessments);
    if (entries.length === 0) return [];
    const angleStep = (2 * Math.PI) / entries.length;
    return entries.map(([name, info], i) => {
      const angle = i * angleStep - Math.PI / 2;
      const radius = 180;
      return {
        name,
        x: 430 + radius * Math.cos(angle),
        y: 250 + radius * Math.sin(angle) * 0.7,
        rating: info.latest?.rating || 1,
        history: info.history,
      };
    });
  }, [assessments]);

  const nodeMap = useMemo(() => {
    const map = {};
    nodes.forEach(n => { map[n.name] = n; });
    return map;
  }, [nodes]);

  return (
    <div style={{ background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 14, padding: 16 }}>
      <svg viewBox="0 0 860 500" style={{ width: '100%', height: 'auto' }}>
        <rect x="0" y="0" width="860" height="500" rx="10" fill="rgba(27,73,101,0.02)" />
        {connections.slice(0, 30).map((conn, i) => {
          const from = nodeMap[conn.from];
          const to = nodeMap[conn.to];
          if (!from || !to) return null;
          return (
            <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke="var(--pencil)" strokeWidth="1" opacity={0.25}
            />
          );
        })}
        {nodes.map(node => {
          const size = 8 + node.rating * 4;
          const colors = ['var(--pencil)', 'var(--specimen-red)', 'var(--compass-gold)', 'var(--lab-blue)', 'var(--field-green)'];
          return (
            <g key={node.name}>
              <circle cx={node.x} cy={node.y} r={size}
                fill={colors[node.rating]} opacity={0.7}
              />
              <text x={node.x} y={node.y + size + 12} textAnchor="middle"
                fontSize="9" fill="var(--graphite)" fontFamily="var(--font-body)">
                {node.name.length > 16 ? node.name.slice(0, 14) + '...' : node.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
