import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  BookOpen, CheckCircle, Clock, ChevronRight,
  LogOut, Loader2, AlertCircle, Lock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getStudentSession, clearStudentSession } from '../../lib/studentSession';
import WayfinderLogoIcon from '../../components/icons/WayfinderLogo';

const PATHWAY_COLORS = {
  biology: '#2D6A4F',
  material_science: '#1B4965',
  healthcare: '#C0392B',
  engineering: '#7C3AED',
  technology: '#0369A1',
  math: '#B8860B',
  writing: '#92400E',
  default: '#6B7280',
};

function pathwayColor(pathway) {
  return PATHWAY_COLORS[pathway] || PATHWAY_COLORS.default;
}

function QuestCard({ quest }) {
  const total = Number(quest.total_stages) || 0;
  const done = Number(quest.stages_completed) || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const isComplete = quest.status === 'completed';
  const color = pathwayColor(quest.career_pathway);

  return (
    <div style={{
      background: 'var(--chalk)',
      border: '1px solid var(--pencil)',
      borderRadius: 14,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'box-shadow 150ms ease',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(26,26,46,0.1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Color bar */}
      <div style={{ height: 4, background: color }} />

      <div style={{ padding: '20px 20px 16px', flex: 1 }}>
        {/* Status badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          {quest.career_pathway && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color,
              textTransform: 'uppercase',
            }}>
              {quest.career_pathway.replace(/_/g, ' ')}
            </span>
          )}
          {isComplete ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--field-green)', fontWeight: 600 }}>
              <CheckCircle size={12} />
              Completed
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--graphite)' }}>
              <Clock size={12} />
              {quest.total_duration_days}d quest
            </span>
          )}
        </div>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 17,
          color: 'var(--ink)',
          letterSpacing: '-0.01em',
          marginBottom: 6,
          lineHeight: 1.2,
        }}>
          {quest.title}
        </h2>

        {quest.subtitle && (
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--graphite)',
            lineHeight: 1.5,
            marginBottom: 14,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {quest.subtitle}
          </p>
        )}

        {/* Progress bar */}
        {total > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--graphite)' }}>
                {done}/{total} stages
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)' }}>
                {pct}%
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--parchment)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: isComplete ? 'var(--field-green)' : color,
                borderRadius: 3,
                transition: 'width 600ms ease',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Enter button */}
      <div style={{ padding: '0 20px 16px' }}>
        <Link
          to={`/q/${quest.id}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            width: '100%',
            padding: '10px',
            borderRadius: 8,
            background: isComplete ? 'var(--parchment)' : color,
            color: isComplete ? 'var(--graphite)' : 'var(--chalk)',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'opacity 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          {isComplete ? 'View Quest' : 'Continue Quest'}
          <ChevronRight size={15} />
        </Link>
      </div>
    </div>
  );
}

export default function StudentHome() {
  const navigate = useNavigate();
  const session = getStudentSession();

  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authStudent, setAuthStudent] = useState(null); // for Supabase-auth students

  // Check for Supabase auth session (self-registered students)
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch their profile to get name + linked_student_id
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name, role, linked_student_id')
          .eq('id', user.id)
          .maybeSingle();
        if (prof?.role === 'student' && prof?.linked_student_id) {
          setAuthStudent({ studentId: prof.linked_student_id, studentName: prof.full_name });
          return;
        }
        if (prof?.role === 'student') {
          // Joined but no linked student yet — show empty state
          setAuthStudent({ studentId: null, studentName: prof.full_name });
          setLoading(false);
          return;
        }
      }
      // Fall back to PIN session
      if (!session?.studentId) {
        navigate('/student/login', { replace: true });
      }
    }
    checkAuth();
  }, []);

  const activeSession = authStudent || session;

  useEffect(() => {
    if (activeSession?.studentId) loadQuests();
  }, [authStudent]);

  useEffect(() => {
    if (!authStudent && session?.studentId) loadQuests();
  }, []);

  async function loadQuests() {
    const studentId = authStudent?.studentId || session?.studentId;
    if (!studentId) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: rpcErr } = await supabase.rpc('get_student_quests', {
        p_student_id: studentId,
      });
      if (rpcErr) throw rpcErr;
      setQuests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load quests');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    clearStudentSession();
    await supabase.auth.signOut();
    navigate('/student/login', { replace: true });
  }

  const displayName = activeSession?.studentName || session?.studentName || '...';

  const active = quests.filter((q) => q.status === 'active');
  const completed = quests.filter((q) => q.status === 'completed');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes sh-fade { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes sh-spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>

      {/* Top bar */}
      <header style={{
        background: 'var(--chalk)',
        borderBottom: '1px solid var(--pencil)',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <WayfinderLogoIcon size={20} color="var(--ink)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--ink)', letterSpacing: '-0.01em' }}>
            Wayfinder
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)' }}>
            Hi, <strong style={{ color: 'var(--ink)' }}>{displayName}</strong>
          </span>
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'none', border: '1px solid var(--pencil)',
              borderRadius: 6, padding: '5px 10px',
              fontFamily: 'var(--font-body)', fontSize: 12,
              color: 'var(--graphite)', cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--parchment)'; e.currentTarget.style.color = 'var(--ink)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--graphite)'; }}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, maxWidth: 900, width: '100%', margin: '0 auto', padding: '32px 24px 48px', animation: 'sh-fade 300ms ease' }}>

        {/* Hero */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            color: 'var(--ink)',
            letterSpacing: '-0.02em',
            marginBottom: 6,
          }}>
            Your Quests
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--graphite)' }}>
            Pick up where you left off or explore what's next.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 32, justifyContent: 'center' }}>
            <Loader2 size={20} color="var(--graphite)" style={{ animation: 'sh-spin 1s linear infinite' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)' }}>Loading your quests…</span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: '#FDECEA', borderRadius: 10, border: '1px solid #FBBCB8', marginBottom: 24 }}>
            <AlertCircle size={16} color="var(--specimen-red)" />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--specimen-red)' }}>{error}</span>
          </div>
        )}

        {/* Active quests */}
        {!loading && active.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12, color: 'var(--graphite)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
              In progress
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {active.map((q) => <QuestCard key={q.id} quest={q} />)}
            </div>
          </div>
        )}

        {/* Completed quests */}
        {!loading && completed.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12, color: 'var(--graphite)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
              Completed
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {completed.map((q) => <QuestCard key={q.id} quest={q} />)}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && quests.length === 0 && !error && (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            background: 'var(--chalk)', borderRadius: 16,
            border: '1px solid var(--pencil)',
          }}>
            <Lock size={36} color="var(--pencil)" strokeWidth={1.5} style={{ marginBottom: 16 }} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)', marginBottom: 8 }}>
              No quests yet
            </h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)', maxWidth: 320, margin: '0 auto' }}>
              Your guide hasn't assigned any quests to you yet. Check back soon!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
