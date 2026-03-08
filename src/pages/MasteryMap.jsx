import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { masteryMap } from '../lib/api';
import { supabase } from '../lib/supabase';
import WayfinderLogoIcon from '../components/icons/WayfinderLogo';
import ProgressRadar from '../components/ui/ProgressRadar';

export default function MasteryMap() {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <header style={{
        height: 48, background: 'var(--chalk)', borderBottom: '1px solid var(--pencil)',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8,
      }}>
        <Link to={`/students/${studentId}`} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--graphite)', textDecoration: 'none', fontSize: 12 }}>
          <ArrowLeft size={14} /> Back to profile
        </Link>
        <div style={{ marginLeft: 'auto' }}>
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
        <ProgressRadar
          assessments={data?.assessments || {}}
          studentSkills={data?.studentSkills || []}
          learningOutcomes={learningOutcomes}
        />
      </div>
    </div>
  );
}
