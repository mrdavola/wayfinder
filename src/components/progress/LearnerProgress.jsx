// src/components/progress/LearnerProgress.jsx
import { useState, useEffect } from 'react';
import { Target, TrendingUp, Award, BookOpen } from 'lucide-react';
import ProgressBar from './ProgressBar';
import { supabase } from '../../lib/supabase';
import { skillAssessments, skills as skillsApi } from '../../lib/api';

const CORE_SKILLS = [
  'Critical Thinking', 'Problem Solving', 'Communication',
  'Research', 'Creativity', 'Collaboration', 'Self-Direction',
];

const DOMAIN_MAP = {
  'Math': ['Quantity', 'Operations', 'Part-Whole', 'Measurement', 'Patterns', 'Spatial', 'Variables', 'Equality', 'Scaling', 'Change & Rate', 'Uncertainty', 'Logic'],
  'Science': ['Research', 'observation', 'hypothesis', 'experiment', 'data analysis', 'biology', 'chemistry', 'physics', 'ecology', 'environmental'],
  'Reading & Writing': ['Communication', 'writing', 'reading', 'vocabulary', 'grammar', 'storytelling', 'persuasion', 'narrative'],
  'Social Studies': ['history', 'geography', 'civics', 'economics', 'culture', 'government'],
  'Critical Thinking': ['Critical Thinking', 'Problem Solving', 'logic', 'reasoning', 'analysis', 'evaluation'],
  'Creativity & Design': ['Creativity', 'design', 'art', 'innovation', 'imagination', 'aesthetics'],
  'Social-Emotional': ['Collaboration', 'empathy', 'Self-Direction', 'resilience', 'leadership', 'teamwork'],
  'Technology': ['coding', 'programming', 'digital', 'technology', 'engineering', 'robotics'],
};

export default function LearnerProgress({ studentId, studentName, isGuide, quests }) {
  const [tab, setTab] = useState('projects');
  const [assessments, setAssessments] = useState({});
  const [studentSkills, setStudentSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [studentId]);

  async function loadData() {
    setLoading(true);
    try {
      const [assessData, skillsData] = await Promise.all([
        skillAssessments.getForStudentGrouped(studentId),
        skillsApi.getStudentSkills(studentId),
      ]);
      setAssessments(assessData || {});
      setStudentSkills(skillsData?.data || []);
    } catch (err) {
      console.error('LearnerProgress load error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Compute summary stats
  const completedQuests = (quests || []).filter(q => q.status === 'completed').length;
  const totalQuests = (quests || []).length;
  const totalStages = (quests || []).reduce((sum, q) => sum + (q.completed_stages || 0), 0);
  const skillEntries = Object.entries(assessments);
  const strongestSkill = skillEntries.length > 0
    ? skillEntries.sort((a, b) => (b[1].latest?.rating || 0) - (a[1].latest?.rating || 0))[0]?.[0]
    : null;

  // Build core skills data
  function getCoreSkillsData() {
    return CORE_SKILLS.map(skill => {
      const data = assessments[skill];
      if (!data) return { label: skill, percentage: 0, count: 0 };
      const allRatings = data.history?.map(h => h.rating).filter(Boolean) || [];
      if (data.latest?.rating) allRatings.push(data.latest.rating);
      const avg = allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0;
      return { label: skill, percentage: (avg / 4) * 100, count: allRatings.length };
    }).sort((a, b) => b.percentage - a.percentage);
  }

  // Build domains data
  function getDomainsData() {
    return Object.entries(DOMAIN_MAP).map(([domain, keywords]) => {
      const matchingSkills = Object.entries(assessments).filter(([name]) =>
        keywords.some(kw => name.toLowerCase().includes(kw.toLowerCase()))
      );
      if (matchingSkills.length === 0) return { label: domain, percentage: 0, count: 0 };
      const allRatings = matchingSkills.flatMap(([, data]) => {
        const ratings = data.history?.map(h => h.rating).filter(Boolean) || [];
        if (data.latest?.rating) ratings.push(data.latest.rating);
        return ratings;
      });
      const avg = allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0;
      return { label: domain, percentage: (avg / 4) * 100, count: allRatings.length };
    }).sort((a, b) => b.percentage - a.percentage);
  }

  // Build projects data
  function getProjectsData() {
    return (quests || []).map(q => {
      const total = q.total_stages || q.quest_stages?.length || 0;
      const completed = q.completed_stages || 0;
      const pct = total > 0 ? (completed / total) * 100 : 0;
      return {
        id: q.id,
        label: q.title,
        percentage: pct,
        subtitle: `${completed}/${total} stages`,
        color: pct >= 100 ? 'var(--field-green)' : 'var(--compass-gold)',
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }

  const tabs = [
    { key: 'projects', label: 'Projects' },
    { key: 'skills', label: 'Core Skills' },
    { key: 'domains', label: 'Domains' },
    ...(isGuide ? [{ key: 'custom', label: 'Custom' }] : []),
  ];

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 20,
      }}>
        {[
          { icon: BookOpen, label: 'Projects', value: `${completedQuests} of ${totalQuests}` },
          { icon: Award, label: 'Strongest Skill', value: strongestSkill || '—' },
          { icon: Target, label: 'Stages Done', value: totalStages },
          { icon: TrendingUp, label: 'Growth', value: '—' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--chalk)',
            border: '1px solid var(--pencil)',
            borderRadius: 8,
            padding: '14px 16px',
            textAlign: 'center',
          }}>
            <stat.icon size={16} style={{ color: 'var(--compass-gold)', marginBottom: 4 }} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)' }}>
              {stat.value}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 0,
        borderBottom: '1px solid var(--pencil)',
        marginBottom: 20,
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? 'var(--ink)' : 'var(--graphite)',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--compass-gold)' : '2px solid transparent',
              padding: '8px 16px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--graphite)', fontFamily: 'var(--font-body)', fontSize: 14 }}>
          Loading progress...
        </div>
      ) : (
        <div style={{
          background: 'var(--chalk)',
          border: '1px solid var(--pencil)',
          borderRadius: 10,
          padding: '20px 24px',
        }}>
          {tab === 'projects' && (
            getProjectsData().length > 0
              ? getProjectsData().map(p => (
                  <ProgressBar key={p.id} label={p.label} percentage={p.percentage} subtitle={p.subtitle} color={p.color} />
                ))
              : <EmptyState text="No projects yet" />
          )}
          {tab === 'skills' && (
            getCoreSkillsData().some(s => s.percentage > 0)
              ? getCoreSkillsData().map(s => (
                  <ProgressBar key={s.label} label={s.label} percentage={s.percentage} subtitle={`Based on ${s.count} assessments`} />
                ))
              : <EmptyState text="Core skill ratings will appear as projects are completed and reviewed" />
          )}
          {tab === 'domains' && (
            getDomainsData().some(d => d.percentage > 0)
              ? getDomainsData().map(d => (
                  <ProgressBar key={d.label} label={d.label} percentage={d.percentage} subtitle={`Based on ${d.count} assessments`} />
                ))
              : <EmptyState text="Domain progress will appear as skills are assessed across projects" />
          )}
          {tab === 'custom' && isGuide && (
            <EmptyState text="Custom skill tracking coming soon" />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ padding: '32px 20px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
        No progress data yet
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)' }}>
        {text}
      </div>
    </div>
  );
}
