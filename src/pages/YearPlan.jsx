import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, Loader2, AlertCircle, ChevronDown, Map, CalendarDays,
  List, LayoutGrid, Sparkles, GripVertical, Trash2, ArrowRight,
  RefreshCw, CheckCircle, Target, Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { yearPlans, yearPlanItems, yearPlanPackages, ai } from '../lib/api';
import TrustBadge from '../components/ui/TrustBadge';
import { getTrustTier } from '../lib/trustDomains';
import TopBar from '../components/layout/TopBar';

export default function YearPlan() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [view, setView] = useState(() => localStorage.getItem('yearplan_view') || 'list');
  const [suggestions, setSuggestions] = useState([]);
  const [balanceData, setBalanceData] = useState(null);
  const [balancing, setBalancing] = useState(false);
  const [exported, setExported] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      setLoading(true);
      const [plansData, { data: studentsData }] = await Promise.all([
        yearPlans.getForGuide(user.id),
        supabase.from('students').select('id, name, avatar_emoji, about_me, passions, interests, grade_band')
          .eq('guide_id', user.id).order('name'),
      ]);
      setPlans(plansData);
      setStudents(studentsData || []);
      if (planId) {
        const plan = await yearPlans.getById(planId);
        setActivePlan(plan);
      }
      setLoading(false);
    };
    load();
  }, [user?.id, planId]);

  const handleCreatePlan = async (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (!student || !profile?.school_id) return;
    const currentYear = new Date().getFullYear();
    const schoolYear = `${currentYear}-${currentYear + 1}`;
    const plan = await yearPlans.create(user.id, studentId, profile.school_id, schoolYear);
    if (plan) navigate(`/yearplan/${plan.id}`);
  };

  const handleGenerate = async () => {
    if (!activePlan || generating) return;
    setGenerating(true);
    const student = activePlan.students;
    const { data: standards } = await supabase
      .from('student_standards')
      .select('*')
      .eq('student_id', activePlan.student_id)
      .eq('status', 'active');
    const existingCoverage = (activePlan.year_plan_items || [])
      .filter(i => i.status === 'completed')
      .flatMap(i => i.target_standards || []);
    const ideas = await ai.generateYearPlan(student, standards || [], existingCoverage);
    setSuggestions(ideas);
    setGenerating(false);
  };

  const handleAddSuggestion = async (suggestion) => {
    if (!activePlan) return;
    const currentItems = activePlan.year_plan_items || [];
    const item = await yearPlanItems.add(activePlan.id, {
      position: currentItems.length,
      title: suggestion.title,
      description: suggestion.description,
      target_standards: suggestion.target_standards,
      estimated_weeks: suggestion.estimated_weeks,
      interest_tags: suggestion.interest_tags,
      month_target: suggestion.month_suggestion,
      ai_rationale: suggestion.rationale,
    });
    if (item) {
      setActivePlan(prev => ({ ...prev, year_plan_items: [...(prev.year_plan_items || []), item] }));
      setSuggestions(prev => prev.filter(s => s.title !== suggestion.title));
    }
  };

  const handleRemoveItem = async (itemId) => {
    await yearPlanItems.remove(itemId);
    setActivePlan(prev => ({ ...prev, year_plan_items: (prev.year_plan_items || []).filter(i => i.id !== itemId) }));
  };

  const handleGenerateNow = (item) => {
    sessionStorage.setItem('yearplan_prefill', JSON.stringify({
      title: item.title, description: item.description,
      standards: item.target_standards, planItemId: item.id,
    }));
    navigate('/quest/new');
  };

  const handleBalance = async () => {
    if (balancing || !activePlan) return;
    setBalancing(true);
    const result = await ai.balanceYearPlan(
      items,
      activePlan.target_outcomes || [],
      activePlan.students
    );
    setBalanceData(result);
    setBalancing(false);
  };

  useEffect(() => { localStorage.setItem('yearplan_view', view); }, [view]);

  const allOutcomes = activePlan?.target_outcomes || [];
  const items = activePlan?.year_plan_items || [];
  const selectedStudent = activePlan?.students;

  const handleExportPackage = async () => {
    if (!activePlan || !profile?.school_id || exported) return;
    const snapshot = items.map(item => ({
      title: item.title,
      description: item.description,
      target_standards: item.target_standards,
      estimated_weeks: item.estimated_weeks,
      interest_tags: item.interest_tags,
      month_target: item.month_target,
      ai_rationale: item.ai_rationale,
      domain_coverage: item.domain_coverage || {},
    }));
    const pkg = await yearPlanPackages.create(activePlan.id, profile.school_id, user.id, {
      title: activePlan.title || `${selectedStudent?.name || 'Student'}'s Year Plan`,
      description: `${items.length} projects, ${items.reduce((s, i) => s + (i.estimated_weeks || 0), 0)} weeks`,
      gradeBand: selectedStudent?.grade_band,
      itemsSnapshot: snapshot,
      targetOutcomes: activePlan.target_outcomes || [],
      totalWeeks: items.reduce((s, i) => s + (i.estimated_weeks || 0), 0),
    });
    if (pkg) setExported(true);
  };
  const coveredCodes = new Set(items.flatMap(i => (i.target_standards || []).map(s => s.code)));
  const coveragePct = allOutcomes.length > 0
    ? Math.round((allOutcomes.filter(o => coveredCodes.has(o.standard_code || o.code)).length / allOutcomes.length) * 100)
    : 0;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <TopBar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <Loader2 size={20} color="var(--graphite)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    </div>
  );

  if (!activePlan) return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <TopBar />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--ink)', marginBottom: 8 }}>Year Plans</h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--graphite)', marginBottom: 32 }}>Map out a full year of projects for each learner.</p>

        {plans.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
            {plans.map(plan => (
              <div key={plan.id} onClick={() => navigate(`/yearplan/${plan.id}`)}
                style={{ background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'box-shadow 150ms' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{plan.students?.avatar_emoji || '\u{1F9ED}'}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--ink)' }}>{plan.students?.name}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>
                  {plan.school_year} · {plan.year_plan_items?.length || 0} projects
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12, color: 'var(--graphite)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Start a new year plan</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {students.map(s => (
            <button key={s.id} onClick={() => handleCreatePlan(s.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'var(--chalk)', border: '1.5px dashed var(--pencil)', borderRadius: 10, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink)', transition: 'all 150ms' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--compass-gold)'; e.currentTarget.style.background = 'rgba(184,134,11,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--pencil)'; e.currentTarget.style.background = 'var(--chalk)'; }}>
              <span>{s.avatar_emoji || '\u{1F464}'}</span>
              <span>{s.name}</span>
              <Plus size={14} color="var(--graphite)" style={{ marginLeft: 'auto' }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <TopBar />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 22 }}>{activePlan.students?.avatar_emoji || '\u{1F9ED}'}</span>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ink)', margin: 0 }}>{activePlan.students?.name}'s Year Plan</h1>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)' }}>{activePlan.school_year}</span>
          </div>
          <div style={{ display: 'flex', gap: 2, background: 'var(--parchment)', borderRadius: 8, padding: 2 }}>
            {[
              { key: 'list', icon: List, label: 'List' },
              { key: 'timeline', icon: LayoutGrid, label: 'Timeline' },
              { key: 'calendar', icon: CalendarDays, label: 'Calendar' },
              { key: 'map', icon: Map, label: 'Map' },
            ].map(v => (
              <button key={v.key} onClick={() => setView(v.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer', background: view === v.key ? 'var(--chalk)' : 'transparent', color: view === v.key ? 'var(--ink)' : 'var(--graphite)', boxShadow: view === v.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                <v.icon size={12} /> {v.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <button onClick={handleGenerate} disabled={generating}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '14px 20px', marginBottom: 20, background: generating ? 'var(--parchment)' : 'rgba(184,134,11,0.06)', border: '1.5px dashed var(--compass-gold)', borderRadius: 10, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
              {generating ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} color="var(--compass-gold)" />}
              {generating ? 'Generating project ideas...' : 'Suggest Projects with AI'}
            </button>

            {suggestions.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 12, color: 'var(--compass-gold)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>AI Suggestions ({suggestions.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {suggestions.map((s, i) => (
                    <div key={i} style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(184,134,11,0.3)', background: 'rgba(184,134,11,0.03)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--ink)', marginBottom: 4 }}>{s.title}</div>
                        <p style={{ fontSize: 12, color: 'var(--graphite)', margin: '0 0 6px', lineHeight: 1.5 }}>{s.description}</p>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {(s.interest_tags || []).map(t => (
                            <span key={t} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--parchment)', color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>{t}</span>
                          ))}
                          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--parchment)', color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>~{s.estimated_weeks}w</span>
                        </div>
                        {s.sources?.length > 0 && (
                          <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {s.sources.map((src, si) => (
                              <TrustBadge key={si} tier={src.trust_level || getTrustTier(src.url)} url={src.url} sourceName={src.title} />
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => handleAddSuggestion(s)}
                        style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: 'var(--compass-gold)', color: 'var(--ink)', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {view === 'list' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.length === 0 && !generating && (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--pencil)', fontSize: 13 }}>No projects in the plan yet. Click "Suggest Projects with AI" to get started.</div>
                )}
                {items.map((item, i) => (
                  <div key={item.id} style={{ background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0, paddingTop: 2 }}>
                      <GripVertical size={14} color="var(--pencil)" />
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--pencil)' }}>{i + 1}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--ink)' }}>{item.title}</span>
                        {item.status === 'completed' && <CheckCircle size={14} color="var(--field-green)" />}
                        {item.quest_id && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--field-green)', color: 'var(--chalk)', fontFamily: 'var(--font-mono)' }}>Generated</span>}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--graphite)', margin: '0 0 6px', lineHeight: 1.5 }}>{item.description}</p>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        {item.month_target && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--parchment)', color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>{item.month_target}</span>}
                        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--parchment)', color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>~{item.estimated_weeks}w</span>
                        {(item.target_standards || []).slice(0, 2).map(s => (
                          <span key={s.code} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(27,73,101,0.08)', color: 'var(--lab-blue)', fontFamily: 'var(--font-mono)' }}>{s.label?.slice(0, 30) || s.code}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                      {!item.quest_id && (
                        <button onClick={() => handleGenerateNow(item)}
                          title="Generate this project"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: 'none', background: 'var(--ink)', color: 'var(--chalk)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                          <ArrowRight size={11} /> Generate
                        </button>
                      )}
                      <button onClick={() => handleRemoveItem(item.id)}
                        title="Remove from plan"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px', borderRadius: 6, border: '1px solid var(--pencil)', background: 'transparent', color: 'var(--graphite)', cursor: 'pointer' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {view === 'timeline' && (
              <div style={{ position: 'relative', paddingLeft: 30 }}>
                {/* Vertical line */}
                <div style={{ position: 'absolute', left: 14, top: 0, bottom: 0, width: 2, background: 'var(--pencil)' }} />
                {items.length === 0 && !generating && (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--pencil)', fontSize: 13 }}>No projects in the plan yet. Click "Suggest Projects with AI" to get started.</div>
                )}
                {items.map((item, i) => {
                  const isGenerated = !!item.quest_id;
                  return (
                    <div key={item.id} style={{ position: 'relative', marginBottom: 20, paddingLeft: 20 }}>
                      {/* Dot on timeline */}
                      <div style={{
                        position: 'absolute', left: -22, top: 6, width: 10, height: 10, borderRadius: '50%',
                        background: isGenerated ? 'var(--field-green)' : item.status === 'completed' ? 'var(--lab-blue)' : 'var(--pencil)',
                        border: '2px solid var(--chalk)',
                      }} />
                      <div style={{ background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 8, padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{item.title}</span>
                          {item.month_target && (
                            <span style={{ fontSize: 9, color: 'var(--graphite)', fontFamily: 'var(--font-mono)' }}>
                              {item.month_target}
                            </span>
                          )}
                          <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                            background: isGenerated ? 'rgba(75,139,59,0.1)' : 'rgba(184,134,11,0.1)',
                            color: isGenerated ? 'var(--field-green)' : 'var(--compass-gold)',
                            fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                          }}>
                            {isGenerated ? 'Generated' : item.status || 'planned'}
                          </span>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--graphite)', margin: 0, lineHeight: 1.4 }}>
                          {item.description?.slice(0, 120)}{item.description?.length > 120 ? '...' : ''}
                        </p>
                        <div style={{ marginTop: 6, fontSize: 10, color: 'var(--pencil)' }}>
                          {item.estimated_weeks} weeks
                          {item.interest_tags?.length > 0 && ` · ${item.interest_tags.join(', ')}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {view === 'calendar' && (() => {
              const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              const itemsByMonth = {};
              items.forEach(item => {
                const month = item.month_target || 'Unscheduled';
                if (!itemsByMonth[month]) itemsByMonth[month] = [];
                itemsByMonth[month].push(item);
              });
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {months.map(month => (
                    <div key={month} style={{
                      background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 8,
                      padding: 10, minHeight: 80,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--graphite)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
                        {month}
                      </div>
                      {(itemsByMonth[month] || []).map(item => (
                        <div key={item.id} style={{
                          padding: '4px 8px', marginBottom: 4, borderRadius: 6, fontSize: 10,
                          background: item.quest_id ? 'rgba(75,139,59,0.08)' : 'rgba(27,73,101,0.06)',
                          color: 'var(--ink)', fontWeight: 500,
                        }}>
                          {item.title}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })()}
            {view === 'map' && <div style={{ textAlign: 'center', padding: 40, color: 'var(--pencil)', fontSize: 13 }}>Journey Map view — coming in next iteration</div>}
          </div>

          <div style={{ width: 240, flexShrink: 0, position: 'sticky', top: 72 }}>
            <div style={{ background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Target size={14} color="var(--lab-blue)" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--lab-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coverage</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--graphite)' }}>Outcomes covered</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{coveragePct}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--parchment)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${coveragePct}%`, background: 'var(--lab-blue)', borderRadius: 3, transition: 'width 400ms ease' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--graphite)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Projects planned</span>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{items.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total weeks</span>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{items.reduce((sum, i) => sum + (i.estimated_weeks || 0), 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Generated</span>
                  <span style={{ fontWeight: 600, color: 'var(--field-green)' }}>{items.filter(i => i.quest_id).length}</span>
                </div>
              </div>
              {items.filter(i => i.status === 'completed').length > 0 && (
                <button onClick={async () => {
                  setGenerating(true);
                  const result = await ai.reassessYearPlan(items, items.filter(i => i.quest_id && i.status === 'completed'), allOutcomes.filter(o => !coveredCodes.has(o.standard_code || o.code)), activePlan.students);
                  if (result.swap_suggestions?.length || result.additions?.length) {
                    setSuggestions([...result.swap_suggestions.map(s => ({ ...s.replace_with, rationale: `Swap for "${s.remove_item_title}": ${s.replace_with.rationale}` })), ...result.additions]);
                  }
                  setGenerating(false);
                }}
                  disabled={generating}
                  style={{ marginTop: 12, width: '100%', padding: '8px', borderRadius: 6, border: '1px solid var(--pencil)', background: 'transparent', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--graphite)' }}>
                  <RefreshCw size={11} /> Reassess Plan
                </button>
              )}

              {/* Coverage Matrix */}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>Outcome Balance</span>
                  <button onClick={handleBalance} disabled={balancing} style={{
                    padding: '4px 10px', borderRadius: 6, border: '1px solid var(--pencil)',
                    background: 'var(--chalk)', color: 'var(--ink)', fontSize: 9, fontWeight: 600,
                    cursor: balancing ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)',
                  }}>
                    {balancing ? 'Analyzing...' : 'Analyze Balance'}
                  </button>
                </div>

                {balanceData && (
                  <>
                    {/* Overall coverage */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                        <span style={{ color: 'var(--graphite)' }}>Overall Coverage</span>
                        <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{balanceData.coverage_pct}%</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--parchment)', borderRadius: 3 }}>
                        <div style={{
                          height: '100%', borderRadius: 3, transition: 'width 0.5s ease',
                          width: `${balanceData.coverage_pct}%`,
                          background: balanceData.coverage_pct >= 80 ? 'var(--field-green)' : balanceData.coverage_pct >= 50 ? 'var(--compass-gold)' : 'var(--specimen-red)',
                        }} />
                      </div>
                    </div>

                    {/* Domain breakdown */}
                    {Object.entries(balanceData.domain_breakdown || {}).map(([domain, info]) => (
                      <div key={domain} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
                          <span style={{ color: 'var(--graphite)', textTransform: 'capitalize' }}>{domain}</span>
                          <span style={{
                            fontWeight: 700, fontSize: 9, padding: '1px 6px', borderRadius: 8,
                            background: info.status === 'good' ? 'rgba(75,139,59,0.1)' : info.status === 'warning' ? 'rgba(184,134,11,0.1)' : 'rgba(200,50,50,0.1)',
                            color: info.status === 'good' ? 'var(--field-green)' : info.status === 'warning' ? 'var(--compass-gold)' : 'var(--specimen-red)',
                          }}>
                            {info.covered}/{info.total}
                          </span>
                        </div>
                        <div style={{ height: 3, background: 'var(--parchment)', borderRadius: 2 }}>
                          <div style={{
                            height: '100%', borderRadius: 2,
                            width: `${info.total ? (info.covered / info.total) * 100 : 0}%`,
                            background: info.status === 'good' ? 'var(--field-green)' : info.status === 'warning' ? 'var(--compass-gold)' : 'var(--specimen-red)',
                          }} />
                        </div>
                      </div>
                    ))}

                    {/* Gap outcomes */}
                    {balanceData.gap_outcomes?.length > 0 && (
                      <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(200,50,50,0.04)', borderRadius: 6 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--specimen-red)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 4 }}>
                          Gaps
                        </div>
                        {balanceData.gap_outcomes.map((gap, i) => (
                          <div key={i} style={{ fontSize: 10, color: 'var(--graphite)', padding: '2px 0' }}>
                            {gap}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Suggestions */}
                    {balanceData.suggestions?.length > 0 && (
                      <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(184,134,11,0.04)', borderRadius: 6 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--compass-gold)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: 4 }}>
                          Suggestions
                        </div>
                        {balanceData.suggestions.map((sug, i) => (
                          <div key={i} style={{ fontSize: 10, color: 'var(--ink)', padding: '3px 0', lineHeight: 1.4 }}>
                            <strong style={{ textTransform: 'capitalize' }}>{sug.type}:</strong> {sug.description}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <button onClick={handleExportPackage} disabled={exported || items.length === 0} style={{
                marginTop: 12, width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--pencil)',
                background: exported ? 'rgba(75,139,59,0.06)' : 'var(--chalk)',
                color: exported ? 'var(--field-green)' : 'var(--ink)',
                fontSize: 11, fontWeight: 600, cursor: exported ? 'default' : 'pointer',
                fontFamily: 'var(--font-body)',
              }}>
                {exported ? 'Shared to Community!' : 'Share as Package'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
