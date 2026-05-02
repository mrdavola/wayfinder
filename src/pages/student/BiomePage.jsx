import { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useViewMode } from '../../hooks/useViewMode';
import { useBiomeQuest } from '../../hooks/useBiomeQuest';
import { getStudentSession } from '../../lib/studentSession';
import { supabase } from '../../lib/supabase';
import BiomeScene from '../../components/world/BiomeScene';

const StudentQuestPage = lazy(() => import('./StudentQuestPage'));

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--paper, #fbf6e7)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 32, height: 32, border: '3px solid var(--pencil)', borderTopColor: 'var(--compass-gold)',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
        }}/>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--graphite)', fontSize: 14 }}>
          Entering the world…
        </p>
      </div>
    </div>
  );
}

function ErrorScreen({ message }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--paper)' }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--graphite)' }}>
          {message || 'Could not load this project.'}
        </p>
        <a href="?view=list" style={{ color: 'var(--lab-blue)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          Switch to list view →
        </a>
      </div>
    </div>
  );
}

export default function BiomePage() {
  const { id } = useParams();
  const { isWorld } = useViewMode();

  if (!isWorld) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <StudentQuestPage />
      </Suspense>
    );
  }

  return <BiomePageWorld questId={id} />;
}

function BiomePageWorld({ questId }) {
  const { quest, stages, loading, error, refreshStages } = useBiomeQuest(questId);
  const studentSession = useMemo(() => getStudentSession() || {}, []);
  const [feedback, setFeedback] = useState([]);

  useEffect(() => {
    if (!questId) return;
    let cancelled = false;
    const studentId = studentSession.studentId || null;
    const name      = studentSession.studentName || null;
    let q = supabase
      .from('submission_feedback')
      .select('*')
      .eq('quest_id', questId)
      .order('created_at', { ascending: false });
    if (studentId) q = q.eq('student_id', studentId);
    else if (name)  q = q.eq('student_name', name);
    q.then(({ data, error: err }) => {
      if (cancelled) return;
      if (!err) setFeedback(data || []);
    });
    return () => { cancelled = true; };
  }, [questId, studentSession.studentId, studentSession.studentName]);

  if (loading) return <LoadingScreen />;
  if (error || !quest) return <ErrorScreen message={error?.message} />;

  return (
    <BiomeScene
      quest={quest}
      stages={stages}
      studentSession={studentSession}
      feedback={feedback}
      onStageComplete={refreshStages}
    />
  );
}
