import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, BookOpen, Star, Clock, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import WayfinderLogoIcon from '../../components/icons/WayfinderLogo';

const T = {
  ink: '#1A1A2E', paper: '#FAF8F5', parchment: '#F0EDE6',
  graphite: '#6B7280', pencil: '#9CA3AF', chalk: '#FFFFFF',
  fieldGreen: '#2D6A4F', labBlue: '#1B4965', compassGold: '#B8860B',
  specimenRed: '#C0392B',
};

const PROFICIENCY_COLORS = {
  none: { bg: T.parchment, text: T.pencil, label: 'Not rated' },
  emerging: { bg: '#FEF3C7', text: '#92400E', label: 'Emerging' },
  developing: { bg: '#DBEAFE', text: '#1E40AF', label: 'Developing' },
  proficient: { bg: '#D1FAE5', text: '#065F46', label: 'Proficient' },
  advanced: { bg: '#E0E7FF', text: '#3730A3', label: 'Advanced' },
};

// ── Skills catalog for multi-select ──
const SKILL_OPTIONS = [
  'Critical Thinking', 'Problem Solving', 'Written Communication',
  'Collaboration', 'Scientific Reasoning', 'Data Analysis',
  'Creativity', 'Self-Direction', 'Perseverance', 'Empathy',
];

// ── Onboarding Form ──
function OnboardingForm({ onComplete, saving }) {
  const [parentName, setParentName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [childLoves, setChildLoves] = useState('');
  const [expectations, setExpectations] = useState('');
  const [priorities, setPriorities] = useState([]);

  const togglePriority = (skill) => {
    setPriorities(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };

  return (
    <div style={{ maxWidth: 520, width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <WayfinderLogoIcon size={32} color={T.fieldGreen} style={{ display: 'block', margin: '0 auto' }} />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: T.ink, margin: '14px 0 6px' }}>
          Welcome to Wayfinder
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: T.graphite, lineHeight: 1.6 }}>
          Tell us a little about yourself so we can personalize your child's learning experience.
        </p>
      </div>

      <div style={{
        background: T.chalk, borderRadius: 16, border: `1px solid ${T.parchment}`,
        boxShadow: '0 4px 24px rgba(26,26,46,0.06)', padding: '28px 28px 24px',
      }}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Your name</label>
          <input
            type="text" value={parentName} onChange={e => setParentName(e.target.value)}
            placeholder="e.g. Sarah" style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Relationship to child</label>
          <select value={relationship} onChange={e => setRelationship(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">Select...</option>
            <option value="parent">Parent</option>
            <option value="guardian">Guardian</option>
            <option value="grandparent">Grandparent</option>
            <option value="other">Other family</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>What does your child love?</label>
          <textarea
            value={childLoves} onChange={e => setChildLoves(e.target.value)}
            placeholder="What lights them up? What do they talk about all the time?"
            rows={3} style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>What are your expectations for their learning?</label>
          <textarea
            value={expectations} onChange={e => setExpectations(e.target.value)}
            placeholder="What skills or growth do you hope to see?"
            rows={3} style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Which core skills matter most to you?</label>
          <p style={{ fontSize: 11, color: T.graphite, margin: '0 0 8px' }}>Select as many as you like.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SKILL_OPTIONS.map(skill => (
              <button
                key={skill}
                onClick={() => togglePriority(skill)}
                style={{
                  padding: '5px 12px', borderRadius: 100,
                  border: `1.5px solid ${priorities.includes(skill) ? T.fieldGreen : T.pencil}`,
                  background: priorities.includes(skill) ? 'rgba(45,106,79,0.08)' : 'transparent',
                  color: priorities.includes(skill) ? T.fieldGreen : T.graphite,
                  fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-body)',
                  cursor: 'pointer', transition: 'all 150ms',
                }}
              >
                {priorities.includes(skill) && <CheckCircle size={11} style={{ marginRight: 4, verticalAlign: '-2px' }} />}
                {skill}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onComplete({ parentName, relationship, childLoves, expectations, priorities })}
          disabled={saving || !parentName.trim()}
          style={{
            width: '100%', padding: '13px', borderRadius: 10, border: 'none',
            background: saving || !parentName.trim() ? T.pencil : T.fieldGreen,
            color: saving || !parentName.trim() ? T.graphite : T.chalk,
            fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-body)',
            cursor: saving || !parentName.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {saving ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : 'Continue to Dashboard'}
        </button>
      </div>
    </div>
  );
}

// ── Dashboard View ──
function DashboardView({ data }) {
  if (!data) return null;
  const { parent, student, quests, skills, snapshots } = data;

  return (
    <div style={{ maxWidth: 640, width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <WayfinderLogoIcon size={24} color={T.fieldGreen} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: T.ink }}>
          Wayfinder
        </span>
        <div style={{ flex: 1 }} />
        {parent?.parent_name && (
          <span style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)' }}>
            Welcome, {parent.parent_name}
          </span>
        )}
      </div>

      {/* Student info */}
      <div style={{
        background: T.chalk, borderRadius: 16, border: `1px solid ${T.parchment}`,
        boxShadow: '0 4px 20px rgba(26,26,46,0.06)', padding: '20px 24px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: T.parchment, border: `2px solid ${T.pencil}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontFamily: 'var(--font-mono)', color: T.ink,
        }}>
          {student.avatar_emoji || student.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: T.ink, margin: 0 }}>
            {student.name}
          </h2>
          <div style={{ fontSize: 13, color: T.graphite, fontFamily: 'var(--font-body)', marginTop: 2 }}>
            {student.grade_band && <span>{student.grade_band} · </span>}
            {student.age && <span>Age {student.age}</span>}
          </div>
        </div>
      </div>

      {/* Active Quests */}
      <section style={{ marginBottom: 24 }}>
        <h3 style={sectionTitle}><BookOpen size={15} style={{ marginRight: 6 }} /> Active Quests</h3>
        {quests.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quests.map(q => {
              const pct = q.stages_total > 0 ? Math.round((q.stages_done / q.stages_total) * 100) : 0;
              return (
                <div key={q.id} style={{
                  background: T.chalk, borderRadius: 12, border: `1px solid ${T.parchment}`,
                  padding: '16px 18px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: T.ink }}>
                      {q.title}
                    </div>
                    <span style={{
                      padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                      fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                      background: q.status === 'completed' ? '#D1FAE5' : '#DBEAFE',
                      color: q.status === 'completed' ? '#065F46' : '#1E40AF',
                    }}>
                      {q.status}
                    </span>
                  </div>
                  {q.parent_summary && (
                    <p style={{ fontSize: 12, color: T.graphite, lineHeight: 1.6, margin: '0 0 10px' }}>
                      {q.parent_summary}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 6, background: T.parchment, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: T.fieldGreen, borderRadius: 4, transition: 'width 500ms' }} />
                    </div>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: T.graphite }}>
                      {q.stages_done}/{q.stages_total}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: T.pencil, fontSize: 13, fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
            No active quests yet.
          </p>
        )}
      </section>

      {/* Skills Overview */}
      <section style={{ marginBottom: 24 }}>
        <h3 style={sectionTitle}><Star size={15} style={{ marginRight: 6 }} /> Skills Overview</h3>
        {skills.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {skills.map((sk, i) => {
              const prof = PROFICIENCY_COLORS[sk.proficiency] || PROFICIENCY_COLORS.none;
              return (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '4px 12px', borderRadius: 20,
                  background: prof.bg, color: prof.text,
                  fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-body)',
                }}>
                  {sk.skill_name}
                  <span style={{ fontSize: 10, opacity: 0.7 }}>({prof.label})</span>
                </span>
              );
            })}
          </div>
        ) : (
          <p style={{ color: T.pencil, fontSize: 13, fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
            Skills will appear as your child completes quests.
          </p>
        )}
      </section>

      {/* Growth Timeline */}
      <section>
        <h3 style={sectionTitle}><Clock size={15} style={{ marginRight: 6 }} /> Growth Timeline</h3>
        {snapshots.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {snapshots.map((snap, i) => {
              const prof = PROFICIENCY_COLORS[snap.proficiency] || PROFICIENCY_COLORS.none;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', background: T.chalk,
                  border: `1px solid ${T.parchment}`, borderRadius: 8,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: prof.text, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: T.ink, fontFamily: 'var(--font-body)' }}>
                    {snap.skill_name}
                  </span>
                  <span style={{ fontSize: 11, color: prof.text, fontWeight: 500 }}>{prof.label}</span>
                  <span style={{ fontSize: 10, color: T.pencil, fontFamily: 'var(--font-mono)' }}>
                    {new Date(snap.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: T.pencil, fontSize: 13, fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
            Growth data will appear as your child receives AI feedback on their work.
          </p>
        )}
      </section>
    </div>
  );
}

// ── Join With Student Code ──
function JoinWithCode() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const pin = code.trim();
    if (!pin) return;
    setChecking(true);
    setError('');

    const { data, error: rpcErr } = await supabase.rpc('parent_join_by_pin', { p_pin: pin });

    if (rpcErr || !data?.success) {
      setError(data?.error || rpcErr?.message || 'No student found with that code. Please check and try again.');
      setChecking(false);
      return;
    }

    navigate(`/parent/${data.token}`);
  }

  return (
    <div style={{ maxWidth: 420, width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <WayfinderLogoIcon size={32} color={T.fieldGreen} style={{ display: 'block', margin: '0 auto' }} />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: T.ink, margin: '14px 0 6px' }}>
          Parent Portal
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: T.graphite, lineHeight: 1.6 }}>
          Enter your child's student code to see their progress and share what matters to you about their learning.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{
        background: T.chalk, borderRadius: 16, border: `1px solid ${T.parchment}`,
        boxShadow: '0 4px 24px rgba(26,26,46,0.06)', padding: '28px 28px 24px',
      }}>
        <label style={labelStyle}>Student code</label>
        <p style={{ fontSize: 12, color: T.graphite, margin: '0 0 8px', lineHeight: 1.5 }}>
          Your child's guide gave them a 4-digit code. It's the same code they use to join projects.
        </p>
        <input
          type="text"
          value={code}
          onChange={e => { setCode(e.target.value); setError(''); }}
          placeholder="e.g. 4821"
          maxLength={6}
          style={{
            ...inputStyle,
            fontSize: 20, fontFamily: 'var(--font-mono)', fontWeight: 700,
            letterSpacing: '0.2em', textAlign: 'center', padding: '14px',
          }}
          autoFocus
        />

        {error && (
          <p style={{ fontSize: 12, color: T.specimenRed, margin: '8px 0 0', fontFamily: 'var(--font-body)' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={checking || !code.trim()}
          style={{
            width: '100%', padding: '13px', borderRadius: 10, border: 'none', marginTop: 16,
            background: checking || !code.trim() ? T.pencil : T.fieldGreen,
            color: checking || !code.trim() ? T.graphite : T.chalk,
            fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-body)',
            cursor: checking || !code.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {checking ? (
            <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Looking up...</>
          ) : (
            <><ArrowRight size={15} /> Continue</>
          )}
        </button>
      </form>
    </div>
  );
}

// ── Main ──
export default function ParentDashboard() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [dashData, setDashData] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // If no token, show the join-with-code screen
  const isJoinMode = !token;

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    loadDashboard();
  }, [token]);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.rpc('get_parent_dashboard', { p_token: token });
    if (err || data?.error) {
      setError(err?.message || data?.error || 'Invalid or expired link.');
      setLoading(false);
      return;
    }
    setDashData(data);
    setNeedsOnboarding(!data.parent?.onboarded_at);
    setLoading(false);
  }

  async function handleOnboard({ parentName, relationship, childLoves, expectations, priorities }) {
    setSaving(true);
    const { data, error: err } = await supabase.rpc('parent_onboard', {
      p_token: token,
      p_name: parentName,
      p_relationship: relationship || null,
      p_expectations: expectations || null,
      p_child_loves: childLoves || null,
      p_priorities: priorities || [],
    });
    if (err || !data?.success) {
      setError(err?.message || data?.error || 'Something went wrong.');
      setSaving(false);
      return;
    }
    // Reload dashboard
    await loadDashboard();
    setSaving(false);
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <Loader2 size={24} color={T.fieldGreen} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: 12, color: T.graphite, fontFamily: 'var(--font-body)' }}>Loading...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <WayfinderLogoIcon size={36} color={T.specimenRed} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: T.ink, margin: '14px 0 6px' }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: 14, color: T.graphite, fontFamily: 'var(--font-body)' }}>{error}</p>
      </div>
    );
  }

  if (isJoinMode) {
    return (
      <div style={pageStyle}>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <JoinWithCode />
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      {needsOnboarding ? (
        <OnboardingForm onComplete={handleOnboard} saving={saving} />
      ) : (
        <DashboardView data={dashData} />
      )}
    </div>
  );
}

// ── Shared styles ──
const pageStyle = {
  minHeight: '100vh', background: T.paper,
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'flex-start', padding: '40px 24px',
  fontFamily: 'var(--font-body)',
};

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '10px 12px', borderRadius: 8,
  border: `1.5px solid ${T.pencil}`, background: T.chalk,
  fontSize: 14, fontFamily: 'var(--font-body)', color: T.ink,
  lineHeight: 1.5,
};

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: T.ink, fontFamily: 'var(--font-body)', marginBottom: 4,
};

const sectionTitle = {
  fontFamily: 'var(--font-display)', fontSize: 16, color: T.ink,
  margin: '0 0 12px', display: 'flex', alignItems: 'center',
};
