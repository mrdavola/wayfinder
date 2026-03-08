import { useState, useMemo, useCallback } from 'react';
import { Info } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';

const RATING_LABELS = ['Uncharted', 'Emerging', 'Developing', 'Proficient', 'Advanced'];

const DOMAIN_MAP = {
  'Mathematics': 'Math', 'Math': 'Math', 'Algebra': 'Math', 'Geometry': 'Math',
  'Statistics': 'Math', 'Number Sense': 'Math',
  'Reading': 'Reading & Writing', 'Writing': 'Reading & Writing', 'ELA': 'Reading & Writing',
  'English': 'Reading & Writing', 'Literacy': 'Reading & Writing', 'Communication': 'Reading & Writing',
  'Science': 'Science', 'Biology': 'Science', 'Chemistry': 'Science', 'Physics': 'Science',
  'Environmental': 'Science', 'Engineering': 'Science',
  'Social Studies': 'Social Studies', 'History': 'Social Studies', 'Geography': 'Social Studies',
  'Civics': 'Social Studies', 'Economics': 'Social Studies',
  'Critical Thinking': 'Critical Thinking', 'Problem Solving': 'Critical Thinking',
  'Analysis': 'Critical Thinking', 'Research': 'Critical Thinking', 'Reasoning': 'Critical Thinking',
  'Creativity': 'Creativity & Design', 'Design': 'Creativity & Design',
  'Art': 'Creativity & Design', 'Innovation': 'Creativity & Design',
  'Collaboration': 'Social-Emotional', 'Leadership': 'Social-Emotional',
  'Teamwork': 'Social-Emotional', 'Empathy': 'Social-Emotional', 'Self-Management': 'Social-Emotional',
  'Technology': 'Technology', 'Digital Literacy': 'Technology', 'Coding': 'Technology', 'Data': 'Technology',
};

const DEFAULT_DOMAINS = [
  'Math', 'Reading & Writing', 'Science', 'Social Studies',
  'Critical Thinking', 'Creativity & Design', 'Social-Emotional', 'Technology',
];

function categorizeToDomain(skillName) {
  if (DOMAIN_MAP[skillName]) return DOMAIN_MAP[skillName];
  const lower = skillName.toLowerCase();
  for (const [key, domain] of Object.entries(DOMAIN_MAP)) {
    if (lower.includes(key.toLowerCase())) return domain;
  }
  return null;
}

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

function CustomAngleLabel({ payload, x, y, textAnchor, index, data, selectedDomain, onDomainClick, compact }) {
  const domain = data?.[index];
  const isSelected = selectedDomain === domain?.domain;
  return (
    <text
      x={x} y={y}
      textAnchor={textAnchor}
      fill={isSelected ? 'var(--ink)' : 'var(--graphite)'}
      fontSize={compact ? 10 : 11}
      fontWeight={isSelected ? 700 : 500}
      fontFamily="var(--font-body)"
      style={{ cursor: 'pointer' }}
      onClick={() => onDomainClick?.(domain?.domain)}
    >
      {payload?.value}
    </text>
  );
}

/**
 * ProgressRadar — reusable radar chart showing target vs current skill progress.
 *
 * Props:
 *   assessments     — grouped skill assessments { [skillName]: { latest, history } }
 *   studentSkills   — array of student_skills rows
 *   learningOutcomes — array of parent learning outcome objects
 *   compact         — if true, shorter height (320px) and no info legend (for embedding)
 *   height          — override chart height (default 420, compact default 320)
 */
export default function ProgressRadar({ assessments, studentSkills, learningOutcomes, compact, height }) {
  const [selectedDomain, setSelectedDomain] = useState(null);

  const chartHeight = height || (compact ? 320 : 420);

  const radarData = useMemo(() => {
    const domainSkills = {};
    DEFAULT_DOMAINS.forEach(d => { domainSkills[d] = []; });

    Object.entries(assessments || {}).forEach(([name, info]) => {
      const domain = categorizeToDomain(name);
      if (domain && domainSkills[domain]) {
        domainSkills[domain].push({ name, rating: info.latest?.rating || 0 });
      }
    });

    (studentSkills || []).forEach(s => {
      const domain = categorizeToDomain(s.skill_name || s.name);
      if (domain && domainSkills[domain]) {
        const exists = domainSkills[domain].find(sk => sk.name === (s.skill_name || s.name));
        if (!exists) {
          domainSkills[domain].push({ name: s.skill_name || s.name, rating: s.current_level || 0 });
        }
      }
    });

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
      const current = avgRating / 4;
      // Only show target if there's real data (learning outcomes or assessed skills)
      const target = targetByDomain[domain] || (skills.length > 0 ? 0.75 : 0);
      return { domain, current, target, skills, skillCount: skills.length };
    });
  }, [assessments, studentSkills, learningOutcomes]);

  const hasData = radarData.some(d => d.current > 0 || d.target > 0);

  const handleDomainClick = useCallback((domain) => {
    setSelectedDomain(prev => prev === domain ? null : domain);
  }, []);

  const selectedData = selectedDomain
    ? radarData.find(d => d.domain === selectedDomain)
    : null;

  if (!hasData) {
    return (
      <div style={{
        background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 14,
        padding: compact ? '24px 16px' : '32px 24px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>&#x1F9ED;</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
          No progress data yet
        </div>
        <p style={{ fontSize: 12, color: 'var(--graphite)', margin: 0, lineHeight: 1.5, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
          The radar will fill in as this learner completes project stages and receives AI feedback.
          Parent learning outcomes will set the year-end goal targets.
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 14, padding: compact ? '14px 12px' : '20px 16px' }}>
      <style>{`@keyframes pr-fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div style={{ width: '100%', height: chartHeight }}>
        <ResponsiveContainer>
          <RadarChart data={radarData} outerRadius="75%">
            <PolarGrid stroke="var(--pencil)" strokeOpacity={0.4} />
            <PolarAngleAxis
              dataKey="domain"
              tick={<CustomAngleLabel data={radarData} selectedDomain={selectedDomain} onDomainClick={handleDomainClick} compact={compact} />}
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
              dot={{ r: compact ? 3 : 4, fill: '#1B4965', stroke: '#fff', strokeWidth: 1.5 }}
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
              dot={{ r: compact ? 3 : 4, fill: '#B8860B', stroke: '#fff', strokeWidth: 1.5 }}
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
          animation: 'pr-fadeIn 200ms ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{selectedData.domain}</span>
            <button onClick={() => setSelectedDomain(null)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--graphite)',
            }}>
              <span style={{ fontSize: 14 }}>&times;</span>
            </button>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--graphite)', marginBottom: 4 }}>
              <span>Progress toward goal</span>
              <span>{Math.round((selectedData.current / Math.max(selectedData.target, 0.01)) * 100)}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'rgba(27,73,101,0.1)', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', left: `${selectedData.target * 100}%`, top: 0, bottom: 0,
                width: 2, background: '#1B4965', zIndex: 2,
              }} />
              <div style={{
                height: '100%', borderRadius: 4,
                width: `${selectedData.current * 100}%`,
                background: selectedData.current >= selectedData.target ? '#2D8B4E' : '#B8860B',
                transition: 'width 600ms ease',
              }} />
            </div>
          </div>

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

      {/* Legend explanation — hidden in compact mode */}
      {!compact && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'flex-start', gap: 6, padding: '8px 12px', borderRadius: 8, background: 'rgba(27,73,101,0.03)' }}>
          <Info size={13} color="var(--graphite)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 10, color: 'var(--graphite)', lineHeight: 1.5 }}>
            The <strong style={{ color: '#1B4965' }}>blue web</strong> shows expected mastery goals for the school year.
            The <strong style={{ color: '#B8860B' }}>gold web</strong> shows current assessed progress.
            Click any domain label to drill into individual skills.
          </span>
        </div>
      )}
    </div>
  );
}
