import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  Users,
  School,
  BookOpen,
  TrendingUp,
  ChevronLeft,
  RefreshCw,
  Search,
  MoreVertical,
  ExternalLink,
  AlertCircle,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import TopBar from '../components/layout/TopBar';

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'var(--lab-blue)', loading }) {
  return (
    <div style={{
      background: 'var(--chalk)',
      border: '1px solid var(--pencil)',
      borderRadius: 12,
      padding: '20px 24px',
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      {loading ? (
        <div style={{ width: 60, height: 28, background: 'var(--parchment)', borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ) : (
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--ink)', lineHeight: 1, marginBottom: 4 }}>{value ?? '—'}</div>
      )}
      {sub && <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--graphite)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Tab Button ────────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', borderRadius: 8, border: 'none',
        background: active ? 'var(--lab-blue)' : 'transparent',
        color: active ? 'var(--chalk)' : 'var(--graphite)',
        fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: active ? 600 : 400,
        cursor: 'pointer', transition: 'all 150ms ease',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'var(--parchment)'; e.currentTarget.style.color = 'var(--ink)'; } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--graphite)'; } }}
    >
      <Icon size={15} strokeWidth={2} />
      {label}
    </button>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ label, color = 'var(--graphite)', bg = 'var(--parchment)' }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 12,
      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
      letterSpacing: '0.05em', color, background: bg, textTransform: 'uppercase',
    }}>
      {label}
    </span>
  );
}

function roleBadge(role) {
  const map = {
    superadmin: { color: '#7C3AED', bg: '#EDE9FE' },
    school_admin: { color: '#1B4965', bg: '#DBE9F2' },
    guide: { color: '#2D6A4F', bg: '#D1EAE0' },
  };
  const s = map[role] || {};
  return <Badge label={role?.replace('_', ' ') || 'unknown'} color={s.color} bg={s.bg} />;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Data
  const [stats, setStats] = useState(null);
  const [schools, setSchools] = useState([]);
  const [users, setUsers] = useState([]);
  const [quests, setQuests] = useState([]);
  const [error, setError] = useState('');
  const [roleChanging, setRoleChanging] = useState(null); // user id being updated

  // Guard — only superadmin
  useEffect(() => {
    if (profile && profile.role !== 'superadmin') {
      navigate('/dashboard', { replace: true });
    }
  }, [profile, navigate]);

  useEffect(() => {
    if (profile?.role === 'superadmin') {
      loadData();
    }
  }, [profile]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [schoolsRes, usersRes, questsRes] = await Promise.all([
        supabase.from('schools').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, role, onboarding_complete, created_at, schools(name)').order('created_at', { ascending: false }),
        supabase.from('quests').select('id, title, status, career_pathway, created_at, guide_id').order('created_at', { ascending: false }).limit(100),
      ]);

      if (schoolsRes.error) throw schoolsRes.error;
      if (usersRes.error) throw usersRes.error;
      if (questsRes.error) throw questsRes.error;

      setSchools(schoolsRes.data || []);
      setUsers(usersRes.data || []);
      setQuests(questsRes.data || []);

      const u = usersRes.data || [];
      const q = questsRes.data || [];
      setStats({
        schools: (schoolsRes.data || []).length,
        users: u.length,
        guides: u.filter((x) => x.role === 'guide' || x.role === 'school_admin').length,
        quests: q.length,
        activeQuests: q.filter((x) => x.status === 'active').length,
        completedQuests: q.filter((x) => x.status === 'completed').length,
      });
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(userId, newRole) {
    if (roleChanging) return;
    setRoleChanging(userId);
    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      if (updateErr) throw updateErr;
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      setError(err.message || 'Failed to update role');
    } finally {
      setRoleChanging(null);
    }
  }

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || (u.full_name || '').toLowerCase().includes(q) || (u.schools?.name || '').toLowerCase().includes(q);
  });

  const filteredSchools = schools.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || (s.location || '').toLowerCase().includes(q);
  });

  const filteredQuests = quests.filter((q) => {
    const query = search.toLowerCase();
    return !query || (q.title || '').toLowerCase().includes(query) || (q.career_pathway || '').toLowerCase().includes(query);
  });

  if (profile && profile.role !== 'superadmin') return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>

      <TopBar />

      <div style={{ flex: 1, maxWidth: 1100, width: '100%', margin: '0 auto', padding: '24px 24px 48px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              to="/settings"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid var(--pencil)', borderRadius: 6, padding: 6, color: 'var(--graphite)', textDecoration: 'none', transition: 'all 150ms ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--parchment)'; e.currentTarget.style.color = 'var(--ink)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--graphite)'; }}
            >
              <ChevronLeft size={18} strokeWidth={2} />
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={16} color="#fff" />
              </div>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1.1 }}>Admin Dashboard</h1>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Superadmin access</div>
              </div>
            </div>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--pencil)', background: 'var(--chalk)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            Refresh
          </button>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#FDECEA', borderRadius: 8, marginBottom: 20, border: '1px solid #FBBCB8' }}>
            <AlertCircle size={16} color="var(--specimen-red)" />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--specimen-red)' }}>{error}</span>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, padding: '4px', background: 'var(--parchment)', borderRadius: 10, width: 'fit-content' }}>
          <TabBtn active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={TrendingUp} label="Overview" />
          <TabBtn active={activeTab === 'schools'} onClick={() => setActiveTab('schools')} icon={School} label="Schools" />
          <TabBtn active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="Users" />
          <TabBtn active={activeTab === 'quests'} onClick={() => setActiveTab('quests')} icon={BookOpen} label="Quests" />
        </div>

        {/* Search (not on overview) */}
        {activeTab !== 'overview' && (
          <div style={{ position: 'relative', marginBottom: 20, maxWidth: 400 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--graphite)' }} />
            <input
              className="input"
              placeholder={`Search ${activeTab}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 34, width: '100%' }}
            />
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
              <StatCard label="Schools" value={stats?.schools} color="#7C3AED" loading={loading} />
              <StatCard label="Total Users" value={stats?.users} color="var(--lab-blue)" loading={loading} />
              <StatCard label="Guides & Admins" value={stats?.guides} color="var(--field-green)" loading={loading} />
              <StatCard label="Total Quests" value={stats?.quests} color="var(--compass-gold)" loading={loading} />
              <StatCard label="Active Quests" value={stats?.activeQuests} sub="currently running" color="var(--specimen-red)" loading={loading} />
              <StatCard label="Completed" value={stats?.completedQuests} sub="quests finished" color="var(--graphite)" loading={loading} />
            </div>

            {/* Recent schools */}
            <div style={{ background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--pencil)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Recently Added Schools</span>
                <button onClick={() => setActiveTab('schools')} style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--lab-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
              </div>
              {loading ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--graphite)', fontFamily: 'var(--font-body)', fontSize: 13 }}>Loading…</div>
              ) : schools.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--graphite)', fontFamily: 'var(--font-body)', fontSize: 13 }}>No schools yet</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--parchment)' }}>
                      {['Name', 'Location', 'Standards', 'Created'].map((h) => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {schools.slice(0, 5).map((s, i) => (
                      <tr key={s.id} style={{ borderTop: i > 0 ? '1px solid var(--pencil)' : 'none' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{s.name}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)' }}>{s.location || '—'}</td>
                        <td style={{ padding: '12px 16px' }}><Badge label={s.standards_framework || 'common_core'} /></td>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── SCHOOLS ── */}
        {activeTab === 'schools' && (
          <div style={{ background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--pencil)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{filteredSchools.length} school{filteredSchools.length !== 1 ? 's' : ''}</span>
            </div>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--graphite)', fontFamily: 'var(--font-body)', fontSize: 13 }}>Loading…</div>
            ) : filteredSchools.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--graphite)', fontFamily: 'var(--font-body)', fontSize: 13 }}>No schools found</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--parchment)' }}>
                    {['School', 'Location', 'Standards', 'Grade Bands', 'Created'].map((h) => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSchools.map((s, i) => (
                    <tr key={s.id} style={{ borderTop: i > 0 ? '1px solid var(--pencil)' : 'none' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{s.name}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)' }}>{s.location || '—'}</td>
                      <td style={{ padding: '12px 16px' }}><Badge label={s.standards_framework || 'common_core'} /></td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--graphite)' }}>{(s.grade_bands || []).join(', ') || '—'}</td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── USERS ── */}
        {activeTab === 'users' && (
          <div style={{ background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--pencil)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</span>
            </div>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--graphite)', fontFamily: 'var(--font-body)', fontSize: 13 }}>Loading…</div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--graphite)', fontFamily: 'var(--font-body)', fontSize: 13 }}>No users found</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--parchment)' }}>
                    {['Name', 'Role', 'School', 'Onboarded', 'Joined'].map((h) => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, i) => (
                    <tr key={u.id} style={{ borderTop: i > 0 ? '1px solid var(--pencil)' : 'none' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{u.full_name || <span style={{ color: 'var(--graphite)', fontStyle: 'italic' }}>No name</span>}</td>
                      <td style={{ padding: '8px 16px' }}>
                        <select
                          value={u.role}
                          disabled={roleChanging === u.id}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                          style={{
                            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                            letterSpacing: '0.04em', textTransform: 'uppercase',
                            border: '1px solid var(--pencil)', borderRadius: 6,
                            padding: '4px 8px', background: 'var(--parchment)',
                            color: 'var(--ink)', cursor: 'pointer',
                            opacity: roleChanging === u.id ? 0.5 : 1,
                          }}
                        >
                          <option value="guide">Guide</option>
                          <option value="school_admin">School Admin</option>
                          <option value="superadmin">Superadmin</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)' }}>{u.schools?.name || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {u.onboarding_complete
                          ? <Check size={14} color="var(--field-green)" />
                          : <X size={14} color="var(--graphite)" />
                        }
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── QUESTS ── */}
        {activeTab === 'quests' && (
          <div style={{ background: 'var(--chalk)', border: '1px solid var(--pencil)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--pencil)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{filteredQuests.length} quest{filteredQuests.length !== 1 ? 's' : ''} (last 100)</span>
            </div>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--graphite)', fontFamily: 'var(--font-body)', fontSize: 13 }}>Loading…</div>
            ) : filteredQuests.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--graphite)', fontFamily: 'var(--font-body)', fontSize: 13 }}>No quests found</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--parchment)' }}>
                    {['Title', 'Status', 'Pathway', 'Created'].map((h) => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredQuests.map((q, i) => {
                    const statusColor = { active: { color: '#2D6A4F', bg: '#D1EAE0' }, completed: { color: '#1B4965', bg: '#DBE9F2' }, draft: { color: 'var(--graphite)', bg: 'var(--parchment)' }, archived: { color: '#6B7280', bg: '#F3F4F6' } }[q.status] || {};
                    return (
                      <tr key={q.id} style={{ borderTop: i > 0 ? '1px solid var(--pencil)' : 'none' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink)', fontWeight: 500, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.title}</td>
                        <td style={{ padding: '12px 16px' }}><Badge label={q.status} color={statusColor.color} bg={statusColor.bg} /></td>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--graphite)' }}>{q.career_pathway?.replace(/_/g, ' ') || '—'}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--graphite)' }}>{new Date(q.created_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
