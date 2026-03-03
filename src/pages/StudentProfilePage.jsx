import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, RefreshCw, Check, X, Loader2, BookOpen, Sparkles, Clock, ChevronDown, ChevronUp, Copy, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { skills as skillsApi, ai, recommendations as recsApi } from '../lib/api';
import TopBar from '../components/layout/TopBar';

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

export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [student, setStudent] = useState(null);
  const [studentSkills, setStudentSkills] = useState([]);
  const [quests, setQuests] = useState([]);
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);
  const [pinCopied, setPinCopied] = useState(false);
  const [masteryOpen, setMasteryOpen] = useState(false);

  useEffect(() => {
    if (id && user) loadAll();
  }, [id, user]);

  async function loadAll() {
    setLoading(true);
    setLoadError('');

    // Load student
    const { data: stu, error: stuErr } = await supabase
      .from('students')
      .select('*, quest_students(quest_id, quests(id, title, status, career_pathway, created_at))')
      .eq('id', id)
      .single();

    if (stuErr || !stu) {
      setLoadError('Student not found.');
      setLoading(false);
      return;
    }

    // Verify ownership
    if (stu.guide_id !== user.id) {
      setLoadError('You do not have access to this student.');
      setLoading(false);
      return;
    }

    setStudent(stu);
    setQuests((stu.quest_students || []).map(qs => qs.quests).filter(Boolean));

    // Load skills
    const { data: sk } = await skillsApi.getStudentSkills(id);
    if (sk) setStudentSkills(sk);

    // Load recommendations
    const { data: r } = await recsApi.list(id);
    if (r) setRecs(r);

    setLoading(false);
  }

  async function handleRefreshRecs() {
    if (!student) return;
    setAiLoading(true);

    try {
      const result = await ai.recommendSkills({
        name: student.name,
        age: student.age,
        gradeBand: student.grade_band,
        interests: student.interests,
        passions: student.passions,
        selfAssessment: student.self_assessment,
      });

      // Store in DB
      const { data: rec } = await recsApi.create({
        studentId: student.id,
        type: 'skills',
        content: result,
      });

      if (rec) setRecs(prev => [rec, ...prev]);
    } catch (err) {
      console.error('AI recommendation error:', err);
    }

    setAiLoading(false);
  }

  async function handleAcceptRec(rec) {
    await recsApi.updateStatus(rec.id, 'accepted');
    setRecs(prev => prev.map(r => r.id === rec.id ? { ...r, status: 'accepted' } : r));
  }

  async function handleDismissRec(rec) {
    await recsApi.updateStatus(rec.id, 'dismissed');
    setRecs(prev => prev.map(r => r.id === rec.id ? { ...r, status: 'dismissed' } : r));
  }

  function copyPin() {
    if (!student?.pin) return;
    navigator.clipboard.writeText(student.pin).then(() => {
      setPinCopied(true);
      setTimeout(() => setPinCopied(false), 2500);
    });
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <TopBar />
        <main style={styles.main}>
          <div style={{ textAlign: 'center', padding: '64px 0', color: T.graphite }}>
            <Loader2 size={24} style={{ animation: 'sp-spin 1s linear infinite' }} />
            <p style={{ marginTop: 12, fontFamily: 'var(--font-body)' }}>Loading profile...</p>
          </div>
        </main>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={styles.page}>
        <TopBar />
        <main style={styles.main}>
          <div style={styles.content}>
            <p style={{ color: T.specimenRed, fontFamily: 'var(--font-body)', textAlign: 'center', padding: '64px 0' }}>{loadError}</p>
          </div>
        </main>
      </div>
    );
  }

  const interests = Array.isArray(student.interests) ? student.interests : [];
  const passionsArr = Array.isArray(student.passions) ? student.passions : [];
  const grouped = {
    core: studentSkills.filter(s => s.category === 'core'),
    soft: studentSkills.filter(s => s.category === 'soft'),
    interest: studentSkills.filter(s => s.category === 'interest'),
  };
  const latestRec = recs.find(r => r.type === 'skills' && r.status === 'pending');

  return (
    <div style={styles.page}>
      <style>{`@keyframes sp-spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
      <TopBar />

      <main style={styles.main}>
        <div style={styles.content}>
          {/* Back */}
          <button
            onClick={() => navigate('/students')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: T.graphite, fontFamily: 'var(--font-body)', fontSize: 13, marginBottom: 16, padding: 0 }}
          >
            <ChevronLeft size={16} /> All Students
          </button>

          {/* ── Header ──────────────────────────────────────────────── */}
          <div style={styles.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={styles.avatarLg}>
                {student.avatar_emoji || student.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: T.ink, margin: 0 }}>
                  {student.name}
                </h1>
                <div style={{ fontSize: 13, color: T.graphite, fontFamily: 'var(--font-body)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {student.grade_band && <span style={styles.gradeBadge}>{student.grade_band}</span>}
                  {student.age && <span>Age {student.age}</span>}
                  {student.onboarded_at && (
                    <span style={{ color: T.fieldGreen, fontWeight: 600, fontSize: 11 }}>
                      Onboarded
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* PIN */}
            {student.pin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: T.graphite, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Code:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: T.ink, letterSpacing: '0.2em', background: T.parchment, padding: '2px 10px', borderRadius: 6 }}>
                  {pinVisible ? student.pin : '••••'}
                </span>
                <button onClick={() => setPinVisible(v => !v)} title={pinVisible ? 'Hide' : 'Show'} style={styles.iconBtn}>
                  {pinVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button onClick={copyPin} title="Copy" style={styles.iconBtn}>
                  {pinCopied ? <Check size={14} color={T.fieldGreen} /> : <Copy size={14} />}
                </button>
              </div>
            )}
          </div>

          {/* Interest chips */}
          {interests.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
              {interests.map(i => (
                <span key={i} className="skill-tag default" style={{ marginRight: 0 }}>{i}</span>
              ))}
            </div>
          )}

          {/* ── Skills Grid ─────────────────────────────────────────── */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Skills</h2>
            {Object.entries(grouped).map(([cat, catSkills]) => {
              if (catSkills.length === 0) return null;
              const label = cat === 'core' ? 'Core' : cat === 'soft' ? 'People' : 'Interest';
              return (
                <div key={cat} style={{ marginBottom: 16 }}>
                  <div style={styles.catLabel}>{label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {catSkills.map(sk => {
                      const prof = PROFICIENCY_COLORS[sk.proficiency] || PROFICIENCY_COLORS.none;
                      return (
                        <span
                          key={sk.skill_id}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '4px 12px', borderRadius: 20,
                            background: prof.bg, color: prof.text,
                            fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-body)',
                          }}
                          title={`${sk.skill_name}: ${prof.label}`}
                        >
                          {sk.skill_name}
                          <span style={{ fontSize: 10, opacity: 0.7 }}>({prof.label})</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {studentSkills.length === 0 && (
              <p style={{ color: T.pencil, fontSize: 13, fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
                No skills tracked yet. AI recommendations can help identify starting points.
              </p>
            )}
          </section>

          {/* ── AI Recommendations ──────────────────────────────────── */}
          <section style={styles.section}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
                <Sparkles size={16} style={{ marginRight: 6, color: T.compassGold }} />
                AI Recommendations
              </h2>
              <button
                onClick={handleRefreshRecs}
                disabled={aiLoading}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 8,
                  border: `1px solid ${T.pencil}`, background: T.chalk,
                  color: T.graphite, fontSize: 12, fontWeight: 600,
                  fontFamily: 'var(--font-body)', cursor: aiLoading ? 'default' : 'pointer',
                  opacity: aiLoading ? 0.6 : 1, transition: 'all 150ms',
                }}
              >
                {aiLoading ? (
                  <><Loader2 size={13} style={{ animation: 'sp-spin 1s linear infinite' }} /> Generating...</>
                ) : (
                  <><RefreshCw size={13} /> Refresh</>
                )}
              </button>
            </div>

            {latestRec ? (
              <RecCard rec={latestRec} onAccept={handleAcceptRec} onDismiss={handleDismissRec} />
            ) : recs.length > 0 ? (
              <p style={{ color: T.pencil, fontSize: 13, fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
                All recommendations reviewed. Click "Refresh" to generate new ones.
              </p>
            ) : (
              <p style={{ color: T.pencil, fontSize: 13, fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
                No recommendations yet. Click "Refresh" to generate skill and quest pathway recommendations.
              </p>
            )}
          </section>

          {/* ── Quest History ───────────────────────────────────────── */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <BookOpen size={16} style={{ marginRight: 6 }} />
              Quest History
            </h2>
            {quests.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {quests.map(q => (
                  <div
                    key={q.id}
                    onClick={() => navigate(`/quest/${q.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 10, background: T.chalk,
                      border: `1px solid ${T.parchment}`, cursor: 'pointer',
                      transition: 'border-color 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.labBlue; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = T.parchment; }}
                  >
                    <div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: T.ink }}>
                        {q.title}
                      </div>
                      <div style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)', marginTop: 2 }}>
                        {q.career_pathway && <span style={{ textTransform: 'capitalize' }}>{q.career_pathway.replace('_', ' ')} · </span>}
                        {new Date(q.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span style={{
                      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                      background: q.status === 'active' ? '#D1FAE5' : q.status === 'completed' ? '#DBEAFE' : T.parchment,
                      color: q.status === 'active' ? '#065F46' : q.status === 'completed' ? '#1E40AF' : T.graphite,
                    }}>
                      {q.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: T.pencil, fontSize: 13, fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
                No quests assigned yet.
              </p>
            )}
          </section>

          {/* ── About ──────────────────────────────────────────────── */}
          {(student.about_me || passionsArr.length > 0) && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>About</h2>
              {passionsArr.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={styles.catLabel}>Passions</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {passionsArr.map(p => (
                      <span key={p} style={{ padding: '4px 12px', borderRadius: 20, background: `${T.compassGold}15`, color: T.compassGold, fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-body)' }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {student.about_me && (
                <p style={{ fontSize: 14, color: T.ink, fontFamily: 'var(--font-body)', lineHeight: 1.6, background: T.paper, padding: '12px 16px', borderRadius: 10 }}>
                  "{student.about_me}"
                </p>
              )}
            </section>
          )}

          {/* ── Mastery Dashboard Placeholder ──────────────────────── */}
          <section style={{ ...styles.section, borderBottom: 'none' }}>
            <button
              onClick={() => setMasteryOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%' }}
            >
              <Clock size={16} color={T.graphite} />
              <span style={{ ...styles.sectionTitle, marginBottom: 0, flex: 1, textAlign: 'left' }}>
                Skill Growth Over Time
              </span>
              {masteryOpen ? <ChevronUp size={16} color={T.graphite} /> : <ChevronDown size={16} color={T.graphite} />}
            </button>
            {masteryOpen && (
              <div style={{ marginTop: 16, padding: '24px 20px', background: T.parchment, borderRadius: 10, textAlign: 'center' }}>
                <Clock size={28} color={T.pencil} style={{ marginBottom: 8 }} />
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: T.ink, marginBottom: 4 }}>Coming Soon</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: T.graphite }}>
                  Track how skills evolve across quests and over time.
                </p>
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}

// ── Recommendation Card ──────────────────────────────────────────────────────

function RecCard({ rec, onAccept, onDismiss }) {
  const content = rec.content || {};

  return (
    <div style={{ background: T.paper, borderRadius: 12, padding: '16px 18px', border: `1px solid ${T.parchment}` }}>
      {/* Core focus */}
      {content.core_focus?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.labBlue, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Core Focus Areas
          </div>
          {content.core_focus.map((item, i) => (
            <div key={i} style={{ fontSize: 13, color: T.ink, fontFamily: 'var(--font-body)', marginBottom: 4 }}>
              <strong>{item.skill}</strong> — {item.reason}
            </div>
          ))}
        </div>
      )}

      {/* Interest skills */}
      {content.interest_skills?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.fieldGreen, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Interest Skills
          </div>
          {content.interest_skills.map((item, i) => (
            <div key={i} style={{ fontSize: 13, color: T.ink, fontFamily: 'var(--font-body)', marginBottom: 4 }}>
              <strong>{item.skill}</strong> — {item.reason}
            </div>
          ))}
        </div>
      )}

      {/* Quest pathways */}
      {content.quest_pathways?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.compassGold, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Quest Pathway Ideas
          </div>
          {content.quest_pathways.map((item, i) => (
            <div key={i} style={{ fontSize: 13, color: T.ink, fontFamily: 'var(--font-body)', marginBottom: 6, padding: '8px 10px', background: T.chalk, borderRadius: 8, border: `1px solid ${T.parchment}` }}>
              <div style={{ fontWeight: 600 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: T.graphite, marginTop: 2 }}>{item.description}</div>
              {item.career_connection && (
                <div style={{ fontSize: 11, color: T.labBlue, marginTop: 2 }}>Career: {item.career_connection}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {rec.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 10, borderTop: `1px solid ${T.parchment}` }}>
          <button onClick={() => onDismiss(rec)} className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }}>
            <X size={13} style={{ marginRight: 3 }} /> Dismiss
          </button>
          <button onClick={() => onAccept(rec)} className="btn btn-primary" style={{ fontSize: 12, padding: '5px 12px' }}>
            <Check size={13} style={{ marginRight: 3 }} /> Accept
          </button>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  page: { display: 'flex', flexDirection: 'column', minHeight: '100vh', background: T.paper },
  main: { flex: 1, padding: '24px 24px 64px' },
  content: { maxWidth: 720, margin: '0 auto' },

  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16, flexWrap: 'wrap', gap: 12,
  },
  avatarLg: {
    width: 52, height: 52, borderRadius: '50%',
    background: T.parchment, border: `2px solid ${T.pencil}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 24, fontFamily: 'var(--font-mono)', fontWeight: 500, color: T.ink,
    userSelect: 'none', flexShrink: 0,
  },
  gradeBadge: {
    display: 'inline-block', background: T.parchment, border: `1px solid ${T.pencil}`,
    borderRadius: 100, padding: '1px 8px', fontFamily: 'var(--font-mono)',
    fontSize: 10, fontWeight: 500, color: T.graphite, letterSpacing: '0.04em',
  },
  iconBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'none', border: 'none', cursor: 'pointer', color: T.graphite, padding: 2,
  },

  section: {
    marginBottom: 28, paddingBottom: 28, borderBottom: `1px solid ${T.parchment}`,
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)', fontSize: 18, color: T.ink,
    marginBottom: 12, display: 'flex', alignItems: 'center',
  },
  catLabel: {
    fontSize: 11, fontWeight: 700, color: T.graphite, fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
  },
};
