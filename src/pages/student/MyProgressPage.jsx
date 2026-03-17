import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LearnerProgress from '../../components/progress/LearnerProgress';
import { supabase } from '../../lib/supabase';
import { getStudentSession } from '../../lib/studentSession';

export default function MyProgressPage() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getStudentSession();
    if (!session?.studentId || !session?.studentName) {
      navigate('/');
      return;
    }
    loadData(session);
  }, []);

  async function loadData(session) {
    setStudent({ id: session.studentId, name: session.studentName });

    const { data: questData } = await supabase
      .from('quests')
      .select('id, title, status, quest_stages(id, status)')
      .contains('student_names', [session.studentName])
      .order('created_at', { ascending: false });

    const enriched = (questData || []).map(q => ({
      ...q,
      total_stages: q.quest_stages?.length || 0,
      completed_stages: q.quest_stages?.filter(s => s.status === 'completed').length || 0,
    }));
    setQuests(enriched);
    setLoading(false);
  }

  if (loading || !student) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--graphite)', fontFamily: 'var(--font-body)' }}>Loading...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <div className="container" style={{ paddingTop: 24, paddingBottom: 48, maxWidth: 800 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--graphite)',
            marginBottom: 20,
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-xl)',
          color: 'var(--ink)',
          marginBottom: 4,
        }}>
          My Progress
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'var(--graphite)',
          marginBottom: 24,
        }}>
          {student.name}'s learning journey
        </p>

        <LearnerProgress
          studentId={student.id}
          studentName={student.name}
          isGuide={false}
          quests={quests}
        />
      </div>
    </div>
  );
}
