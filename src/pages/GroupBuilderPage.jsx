import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, Sparkles, Loader2, Save, X, RefreshCw, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ai, skills as skillsApi, questGroups } from '../lib/api';
import TopBar from '../components/layout/TopBar';

const T = {
  ink: '#1A1A2E', paper: '#FAF8F5', parchment: '#F0EDE6',
  graphite: '#6B7280', pencil: '#9CA3AF', chalk: '#FFFFFF',
  fieldGreen: '#2D6A4F', labBlue: '#1B4965', compassGold: '#B8860B',
  specimenRed: '#C0392B',
};

const GROUP_COLORS = [
  { bg: '#DBEAFE', border: '#93C5FD', text: '#1E40AF' },
  { bg: '#D1FAE5', border: '#6EE7B7', text: '#065F46' },
  { bg: '#FEF3C7', border: '#FCD34D', text: '#92400E' },
  { bg: '#E0E7FF', border: '#A5B4FC', text: '#3730A3' },
  { bg: '#FCE7F3', border: '#F9A8D4', text: '#9D174D' },
  { bg: '#FED7AA', border: '#FDBA74', text: '#9A3412' },
];

export default function GroupBuilderPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [groupSize, setGroupSize] = useState(3);
  const [questContext, setQuestContext] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [groups, setGroups] = useState(null);
  const [reasoning, setReasoning] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user) loadStudents();
  }, [user]);

  async function loadStudents() {
    setLoading(true);
    const { data } = await supabase
      .from('students')
      .select('*, quest_students(quest_id)')
      .eq('guide_id', user.id)
      .order('name');
    setStudents(data || []);
    setLoading(false);
  }

  function toggleStudent(id) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
    setGroups(null);
    setSaved(false);
  }

  function selectAll() {
    setSelected(students.map(s => s.id));
    setGroups(null);
    setSaved(false);
  }

  function clearSelection() {
    setSelected([]);
    setGroups(null);
    setSaved(false);
  }

  async function handleSuggest() {
    if (selected.length < 2) return;
    setAiLoading(true);
    setGroups(null);
    setReasoning('');
    setSaved(false);

    try {
      const selectedStudents = students
        .filter(s => selected.includes(s.id))
        .map(s => ({
          name: s.name,
          grade_band: s.grade_band,
          interests: s.interests || [],
          skills: [],
        }));

      const result = await ai.suggestGroups({
        students: selectedStudents,
        questContext: questContext.trim() || null,
        groupSize,
      });

      setGroups(result.groups || []);
      setReasoning(result.reasoning || '');
    } catch (err) {
      console.error('AI grouping error:', err);
    }

    setAiLoading(false);
  }

  function handleSwap(fromGroupIdx, memberIdx, toGroupIdx) {
    if (!groups) return;
    const updated = groups.map(g => ({ ...g, members: [...g.members] }));
    const [member] = updated[fromGroupIdx].members.splice(memberIdx, 1);
    updated[toGroupIdx].members.push(member);
    setGroups(updated);
    setSaved(false);
  }

  async function handleSave() {
    if (!groups || !user) return;
    setSaving(true);

    try {
      for (const group of groups) {
        const members = group.members.map(m => {
          const stu = students.find(s => s.name === m.name);
          return stu ? { studentId: stu.id, role: m.role || '' } : null;
        }).filter(Boolean);

        await questGroups.create({
          questId: null,
          name: group.name,
          createdBy: user.id,
          members,
        });
      }

      setSaved(true);
    } catch (err) {
      console.error('Save error:', err);
    }

    setSaving(false);
  }

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.page}>
      <TopBar />

      <main style={styles.main}>
        <div style={styles.content}>
          {/* Header */}
          <button
            onClick={() => navigate('/students')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: T.graphite, fontFamily: 'var(--font-body)', fontSize: 13, marginBottom: 12, padding: 0 }}
          >
            <ChevronLeft size={16} /> Students
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: T.ink, margin: 0 }}>
                <Users size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Group Builder
              </h1>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: T.graphite, marginTop: 4 }}>
                Select students and let AI suggest optimal group pairings with roles.
              </p>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: T.graphite }}>
              <Loader2 size={24} style={{ animation: 'gb-spin 1s linear infinite' }} />
              <p style={{ marginTop: 12, fontFamily: 'var(--font-body)' }}>Loading students...</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: groups ? '1fr 1fr' : '1fr', gap: 24 }}>
              {/* Left: student selection */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: 'var(--font-body)' }}>
                    Select Students <span style={{ fontWeight: 400, color: T.graphite }}>({selected.length} selected)</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={selectAll} style={styles.textBtn}>All</button>
                    <button onClick={clearSelection} style={styles.textBtn}>Clear</button>
                  </div>
                </div>

                {/* Search */}
                <input
                  type="search"
                  placeholder="Search students..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input"
                  style={{ marginBottom: 10, fontSize: 13 }}
                />

                {/* Student list */}
                <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
                  {filteredStudents.map(s => {
                    const checked = selected.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px', borderRadius: 8,
                          border: `1.5px solid ${checked ? T.labBlue : T.parchment}`,
                          background: checked ? `${T.labBlue}08` : T.chalk,
                          cursor: 'pointer', transition: 'all 150ms',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStudent(s.id)}
                          style={{ width: 16, height: 16, accentColor: T.labBlue, cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: 'var(--font-body)' }}>
                            {s.avatar_emoji && <span style={{ marginRight: 4 }}>{s.avatar_emoji}</span>}
                            {s.name}
                          </div>
                          <div style={{ fontSize: 11, color: T.graphite, fontFamily: 'var(--font-body)', marginTop: 1 }}>
                            {s.grade_band || ''} {(s.interests || []).slice(0, 3).join(', ')}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Config */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.fieldLabel}>Group size</label>
                    <select
                      value={groupSize}
                      onChange={e => { setGroupSize(parseInt(e.target.value)); setGroups(null); }}
                      className="input"
                      style={{ fontSize: 13, cursor: 'pointer' }}
                    >
                      {[2, 3, 4, 5].map(n => (
                        <option key={n} value={n}>{n} per group</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={styles.fieldLabel}>Project context <span style={{ fontWeight: 400, color: T.pencil }}>(optional)</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Ocean ecosystem research project"
                    value={questContext}
                    onChange={e => setQuestContext(e.target.value)}
                    className="input"
                    style={{ fontSize: 13 }}
                  />
                </div>

                {/* Suggest button */}
                <button
                  onClick={handleSuggest}
                  disabled={selected.length < 2 || aiLoading}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    width: '100%', padding: '12px 20px', borderRadius: 10,
                    background: selected.length >= 2 ? T.labBlue : T.parchment,
                    color: selected.length >= 2 ? T.chalk : T.pencil,
                    border: 'none', fontSize: 14, fontWeight: 600,
                    fontFamily: 'var(--font-body)', cursor: selected.length >= 2 && !aiLoading ? 'pointer' : 'not-allowed',
                    transition: 'all 150ms',
                  }}
                >
                  {aiLoading ? (
                    <><Loader2 size={16} style={{ animation: 'gb-spin 1s linear infinite' }} /> Thinking...</>
                  ) : (
                    <><Sparkles size={16} /> Suggest Groups</>
                  )}
                </button>
              </div>

              {/* Right: results */}
              {groups && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: 'var(--font-body)' }}>
                      Suggested Groups ({groups.length})
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={handleSuggest} disabled={aiLoading} style={styles.textBtn}>
                        <RefreshCw size={12} /> Regenerate
                      </button>
                    </div>
                  </div>

                  {reasoning && (
                    <div style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)', marginBottom: 14, padding: '8px 12px', background: T.parchment, borderRadius: 8, lineHeight: 1.5, fontStyle: 'italic' }}>
                      {reasoning}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                    {groups.map((group, gi) => {
                      const color = GROUP_COLORS[gi % GROUP_COLORS.length];
                      return (
                        <div
                          key={gi}
                          style={{
                            borderRadius: 12, padding: '14px 16px',
                            background: color.bg, border: `1.5px solid ${color.border}`,
                          }}
                        >
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 700, color: color.text, marginBottom: 8 }}>
                            {group.name}
                          </div>
                          {group.members.map((m, mi) => (
                            <div
                              key={mi}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.6)',
                                marginBottom: 4,
                              }}
                            >
                              <div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: 'var(--font-body)' }}>
                                  {m.name}
                                </span>
                                {m.role && (
                                  <span style={{ fontSize: 11, color: color.text, fontFamily: 'var(--font-mono)', marginLeft: 6, fontWeight: 500 }}>
                                    {m.role}
                                  </span>
                                )}
                              </div>
                              {/* Swap dropdown */}
                              {groups.length > 1 && (
                                <select
                                  value=""
                                  onChange={e => {
                                    const toIdx = parseInt(e.target.value);
                                    if (!isNaN(toIdx)) handleSwap(gi, mi, toIdx);
                                  }}
                                  style={{ fontSize: 11, padding: '2px 4px', border: `1px solid ${color.border}`, borderRadius: 4, background: 'transparent', color: T.graphite, cursor: 'pointer' }}
                                >
                                  <option value="">Move to...</option>
                                  {groups.map((g, idx) => idx !== gi && (
                                    <option key={idx} value={idx}>{g.name}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          ))}
                          {group.group_strength && (
                            <div style={{ fontSize: 11, color: color.text, fontFamily: 'var(--font-body)', marginTop: 6, fontStyle: 'italic' }}>
                              {group.group_strength}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Save */}
                  <button
                    onClick={handleSave}
                    disabled={saving || saved}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      width: '100%', padding: '12px 20px', borderRadius: 10,
                      background: saved ? T.fieldGreen : T.ink,
                      color: T.chalk, border: 'none', fontSize: 14, fontWeight: 600,
                      fontFamily: 'var(--font-body)',
                      cursor: saving || saved ? 'default' : 'pointer',
                      transition: 'all 150ms',
                    }}
                  >
                    {saved ? (
                      <><Save size={16} /> Groups Saved</>
                    ) : saving ? (
                      <><Loader2 size={16} style={{ animation: 'gb-spin 1s linear infinite' }} /> Saving...</>
                    ) : (
                      <><Save size={16} /> Save Groups</>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <style>{`@keyframes gb-spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', minHeight: '100vh', background: T.paper },
  main: { flex: 1, padding: '24px 24px 64px' },
  content: { maxWidth: 960, margin: '0 auto' },
  fieldLabel: {
    display: 'block', fontSize: 12, fontWeight: 600, color: T.ink,
    fontFamily: 'var(--font-body)', marginBottom: 4,
  },
  textBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: 'none', border: 'none', cursor: 'pointer',
    color: T.labBlue, fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)', padding: 0,
  },
};
