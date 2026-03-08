import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Map, GitBranch, Loader2, Target, Info } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { masteryMap } from '../lib/api';
import { supabase } from '../lib/supabase';
import WayfinderLogoIcon from '../components/icons/WayfinderLogo';

// ===================== CONSTANTS =====================
const ISLANDS = {
  core: { cx: 280, cy: 200, rx: 130, ry: 90, color: 'var(--lab-blue)', label: 'Core Skills' },
  soft: { cx: 580, cy: 160, rx: 110, ry: 80, color: 'var(--compass-gold)', label: 'Explorer Skills' },
  interest: { cx: 430, cy: 380, rx: 140, ry: 85, color: 'var(--field-green)', label: 'Discovery Skills' },
};

const RATING_OPACITY = { 0: 0.15, 1: 0.3, 2: 0.5, 3: 0.75, 4: 1 };
const RATING_LABELS = ['Uncharted', 'Emerging', 'Developing', 'Proficient', 'Advanced'];

// Domain groupings for the radar chart — maps skill categories to display domains
const DOMAIN_MAP = {
  'Mathematics': 'Math',
  'Math': 'Math',
  'Algebra': 'Math',
  'Geometry': 'Math',
  'Statistics': 'Math',
  'Number Sense': 'Math',
  'Reading': 'Reading & Writing',
  'Writing': 'Reading & Writing',
  'ELA': 'Reading & Writing',
  'English': 'Reading & Writing',
  'Literacy': 'Reading & Writing',
  'Communication': 'Reading & Writing',
  'Science': 'Science',
  'Biology': 'Science',
  'Chemistry': 'Science',
  'Physics': 'Science',
  'Environmental': 'Science',
  'Engineering': 'Science',
  'Social Studies': 'Social Studies',
  'History': 'Social Studies',
  'Geography': 'Social Studies',
  'Civics': 'Social Studies',
  'Economics': 'Social Studies',
  'Critical Thinking': 'Critical Thinking',
  'Problem Solving': 'Critical Thinking',
  'Analysis': 'Critical Thinking',
  'Research': 'Critical Thinking',
  'Reasoning': 'Critical Thinking',
  'Creativity': 'Creativity & Design',
  'Design': 'Creativity & Design',
  'Art': 'Creativity & Design',
  'Innovation': 'Creativity & Design',
  'Collaboration': 'Social-Emotional',
  'Leadership': 'Social-Emotional',
  'Teamwork': 'Social-Emotional',
  'Empathy': 'Social-Emotional',
  'Self-Management': 'Social-Emotional',
  'Technology': 'Technology',
  'Digital Literacy': 'Technology',
  'Coding': 'Technology',
  'Data': 'Technology',
};

const DEFAULT_DOMAINS = [
  'Math', 'Reading & Writing', 'Science', 'Social Studies',
  'Critical Thinking', 'Creativity & Design', 'Social-Emotional', 'Technology',
];

function categorizeToDomain(skillName) {
  // Try exact match first
  if (DOMAIN_MAP[skillName]) return DOMAIN_MAP[skillName];
  // Try partial match
  const lower = skillName.toLowerCase();
  for (const [key, domain] of Object.entries(DOMAIN_MAP)) {
    if (lower.includes(key.toLowerCase())) return domain;
  }
  return null; // uncategorized
}

function skillPosition(island, index, total) {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
  const r = 0.55;
  return {
    x: island.cx + island.rx * r * Math.cos(angle),
    y: island.cy + island.ry * r * Math.sin(angle),
  };
}

// ===================== CUSTOM TOOLTIP =====================
function RadarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const target = payload.find(p => p.dataKey === 'target');
  const current = payload.find(p => p.dataKey === 'current');
  const skills = payload[0]?.payload?.skills || [];
  const gap = (target?.value || 0) - (current?.value || 0);

  return (
    <div style={{
      background: 'var(--chalk)', border: '1px solid var(--pencil)',
      borderRadius: 10, padding: '12px 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      maxWidth: 260, fontFamily: 'var(--font-body)',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#1B4965', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Target</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1B4965' }}>{Math.round((target?.value || 0) * 100)}%</div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#B8860B', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Current</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#B8860B' }}>{Math.round((current?.value || 0) * 100)}%</div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, color: gap > 0.1 ? '#C0392B' : '#2D8B4E', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Gap</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: gap > 0.1 ? '#C0392B' : '#2D8B4E' }}>
            {gap > 0.05 ? `-${Math.round(gap * 100)}%` : 'On track'}
          </div>
        </div>
      </div>
      {skills.length > 0 && (
        <div style={{ borderTop: '1px solid var(--pencil)', paddingTop: 6 }}>
          <div style={{ fontSize: 9, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>SKILLS IN THIS DOMAIN</div>
          {skills.slice(0, 5).map((s, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--ink)', display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>{s.name}</span>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
                background: s.rating >= 3 ? 'rgba(45,139,78,0.1)' : s.rating >= 2 ? 'rgba(184,134,11,0.1)' : 'rgba(192,57,43,0.1)',
                color: s.rating >= 3 ? '#2D8B4E' : s.rating >= 2 ? '#B8860B' : '#C0392B',
              }}>{RATING_LABELS[s.rating]}</span>
            </div>
          ))}
          {skills.length > 5 && (
            <div style={{ fontSize: 10, color: 'var(--pencil)', marginTop: 2 }}>+{skills.length - 5} more</div>
          )}
        </div>
      )}
    </div>
  );
}

// ===================== CUSTOM AXIS LABEL =====================
function CustomAngleLabel({ payload, x, y, textAnchor, index, data, selectedDomain, onDomainClick }) {
  const domain = data?.[index];
  const isSelected = selectedDomain === domain?.domain;
  return (
    <text
      x={x} y={y}
      textAnchor={textAnchor}
      fill={isSelected ? 'var(--ink)' : 'var(--graphite)'}
      fontSize={11}
      fontWeight={isSelected ? 700 : 500}
      fontFamily="var(--font-body)"
      style={{ cursor: 'pointer' }}
      onClick={() => onDomainClick?.(domain?.domain)}
    >
      {payload?.value}
    </text>
  );
}

// ===================== RADAR VIEW =====================
function RadarView({ assessments, studentSkills, learningOutcomes }) {
  const [selectedDomain, setSelectedDomain] = useState(null);

  const radarData = useMemo(() => {
    // Group skills by domain
    const domainSkills = {};
    DEFAULT_DOMAINS.forEach(d => { domainSkills[d] = []; });

    // Add assessed skills
    Object.entries(assessments || {}).forEach(([name, info]) => {
      const domain = categorizeToDomain(name);
      if (domain && domainSkills[domain]) {
        domainSkills[domain].push({ name, rating: info.latest?.rating || 0 });
      }
    });

    // Add student skills that aren't in assessments
    (studentSkills || []).forEach(s => {
      const domain = categorizeToDomain(s.skill_name || s.name);
      if (domain && domainSkills[domain]) {
        const exists = domainSkills[domain].find(sk => sk.name === (s.skill_name || s.name));
        if (!exists) {
          domainSkills[domain].push({ name: s.skill_name || s.name, rating: s.current_level || 0 });
        }
      }
    });

    // Compute target values from learning outcomes
    const targetByDomain = {};
    (learningOutcomes || []).forEach(o => {
      const domain = categorizeToDomain(o.category || o.description || '');
      if (domain) {
        const priority = o.priority === 'high' ? 1.0 : o.priority === 'medium' ? 0.75 : 0.5;
        targetByDomain[domain] = Math.max(targetByDomain[domain] || 0, priority);
      }
    });

    return DEFAULT_DOMAINS.map(domain => {
      const skills = domainSkills[domain] || [];
      const avgRating = skills.length > 0
        ? skills.reduce((sum, s) => sum + s.rating, 0) / skills.length
        : 0;
      // Normalize: rating 0-4 → 0-1 scale
      const current = avgRating / 4;
      // Target: from learning outcomes, or default 0.75 if any skills exist, 0.5 otherwise
      const target = targetByDomain[domain] || (skills.length > 0 ? 0.75 : 0.5);

      return { domain, current, target, skills, skillCount: skills.length };
    });
  }, [assessments, studentSkills, learningOutcomes]);

  const handleDomainClick = useCallback((domain) => {
    setSelectedDomain(prev => prev === domain ? null : domain);
  }, []);

  const selectedData = selectedDomain
    ? radarData.find(d => d.domain === selectedDomain)
    : null;

  return (
    <div style={{ background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 14, padding: '20px 16px' }}>
      <div style={{ width: '100%', height: 420 }}>
        <ResponsiveContainer>
          <RadarChart data={radarData} outerRadius="75%">
            <PolarGrid stroke="var(--pencil)" strokeOpacity={0.4} />
            <PolarAngleAxis
              dataKey="domain"
              tick={<CustomAngleLabel data={radarData} selectedDomain={selectedDomain} onDomainClick={handleDomainClick} />}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 1]}
              tickCount={5}
              tick={{ fontSize: 9, fill: 'var(--pencil)' }}
              tickFormatter={v => `${Math.round(v * 100)}%`}
            />
            <Radar
              name="Year-End Goals"
              dataKey="target"
              stroke="#1B4965"
              fill="#1B4965"
              fillOpacity={0.15}
              strokeWidth={2}
              dot={{ r: 4, fill: '#1B4965', stroke: '#fff', strokeWidth: 1.5 }}
              animationDuration={800}
              animationEasing="ease-out"
            />
            <Radar
              name="Current Progress"
              dataKey="current"
              stroke="#B8860B"
              fill="#B8860B"
              fillOpacity={0.25}
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#B8860B', stroke: '#fff', strokeWidth: 1.5 }}
              animationDuration={1000}
              animationEasing="ease-out"
            />
            <Tooltip content={<RadarTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-body)', paddingTop: 8 }}
              iconSize={10}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Domain drill-down */}
      {selectedData && (
        <div style={{
          marginTop: 12, padding: '14px 18px', borderRadius: 10,
          background: 'var(--parchment)', border: '1px solid var(--pencil)',
          animation: 'fadeIn 200ms ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{selectedData.domain}</span>
            <button onClick={() => setSelectedDomain(null)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--graphite)',
            }}>
              <span style={{ fontSize: 14 }}>&times;</span>
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--graphite)', marginBottom: 4 }}>
              <span>Progress toward goal</span>
              <span>{Math.round((selectedData.current / Math.max(selectedData.target, 0.01)) * 100)}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'rgba(27,73,101,0.1)', position: 'relative', overflow: 'hidden' }}>
              {/* Target marker */}
              <div style={{
                position: 'absolute', left: `${selectedData.target * 100}%`, top: 0, bottom: 0,
                width: 2, background: '#1B4965', zIndex: 2,
              }} />
              {/* Current fill */}
              <div style={{
                height: '100%', borderRadius: 4,
                width: `${selectedData.current * 100}%`,
                background: selectedData.current >= selectedData.target ? '#2D8B4E' : '#B8860B',
                transition: 'width 600ms ease',
              }} />
            </div>
          </div>

          {/* Individual skills */}
          {selectedData.skills.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selectedData.skills.map((skill, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: skill.rating >= 3 ? '#2D8B4E' : skill.rating >= 2 ? '#B8860B' : skill.rating >= 1 ? '#C0392B' : 'var(--pencil)',
                  }} />
                  <span style={{ fontSize: 12, color: 'var(--ink)', flex: 1 }}>{skill.name}</span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[0, 1, 2, 3].map(level => (
                      <div key={level} style={{
                        width: 16, height: 4, borderRadius: 2,
                        background: level < skill.rating ? '#B8860B' : 'var(--pencil)',
                        opacity: level < skill.rating ? 1 : 0.2,
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', minWidth: 60, textAlign: 'right' }}>
                    {RATING_LABELS[skill.rating]}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 11, color: 'var(--pencil)', margin: 0, fontStyle: 'italic' }}>
              No skills assessed yet in this domain
            </p>
          )}
        </div>
      )}

      {/* Legend explanation */}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'flex-start', gap: 6, padding: '8px 12px', borderRadius: 8, background: 'rgba(27,73,101,0.03)' }}>
        <Info size={13} color="var(--graphite)" style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 10, color: 'var(--graphite)', lineHeight: 1.5 }}>
          The <strong style={{ color: '#1B4965' }}>blue web</strong> shows expected mastery goals for the school year.
          The <strong style={{ color: '#B8860B' }}>gold web</strong> shows current assessed progress.
          Click any domain label to drill into individual skills.
        </span>
      </div>
    </div>
  );
}

// ===================== MAIN COMPONENT =====================
export default function MasteryMap() {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('radar');
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [learningOutcomes, setLearningOutcomes] = useState([]);

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

      // Load parent learning outcomes if available
      if (s?.id) {
        const { data: parentAccess } = await supabase
          .from('parent_access')
          .select('learning_outcomes')
          .eq('student_id', s.id)
          .maybeSingle();
        if (parentAccess?.learning_outcomes) {
          setLearningOutcomes(parentAccess.learning_outcomes);
        }
      }

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

  const viewBtnStyle = (v) => ({
    padding: '4px 10px', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600,
    background: view === v ? 'var(--ink)' : 'var(--chalk)',
    color: view === v ? 'var(--chalk)' : 'var(--graphite)',
    display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)',
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', fontFamily: 'var(--font-body)' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <header style={{
        height: 48, background: 'var(--chalk)', borderBottom: '1px solid var(--pencil)',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8,
      }}>
        <Link to={`/students/${studentId}`} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--graphite)', textDecoration: 'none', fontSize: 12 }}>
          <ArrowLeft size={14} /> Back to profile
        </Link>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', border: '1px solid var(--pencil)', borderRadius: 6, overflow: 'hidden' }}>
            <button onClick={() => setView('radar')} style={viewBtnStyle('radar')}>
              <Target size={11} /> Progress Radar
            </button>
            <button onClick={() => setView('world')} style={viewBtnStyle('world')}>
              <Map size={11} /> World Map
            </button>
            <button onClick={() => setView('graph')} style={viewBtnStyle('graph')}>
              <GitBranch size={11} /> Knowledge Graph
            </button>
          </div>
          <WayfinderLogoIcon size={16} color="var(--compass-gold)" />
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 24px 0' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', margin: '0 0 4px' }}>
          {student?.avatar_emoji || '\u{1F9ED}'} {student?.name}'s Mastery Map
        </h1>
        <div style={{ display: 'flex', gap: 20, fontSize: 11, color: 'var(--graphite)', marginBottom: 16, flexWrap: 'wrap' }}>
          <span><strong>{stats.total || 0}</strong> skills discovered</span>
          <span><strong>{stats.pct || 0}%</strong> proficient or above</span>
          {stats.strongest && <span>Strongest: <strong>{stats.strongest.name}</strong></span>}
          {stats.weakest && stats.total > 1 && <span>Growing: <strong>{stats.weakest.name}</strong></span>}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 32px' }}>
        {view === 'radar' ? (
          <RadarView
            assessments={data?.assessments || {}}
            studentSkills={data?.studentSkills || []}
            learningOutcomes={learningOutcomes}
          />
        ) : view === 'world' ? (
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

// ===================== KNOWLEDGE GRAPH =====================
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
