import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, RefreshCw, Check, X, Loader2, BookOpen, Sparkles, Clock, ChevronDown, ChevronUp, Copy, Eye, EyeOff, Shield, Plus, Lightbulb, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { skills as skillsApi, ai, recommendations as recsApi, skillSnapshots as snapshotsApi, studentStandards as stdApi, projectSuggestions as suggestionsApi } from '../lib/api';
import { STANDARDS_FRAMEWORKS, getStandardsByGradeBand } from '../data/standardsFrameworks';
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
  const [snapshots, setSnapshots] = useState([]);
  const [parentInfo, setParentInfo] = useState(null);
  const [standards, setStandards] = useState([]);
  const [standardsOpen, setStandardsOpen] = useState({ core: true, recommended: false, supplementary: false });
  const [stdAiLoading, setStdAiLoading] = useState(false);
  const [stdAiResults, setStdAiResults] = useState(null);
  const [stdInitLoading, setStdInitLoading] = useState(false);
  const [projectIdeas, setProjectIdeas] = useState([]);
  const [ideasLoading, setIdeasLoading] = useState(false);

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

    // Load skill snapshots
    const { data: snaps } = await snapshotsApi.listForStudent(id);
    if (snaps) setSnapshots(snaps);

    // Load parent info
    const { data: parentData } = await supabase
      .from('parent_access')
      .select('parent_name, relationship, expectations, child_loves, core_skill_priorities, learning_outcomes, onboarded_at')
      .eq('student_id', id)
      .maybeSingle();
    if (parentData) setParentInfo(parentData);

    // Load student standards
    const { data: stds } = await stdApi.list(id);
    if (stds) setStandards(stds);

    // Load project ideas
    const { data: ideas } = await suggestionsApi.list(id);
    if (ideas) setProjectIdeas(ideas);

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

  async function handleInitStandards() {
    if (!student?.grade_band) return;
    setStdInitLoading(true);
    try {
      const available = getStandardsByGradeBand(student.grade_band);
      const { data } = await stdApi.initFromSchool(student.id, student.grade_band, available);
      if (data) setStandards(data);
    } catch (err) {
      console.error('Init standards error:', err);
    }
    setStdInitLoading(false);
  }

  async function handleAiRecommendStandards() {
    if (!student) return;
    setStdAiLoading(true);
    try {
      const available = getStandardsByGradeBand(student.grade_band || '3-5');
      const result = await ai.recommendStandards({
        student,
        currentStandards: standards,
        availableStandards: available,
      });
      setStdAiResults(result.recommendations || []);
    } catch (err) {
      console.error('AI recommend standards error:', err);
    }
    setStdAiLoading(false);
  }

  async function handleAcceptStdRec(rec) {
    const std = {
      standard_code: rec.standard_code,
      standard_label: rec.standard_code.split('.').slice(-2).join('.'),
      standard_description: '',
      subject: null,
      grade_band: student?.grade_band || null,
      source: 'ai',
      priority: rec.priority || 'recommended',
    };
    // Try to find label/description from frameworks
    for (const fw of STANDARDS_FRAMEWORKS) {
      for (const cat of fw.categories) {
        const found = cat.standards.find(s => s.id === rec.standard_code);
        if (found) {
          std.standard_label = found.label;
          std.standard_description = found.description;
          std.subject = fw.subject;
          break;
        }
      }
    }
    const { data } = await stdApi.bulkUpsert(student.id, [std]);
    if (data?.length) setStandards(prev => [...prev.filter(s => s.standard_code !== rec.standard_code), ...data]);
    setStdAiResults(prev => prev.filter(r => r.standard_code !== rec.standard_code));
  }

  async function handleRemoveStandard(stdId) {
    await stdApi.delete(stdId);
    setStandards(prev => prev.filter(s => s.id !== stdId));
  }

  async function handleToggleStdStatus(std) {
    const next = std.status === 'active' ? 'completed' : 'active';
    await stdApi.updateStatus(std.id, next);
    setStandards(prev => prev.map(s => s.id === std.id ? { ...s, status: next } : s));
  }

  async function handleGenerateIdeas() {
    if (!student) return;
    setIdeasLoading(true);
    try {
      const historyItems = quests.map(q => ({
        title: q.title, career_pathway: q.career_pathway, status: q.status,
      }));
      const result = await ai.suggestProjects({
        student,
        standards: standards.filter(s => s.status === 'active'),
        questHistory: historyItems,
      });
      const batchId = crypto.randomUUID();
      const rows = (result.suggestions || []).map(s => ({
        student_id: student.id,
        guide_id: user.id,
        title: s.title,
        description: s.description,
        standards_addressed: s.standards_addressed || [],
        career_connection: s.career_connection || null,
        real_world_problem: s.real_world_problem || {},
        estimated_duration_days: s.estimated_duration_days || 10,
        difficulty: s.difficulty || 'intermediate',
        batch_id: batchId,
      }));
      const { data: created } = await suggestionsApi.create(rows);
      if (created) setProjectIdeas(prev => [...created, ...prev]);
    } catch (err) {
      console.error('Generate ideas error:', err);
    }
    setIdeasLoading(false);
  }

  async function handleDismissIdea(ideaId) {
    await suggestionsApi.updateStatus(ideaId, 'dismissed');
    setProjectIdeas(prev => prev.filter(i => i.id !== ideaId));
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

          {/* Career Explorer link */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Link to={`/careers/${id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                borderRadius: 8, border: '1px solid ' + T.pencil, background: T.chalk,
                color: T.ink, fontSize: 12, fontWeight: 600, textDecoration: 'none',
              }}>
              <Briefcase size={13} /> Career Explorer
            </Link>
          </div>

          {/* AI Field Guide toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 8,
            background: T.parchment, marginBottom: 20,
          }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8,
              cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-body)',
              color: T.ink, userSelect: 'none', flex: 1,
            }}>
              <input
                type="checkbox"
                checked={student.allow_ai_guide !== false}
                onChange={async (e) => {
                  const val = e.target.checked;
                  setStudent(prev => ({ ...prev, allow_ai_guide: val }));
                  await supabase.from('students').update({ allow_ai_guide: val }).eq('id', student.id);
                }}
                style={{ width: 16, height: 16, accentColor: T.labBlue, cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: 600 }}>AI Field Guide</div>
                <div style={{ fontSize: 11, color: T.graphite, marginTop: 1 }}>
                  Allow AI chatbot on student-created projects
                </div>
              </div>
            </label>
            <Shield size={16} color={student.allow_ai_guide !== false ? T.labBlue : T.pencil} style={{ flexShrink: 0 }} />
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

          {/* ── Standards Profile ──────────────────────────────────── */}
          <section style={styles.section}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
                <BookOpen size={16} style={{ marginRight: 6, color: T.labBlue }} />
                Standards Profile
              </h2>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={handleAiRecommendStandards}
                  disabled={stdAiLoading}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 8,
                    border: `1px solid ${T.compassGold}`, background: `${T.compassGold}10`,
                    color: T.compassGold, fontSize: 11, fontWeight: 600,
                    fontFamily: 'var(--font-body)', cursor: stdAiLoading ? 'default' : 'pointer',
                    opacity: stdAiLoading ? 0.6 : 1,
                  }}
                >
                  {stdAiLoading ? <Loader2 size={12} style={{ animation: 'sp-spin 1s linear infinite' }} /> : <Sparkles size={12} />}
                  AI Suggest
                </button>
              </div>
            </div>

            {/* Badge count */}
            {standards.length > 0 && (
              <div style={{ marginBottom: 12, fontFamily: 'var(--font-body)', fontSize: 12, color: T.graphite }}>
                {standards.filter(s => s.status === 'active').length} active
                {standards.filter(s => s.status === 'completed').length > 0 && `, ${standards.filter(s => s.status === 'completed').length} completed`}
              </div>
            )}

            {/* AI Recommendations inline */}
            {stdAiResults && stdAiResults.length > 0 && (
              <div style={{ marginBottom: 16, padding: 12, border: `2px solid ${T.compassGold}`, borderRadius: 10, background: `${T.compassGold}08` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, fontFamily: 'var(--font-body)', marginBottom: 8 }}>
                  AI-Recommended Standards
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {stdAiResults.map((rec, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: T.chalk, borderRadius: 8, border: `1px solid ${T.parchment}` }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: T.ink, fontFamily: 'var(--font-mono)' }}>{rec.standard_code}</span>
                        <span style={{ fontSize: 11, color: T.graphite, fontFamily: 'var(--font-body)', marginLeft: 6 }}>{rec.reasoning}</span>
                        <span style={{
                          marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 4,
                          background: rec.priority === 'core' ? '#D1FAE5' : rec.priority === 'recommended' ? '#DBEAFE' : '#FEF3C7',
                          color: rec.priority === 'core' ? '#065F46' : rec.priority === 'recommended' ? '#1E40AF' : '#92400E',
                          fontFamily: 'var(--font-body)', fontWeight: 500,
                        }}>{rec.priority}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => handleAcceptStdRec(rec)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: T.fieldGreen }}>
                          <Check size={14} />
                        </button>
                        <button onClick={() => setStdAiResults(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: T.pencil }}>
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collapsible priority groups */}
            {['core', 'recommended', 'supplementary'].map(priority => {
              const items = standards.filter(s => s.priority === priority);
              if (items.length === 0 && standards.length > 0) return null;
              const borderColor = priority === 'core' ? T.fieldGreen : priority === 'recommended' ? T.labBlue : T.compassGold;
              const label = priority.charAt(0).toUpperCase() + priority.slice(1);
              const isOpen = standardsOpen[priority];
              return (
                <div key={priority} style={{ marginBottom: 10, borderLeft: `3px solid ${borderColor}`, borderRadius: 8, background: T.chalk, border: `1px solid ${T.parchment}`, borderLeftWidth: 3, borderLeftColor: borderColor }}>
                  <button
                    onClick={() => setStandardsOpen(prev => ({ ...prev, [priority]: !prev[priority] }))}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, fontFamily: 'var(--font-body)' }}>
                      {label} <span style={{ fontWeight: 400, color: T.graphite }}>({items.length})</span>
                    </span>
                    {isOpen ? <ChevronUp size={14} color={T.graphite} /> : <ChevronDown size={14} color={T.graphite} />}
                  </button>
                  {isOpen && items.length > 0 && (
                    <div style={{ padding: '0 14px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {items.map(std => (
                        <div key={std.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                          <button
                            onClick={() => handleToggleStdStatus(std)}
                            style={{
                              width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                              border: `1.5px solid ${std.status === 'completed' ? T.fieldGreen : T.pencil}`,
                              background: std.status === 'completed' ? T.fieldGreen : 'transparent',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                            }}
                          >
                            {std.status === 'completed' && <Check size={10} color={T.chalk} strokeWidth={3} />}
                          </button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: std.status === 'completed' ? T.pencil : T.ink, textDecoration: std.status === 'completed' ? 'line-through' : 'none' }}>
                              {std.standard_label}
                            </span>
                            <span style={{ fontSize: 11, color: T.graphite, fontFamily: 'var(--font-body)', marginLeft: 6 }}>
                              {std.standard_description}
                            </span>
                          </div>
                          <span style={{
                            fontSize: 9, padding: '1px 5px', borderRadius: 4, fontFamily: 'var(--font-mono)',
                            background: T.parchment, color: T.graphite, flexShrink: 0,
                          }}>{std.source}</span>
                          <button onClick={() => handleRemoveStandard(std.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: T.pencil, flexShrink: 0 }}>
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty state with Initialize button */}
            {standards.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ color: T.pencil, fontSize: 13, fontFamily: 'var(--font-body)', fontStyle: 'italic', marginBottom: 12 }}>
                  No standards assigned yet.
                </p>
                {student?.grade_band && (
                  <button
                    onClick={handleInitStandards}
                    disabled={stdInitLoading}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 8,
                      border: `1px solid ${T.labBlue}`, background: `${T.labBlue}10`,
                      color: T.labBlue, fontSize: 13, fontWeight: 600,
                      fontFamily: 'var(--font-body)', cursor: stdInitLoading ? 'default' : 'pointer',
                    }}
                  >
                    {stdInitLoading ? <Loader2 size={14} style={{ animation: 'sp-spin 1s linear infinite' }} /> : <Plus size={14} />}
                    Initialize from School ({student.grade_band})
                  </button>
                )}
              </div>
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
                No recommendations yet. Click "Refresh" to generate skill and project pathway recommendations.
              </p>
            )}
          </section>

          {/* ── Project Ideas ──────────────────────────────────────── */}
          <section style={styles.section}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
                <Lightbulb size={16} style={{ marginRight: 6, color: T.compassGold }} />
                Project Ideas
              </h2>
              <button
                onClick={handleGenerateIdeas}
                disabled={ideasLoading}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 8,
                  border: `1px solid ${T.compassGold}`, background: `${T.compassGold}15`,
                  color: T.compassGold, fontSize: 12, fontWeight: 600,
                  fontFamily: 'var(--font-body)', cursor: ideasLoading ? 'default' : 'pointer',
                  opacity: ideasLoading ? 0.6 : 1,
                }}
              >
                {ideasLoading ? <Loader2 size={12} style={{ animation: 'sp-spin 1s linear infinite' }} /> : <Sparkles size={12} />}
                Generate Ideas
              </button>
            </div>

            {projectIdeas.filter(i => i.status === 'suggested').length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {projectIdeas.filter(i => i.status === 'suggested').map(idea => {
                  const rwp = idea.real_world_problem || {};
                  return (
                    <div key={idea.id} style={{ padding: 14, border: `1px solid ${T.parchment}`, borderRadius: 10, background: T.chalk }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: 'var(--font-body)', marginBottom: 4 }}>
                        {idea.title}
                      </div>
                      <p style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)', lineHeight: 1.5, margin: '0 0 8px' }}>
                        {idea.description}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                        {idea.estimated_duration_days && (
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: T.parchment, color: T.graphite, fontFamily: 'var(--font-mono)' }}>
                            {idea.estimated_duration_days} days
                          </span>
                        )}
                        {idea.difficulty && (
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-mono)',
                            background: idea.difficulty === 'introductory' ? '#D1FAE5' : idea.difficulty === 'advanced' ? '#E0E7FF' : '#FEF3C7',
                            color: idea.difficulty === 'introductory' ? '#065F46' : idea.difficulty === 'advanced' ? '#3730A3' : '#92400E',
                          }}>
                            {idea.difficulty}
                          </span>
                        )}
                        {idea.career_connection && (
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: `${T.labBlue}15`, color: T.labBlue, fontFamily: 'var(--font-mono)' }}>
                            {idea.career_connection}
                          </span>
                        )}
                        {(idea.standards_addressed || []).slice(0, 3).map(std => (
                          <span key={std} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: T.parchment, color: T.graphite, fontFamily: 'var(--font-mono)' }}>
                            {std}
                          </span>
                        ))}
                      </div>
                      {rwp.description && (
                        <div style={{ fontSize: 11, color: T.graphite, fontFamily: 'var(--font-body)', padding: '6px 10px', borderRadius: 6, background: `${T.fieldGreen}08`, marginBottom: 8 }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, marginRight: 6,
                            background: rwp.source_type === 'real' ? '#D1FAE5' : '#FEF3C7',
                            color: rwp.source_type === 'real' ? '#065F46' : '#92400E',
                          }}>
                            {rwp.source_type === 'real' ? 'Real' : 'Inspired'}
                          </span>
                          {rwp.stakeholder && <strong>{rwp.stakeholder}: </strong>}
                          {rwp.description}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => navigate(`/quest/new?from=suggestion&id=${idea.id}`)}
                          style={{
                            padding: '6px 14px', borderRadius: 6,
                            background: T.ink, color: T.chalk, border: 'none',
                            fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer',
                          }}
                        >
                          Use This
                        </button>
                        <button
                          onClick={() => handleDismissIdea(idea.id)}
                          style={{
                            padding: '6px 14px', borderRadius: 6,
                            background: 'transparent', color: T.graphite, border: `1px solid ${T.pencil}`,
                            fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-body)', cursor: 'pointer',
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: T.pencil, fontSize: 13, fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
                AI can suggest projects based on {student?.name?.split(' ')[0] || 'this student'}'s interests and standards.
              </p>
            )}
          </section>

          {/* ── Quest History ───────────────────────────────────────── */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              <BookOpen size={16} style={{ marginRight: 6 }} />
              Project History
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
                No projects assigned yet.
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

          {/* ── Parent Info ──────────────────────────────────────────── */}
          {parentInfo?.onboarded_at && (
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Parent Input</h2>
              <div style={{ background: T.paper, borderRadius: 10, padding: '14px 16px', border: `1px solid ${T.parchment}` }}>
                {parentInfo.parent_name && (
                  <div style={{ fontSize: 13, color: T.ink, fontFamily: 'var(--font-body)', marginBottom: 8 }}>
                    <strong>{parentInfo.parent_name}</strong>
                    {parentInfo.relationship && <span style={{ color: T.graphite }}> ({parentInfo.relationship})</span>}
                  </div>
                )}
                {parentInfo.child_loves && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.compassGold, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                      What their child loves
                    </div>
                    <p style={{ fontSize: 12, color: T.ink, lineHeight: 1.5, margin: 0 }}>{parentInfo.child_loves}</p>
                  </div>
                )}
                {parentInfo.expectations && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.labBlue, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                      Learning expectations
                    </div>
                    <p style={{ fontSize: 12, color: T.ink, lineHeight: 1.5, margin: 0 }}>{parentInfo.expectations}</p>
                  </div>
                )}
                {parentInfo.core_skill_priorities?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.fieldGreen, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
                      Priority skills
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {parentInfo.core_skill_priorities.map(s => (
                        <span key={s} style={{
                          padding: '3px 10px', borderRadius: 20,
                          background: 'rgba(45,106,79,0.08)', color: T.fieldGreen,
                          fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-body)',
                        }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Learning Outcomes (from parent) ──────────────────── */}
          {parentInfo?.learning_outcomes?.length > 0 && (
            <section style={styles.section}>
              <div style={styles.sectionTitle}>
                <BookOpen size={16} color={T.labBlue} style={{ marginRight: 6, verticalAlign: '-3px' }} />
                Parent Learning Outcomes
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(() => {
                  const catColors = {
                    academic: T.fieldGreen,
                    'social-emotional': T.labBlue,
                    creative: T.compassGold,
                    'life-skills': T.specimenRed,
                  };
                  const priColors = {
                    high: { bg: '#FEE2E2', text: '#991B1B' },
                    medium: { bg: '#FEF3C7', text: '#92400E' },
                    low: { bg: '#F3F4F6', text: '#6B7280' },
                  };
                  const grouped = parentInfo.learning_outcomes.reduce((acc, o) => {
                    if (!acc[o.category]) acc[o.category] = [];
                    acc[o.category].push(o);
                    return acc;
                  }, {});
                  return Object.entries(grouped).map(([cat, items]) => (
                    <div key={cat}>
                      <div style={{ fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: catColors[cat] || T.graphite, marginBottom: 4 }}>
                        {cat}
                      </div>
                      {items.map(o => {
                        const ps = priColors[o.priority] || priColors.medium;
                        return (
                          <div key={o.id} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 10px', borderRadius: 6, marginBottom: 3,
                            background: T.chalk, border: `1px solid ${T.parchment}`,
                            borderLeft: `3px solid ${catColors[cat] || T.graphite}`,
                          }}>
                            <span style={{ flex: 1, fontSize: 12, color: T.ink, lineHeight: 1.4 }}>{o.description}</span>
                            <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', padding: '1px 5px', borderRadius: 3, background: ps.bg, color: ps.text }}>
                              {o.priority}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            </section>
          )}

          {/* ── Mastery Dashboard ──────────────────────────────────── */}
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
              <div style={{ marginTop: 16 }}>
                {snapshots.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {snapshots.map((snap, i) => {
                      const prof = PROFICIENCY_COLORS[snap.proficiency] || PROFICIENCY_COLORS.none;
                      const skillName = snap.skills?.name || snap.skill_name || 'Skill';
                      return (
                        <div key={snap.id || i} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px', background: T.chalk,
                          border: `1px solid ${T.parchment}`, borderRadius: 8,
                        }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: prof.text, flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: 'var(--font-body)' }}>
                              {skillName}
                            </span>
                            <span style={{ fontSize: 11, color: prof.text, fontWeight: 500, marginLeft: 6 }}>
                              {prof.label}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: T.pencil, fontFamily: 'var(--font-mono)' }}>
                            {new Date(snap.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          <div style={{
                            fontSize: 9, padding: '1px 6px', borderRadius: 4,
                            background: snap.source === 'ai' ? 'rgba(27,73,101,0.08)' : T.parchment,
                            color: snap.source === 'ai' ? T.labBlue : T.graphite,
                            fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                          }}>
                            {snap.source || 'manual'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '24px 20px', background: T.parchment, borderRadius: 10, textAlign: 'center' }}>
                    <Clock size={28} color={T.pencil} style={{ marginBottom: 8 }} />
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: T.graphite }}>
                      No skill updates recorded yet. Growth data will appear as students complete projects and receive AI feedback.
                    </p>
                  </div>
                )}
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
            Project Pathway Ideas
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
