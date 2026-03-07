import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import TopBar from '../components/layout/TopBar';
import {
  Settings,
  User,
  School,
  Zap,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronLeft,
  Shield,
  ChevronRight,
} from 'lucide-react';

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: '100vh',
    background: 'var(--paper)',
    display: 'flex',
    flexDirection: 'column',
  },
  body: {
    flex: 1,
    maxWidth: '900px',
    width: '100%',
    margin: '0 auto',
    padding: '24px',
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '28px',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: '1px solid var(--pencil)',
    borderRadius: '6px',
    cursor: 'pointer',
    color: 'var(--graphite)',
    padding: '6px',
    transition: 'all 150ms ease',
    flexShrink: 0,
  },
  pageTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-xl)',
    color: 'var(--ink)',
    letterSpacing: '-0.01em',
    lineHeight: 1,
  },
  layout: {
    display: 'flex',
    gap: '24px',
    alignItems: 'flex-start',
  },
  sidebar: {
    width: '200px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  tabBtn: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    background: active ? 'var(--parchment)' : 'transparent',
    color: active ? 'var(--ink)' : 'var(--graphite)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: active ? 600 : 400,
    textAlign: 'left',
    transition: 'all 150ms ease',
    borderLeft: active ? '3px solid var(--lab-blue)' : '3px solid transparent',
  }),
  content: {
    flex: 1,
    minWidth: 0,
  },
  card: {
    background: 'var(--chalk)',
    border: '1px solid var(--pencil)',
    borderRadius: '12px',
    padding: '28px',
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-lg)',
    color: 'var(--ink)',
    marginBottom: '20px',
  },
  fieldGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    color: 'var(--ink)',
    marginBottom: '6px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  eyeBtn: {
    position: 'absolute',
    right: '10px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--graphite)',
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px',
  },
  helpText: {
    marginTop: '6px',
    fontSize: 'var(--text-xs)',
    color: 'var(--graphite)',
  },
  helpLink: {
    color: 'var(--lab-blue)',
    textDecoration: 'none',
    fontSize: 'var(--text-xs)',
  },
  checkboxGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginTop: '4px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--ink)',
    cursor: 'pointer',
    userSelect: 'none',
  },
  providerCards: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '28px',
  },
  providerCard: (selected) => ({
    border: selected ? '2px solid var(--lab-blue)' : '2px solid var(--pencil)',
    borderRadius: '10px',
    padding: '18px',
    cursor: 'pointer',
    background: selected ? '#EBF2F7' : 'var(--chalk)',
    transition: 'all 150ms ease',
    textAlign: 'left',
  }),
  providerName: (selected) => ({
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    fontSize: 'var(--text-sm)',
    color: selected ? 'var(--lab-blue)' : 'var(--ink)',
    marginBottom: '4px',
  }),
  providerSub: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--graphite)',
    lineHeight: 1.4,
  },
  apiKeySection: {
    marginBottom: '24px',
    paddingBottom: '24px',
    borderBottom: '1px solid var(--parchment)',
  },
  apiKeyHeader: {
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    color: 'var(--ink)',
    marginBottom: '10px',
  },
  testRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '10px',
    flexWrap: 'wrap',
  },
  testBtn: (loading) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '6px',
    border: '1px solid var(--pencil)',
    background: loading ? 'var(--parchment)' : 'var(--chalk)',
    color: loading ? 'var(--graphite)' : 'var(--ink)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 500,
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'all 150ms ease',
    opacity: loading ? 0.7 : 1,
  }),
  statusBadge: (type) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: 'var(--text-xs)',
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    color: type === 'ok' ? 'var(--field-green)' : 'var(--specimen-red)',
    background: type === 'ok' ? '#EAF4EE' : '#FDECEA',
    padding: '4px 10px',
    borderRadius: '20px',
  }),
  infoBox: {
    background: '#EBF2F7',
    borderLeft: '3px solid var(--lab-blue)',
    borderRadius: '0 8px 8px 0',
    padding: '14px 16px',
    marginBottom: '24px',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: 'var(--lab-blue)',
    lineHeight: 1.6,
  },
  saveRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginTop: '8px',
  },
  toastWrapper: {
    position: 'fixed',
    bottom: '28px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 200,
    pointerEvents: 'none',
  },
  toast: (type) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    borderRadius: '8px',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    color: 'var(--chalk)',
    background: type === 'success' ? 'var(--field-green)' : 'var(--specimen-red)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
    animation: 'toastSlideUp 0.25s ease',
    whiteSpace: 'nowrap',
  }),
  // Mobile top-tabs (shown at narrow widths via media query class)
  mobileTabs: {
    display: 'none',
    gap: '4px',
    marginBottom: '20px',
    overflowX: 'auto',
    paddingBottom: '2px',
  },
  mobileTabBtn: (active) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '20px',
    border: active ? '2px solid var(--lab-blue)' : '2px solid var(--pencil)',
    background: active ? 'var(--lab-blue)' : 'var(--chalk)',
    color: active ? 'var(--chalk)' : 'var(--graphite)',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 150ms ease',
  }),
};

const TABS = [
  { id: 'profile', label: 'Profile', Icon: User },
  { id: 'school', label: 'School', Icon: School },
  { id: 'ai', label: 'AI Configuration', Icon: Zap },
];

const TABS_SUPERADMIN = [
  ...TABS,
  { id: 'admin', label: 'Admin Panel', Icon: Shield },
];

const GRADE_BANDS = ['K-2', '3-5', '6-8', '9-12'];

// ── Settings Page ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  // ── Tab ──
  const [activeTab, setActiveTab] = useState('profile');
  const isSuperadmin = profile?.role === 'superadmin';
  const tabs = isSuperadmin ? TABS_SUPERADMIN : TABS;

  // ── UI state ──
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type, message }

  // ── Profile tab ──
  const [fullName, setFullName] = useState('');

  // ── School tab ──
  const [schoolName, setSchoolName] = useState('');
  const [location, setLocation] = useState('');
  const [standardsFramework, setStandardsFramework] = useState('common_core');
  const [gradeBands, setGradeBands] = useState([]);

  // ── Avatar upload ──
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const avatarInputRef = useRef(null);

  // ── AI tab ──
  const [aiProvider, setAiProvider] = useState('gemini');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [anthropicStatus, setAnthropicStatus] = useState(null); // null | 'testing' | 'ok' | 'error'
  const [anthropicError, setAnthropicError] = useState('');
  const [geminiStatus, setGeminiStatus] = useState(null);
  const [geminiError, setGeminiError] = useState('');

  // ── Initialise from profile & localStorage ────────────────────────────────

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');

      const school = profile.schools;
      if (school) {
        setSchoolName(school.name || '');
        setLocation(school.location || '');
        setStandardsFramework(school.standards_framework || 'common_core');
        setGradeBands(school.grade_bands || []);
      }
    }
  }, [profile]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('wayfinder_ai_settings');
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.provider) setAiProvider(saved.provider);
        if (saved.anthropicKey) setAnthropicKey(saved.anthropicKey);
        if (saved.geminiKey) setGeminiKey(saved.geminiKey);
      }
    } catch {
      // ignore corrupt data
    }
  }, []);

  // ── Toast helper ──────────────────────────────────────────────────────────

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Save handlers ─────────────────────────────────────────────────────────

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      showToast('success', 'Profile saved');
    } catch (err) {
      showToast('error', err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  async function saveSchool() {
    if (!user || !profile?.school_id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('schools')
        .update({ name: schoolName, location, standards_framework: standardsFramework, grade_bands: gradeBands })
        .eq('id', profile.school_id);
      if (error) throw error;
      await refreshProfile();
      showToast('success', 'School settings saved');
    } catch (err) {
      showToast('error', err.message || 'Failed to save school settings');
    } finally {
      setSaving(false);
    }
  }

  async function saveAiSettings() {
    setSaving(true);
    try {
      const aiSettings = {
        provider: aiProvider,
        anthropicKey,
        geminiKey,
      };
      localStorage.setItem('wayfinder_ai_settings', JSON.stringify(aiSettings));

      if (user) {
        // Best-effort — column added in migration 003; ignore error if not yet run
        await supabase
          .from('profiles')
          .update({ preferred_ai_provider: aiProvider })
          .eq('id', user.id);
      }

      showToast('success', 'Settings saved');
    } catch (err) {
      showToast('error', err.message || 'Failed to save AI settings');
    } finally {
      setSaving(false);
    }
  }

  // ── Test connections ──────────────────────────────────────────────────────

  async function testAnthropic() {
    if (!anthropicKey.trim()) return;
    setAnthropicStatus('testing');
    setAnthropicError('');
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: anthropicKey.trim(), dangerouslyAllowBrowser: true });
      await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      setAnthropicStatus('ok');
    } catch (err) {
      setAnthropicStatus('error');
      setAnthropicError(err.message || 'Connection failed');
    }
  }

  async function testGemini() {
    if (!geminiKey.trim()) return;
    setGeminiStatus('testing');
    setGeminiError('');
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiKey.trim());
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      await model.generateContent('Hello');
      setGeminiStatus('ok');
    } catch (err) {
      setGeminiStatus('error');
      setGeminiError(err.message || 'Connection failed');
    }
  }

  // ── Grade band toggle ─────────────────────────────────────────────────────

  function toggleGradeBand(band) {
    setGradeBands((prev) =>
      prev.includes(band) ? prev.filter((b) => b !== band) : [...prev, band]
    );
  }

  // ── Avatar upload handler ─────────────────────────────────────────────────

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setAvatarError('Image must be under 2MB'); return; }
    setAvatarUploading(true);
    setAvatarError('');
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: updateErr } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      if (updateErr) throw updateErr;
      await refreshProfile();
    } catch (err) {
      setAvatarError(err.message || 'Upload failed');
    } finally {
      setAvatarUploading(false);
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  function renderProfileTab() {
    return (
      <div style={S.card}>
        <h2 style={S.sectionTitle}>Profile Information</h2>

        {/* Profile Picture */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--pencil)' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--lab-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid var(--pencil)' }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: 'var(--chalk)', userSelect: 'none' }}>
                  {profile?.full_name ? (profile.full_name.trim().split(/\s+/).map(p => p[0]).slice(0,2).join('').toUpperCase()) : '?'}
                </span>
              )}
            </div>
            {avatarUploading && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            )}
          </div>
          <div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, border: '1px solid var(--pencil)', background: 'var(--chalk)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink)', cursor: avatarUploading ? 'not-allowed' : 'pointer', opacity: avatarUploading ? 0.6 : 1 }}
            >
              {avatarUploading ? 'Uploading...' : 'Upload photo'}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            <p style={{ fontSize: 11, color: 'var(--graphite)', fontFamily: 'var(--font-body)', margin: '4px 0 0', lineHeight: 1.4 }}>JPG, PNG or GIF · Max 2MB</p>
            {avatarError && <p style={{ fontSize: 11, color: 'var(--specimen-red)', fontFamily: 'var(--font-body)', margin: '4px 0 0' }}>{avatarError}</p>}
          </div>
        </div>

        <div style={S.fieldGroup}>
          <label style={S.label} htmlFor="full-name">Full Name</label>
          <input
            id="full-name"
            className="input"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            style={{ width: '100%' }}
          />
        </div>

        <div style={S.fieldGroup}>
          <label style={S.label} htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            value={user?.email || ''}
            disabled
            style={{ width: '100%', opacity: 0.6, cursor: 'not-allowed' }}
          />
          <p style={S.helpText}>Email cannot be changed here.</p>
        </div>

        <div style={S.fieldGroup}>
          <label style={S.label}>Role</label>
          {(() => {
            const r = profile?.role || 'guide';
            const roleInfo = {
              guide:        { label: 'Guide',        color: '#2D6A4F', bg: '#D1EAE0', desc: 'Creates and launches quests, manages students, runs simulations, and builds personalized learning paths.' },
              school_admin: { label: 'School Admin', color: '#1B4965', bg: '#DBE9F2', desc: 'All Guide permissions plus school-level oversight: view activity across guides, manage enrollment, and access school-wide reports.' },
              superadmin:   { label: 'Superadmin',   color: '#7C3AED', bg: '#EDE9FE', desc: 'Full platform access. Can manage all schools, users, and content.' },
            }[r] || { label: r, color: 'var(--graphite)', bg: 'var(--parchment)', desc: '' };

            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: roleInfo.bg, borderRadius: 10, border: `1.5px solid ${roleInfo.color}20` }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: roleInfo.color, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {roleInfo.label}
                  </span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)', lineHeight: 1.5 }}>
                    {roleInfo.desc}
                  </span>
                </div>
                <p style={{ ...S.helpText, marginTop: 8 }}>
                  Roles are assigned by your school administrator. To request a role change, contact your Wayfinder admin.
                </p>
              </div>
            );
          })()}
        </div>

        <div style={S.saveRow}>
          <button
            className="btn btn-primary"
            onClick={saveProfile}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>
    );
  }

  function renderSchoolTab() {
    return (
      <div style={S.card}>
        <h2 style={S.sectionTitle}>School Settings</h2>

        <div style={S.fieldGroup}>
          <label style={S.label} htmlFor="school-name">School Name</label>
          <input
            id="school-name"
            className="input"
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="e.g. Acton Academy Austin"
            style={{ width: '100%' }}
          />
        </div>

        <div style={S.fieldGroup}>
          <label style={S.label} htmlFor="location">Location</label>
          <input
            id="location"
            className="input"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, State"
            style={{ width: '100%' }}
          />
        </div>

        <div style={S.fieldGroup}>
          <label style={S.label} htmlFor="standards">Standards Framework</label>
          <select
            id="standards"
            className="input"
            value={standardsFramework}
            onChange={(e) => setStandardsFramework(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="common_core">Common Core</option>
            <option value="ngss">NGSS</option>
            <option value="teks">TEKS</option>
            <option value="state_specific">State-Specific</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div style={S.fieldGroup}>
          <label style={S.label}>Grade Bands</label>
          <div style={S.checkboxGroup}>
            {GRADE_BANDS.map((band) => (
              <label key={band} style={S.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={gradeBands.includes(band)}
                  onChange={() => toggleGradeBand(band)}
                />
                {band}
              </label>
            ))}
          </div>
        </div>

        <div style={S.saveRow}>
          <button
            className="btn btn-primary"
            onClick={saveSchool}
            disabled={saving || !profile?.school_id}
          >
            {saving ? 'Saving…' : 'Save School Settings'}
          </button>
          {!profile?.school_id && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--graphite)' }}>
              No school associated with your account.
            </span>
          )}
        </div>
      </div>
    );
  }

  function renderStatusBadge(status, errorMsg) {
    if (!status || status === 'testing') return null;
    if (status === 'ok') {
      return (
        <span style={S.statusBadge('ok')}>
          <Check size={12} strokeWidth={2.5} />
          Connected!
        </span>
      );
    }
    return (
      <span style={S.statusBadge('error')}>
        <AlertCircle size={12} strokeWidth={2.5} />
        {errorMsg || 'Error'}
      </span>
    );
  }

  function renderAiTab() {
    return (
      <div style={S.card}>
        <h2 style={S.sectionTitle}>AI Configuration</h2>

        {/* Provider Selection */}
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--graphite)', marginBottom: '14px' }}>
          Select your preferred AI provider
        </p>
        <div style={S.providerCards}>
          <button
            style={S.providerCard(aiProvider === 'anthropic')}
            onClick={() => setAiProvider('anthropic')}
            aria-pressed={aiProvider === 'anthropic'}
          >
            <div style={S.providerName(aiProvider === 'anthropic')}>Anthropic (Claude)</div>
            <div style={S.providerSub}>claude-sonnet-4-6</div>
          </button>

          <button
            style={S.providerCard(aiProvider === 'gemini')}
            onClick={() => setAiProvider('gemini')}
            aria-pressed={aiProvider === 'gemini'}
          >
            <div style={S.providerName(aiProvider === 'gemini')}>Google Gemini</div>
            <div style={S.providerSub}>Default • gemini-2.5-flash</div>
          </button>
        </div>

        {/* Anthropic API Key */}
        <div style={S.apiKeySection}>
          <div style={S.apiKeyHeader}>Anthropic API Key</div>
          <div style={S.inputWrapper}>
            <input
              className="input"
              type={showAnthropicKey ? 'text' : 'password'}
              value={anthropicKey}
              onChange={(e) => {
                setAnthropicKey(e.target.value);
                setAnthropicStatus(null);
                setAnthropicError('');
              }}
              placeholder="sk-ant-..."
              style={{ width: '100%', paddingRight: '38px' }}
            />
            <button
              type="button"
              style={S.eyeBtn}
              onClick={() => setShowAnthropicKey((v) => !v)}
              aria-label={showAnthropicKey ? 'Hide API key' : 'Show API key'}
            >
              {showAnthropicKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p style={S.helpText}>
            <a
              href="https://console.anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              style={S.helpLink}
            >
              Get your key at console.anthropic.com
            </a>
          </p>
          <div style={S.testRow}>
            <button
              style={S.testBtn(anthropicStatus === 'testing')}
              onClick={testAnthropic}
              disabled={anthropicStatus === 'testing' || !anthropicKey.trim()}
            >
              {anthropicStatus === 'testing' ? 'Testing…' : 'Test Connection'}
            </button>
            {renderStatusBadge(anthropicStatus, anthropicError)}
          </div>
        </div>

        {/* Gemini API Key */}
        <div style={{ ...S.apiKeySection, borderBottom: 'none', paddingBottom: 0, marginBottom: '24px' }}>
          <div style={S.apiKeyHeader}>Google Gemini API Key</div>
          <div style={S.inputWrapper}>
            <input
              className="input"
              type={showGeminiKey ? 'text' : 'password'}
              value={geminiKey}
              onChange={(e) => {
                setGeminiKey(e.target.value);
                setGeminiStatus(null);
                setGeminiError('');
              }}
              placeholder="AIza..."
              style={{ width: '100%', paddingRight: '38px' }}
            />
            <button
              type="button"
              style={S.eyeBtn}
              onClick={() => setShowGeminiKey((v) => !v)}
              aria-label={showGeminiKey ? 'Hide API key' : 'Show API key'}
            >
              {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p style={S.helpText}>
            <a
              href="https://aistudio.google.com"
              target="_blank"
              rel="noopener noreferrer"
              style={S.helpLink}
            >
              Get your key at aistudio.google.com
            </a>
          </p>
          <div style={S.testRow}>
            <button
              style={S.testBtn(geminiStatus === 'testing')}
              onClick={testGemini}
              disabled={geminiStatus === 'testing' || !geminiKey.trim()}
            >
              {geminiStatus === 'testing' ? 'Testing…' : 'Test Connection'}
            </button>
            {renderStatusBadge(geminiStatus, geminiError)}
          </div>
        </div>

        {/* Storage info box */}
        <div style={S.infoBox}>
          Your API keys are stored locally in your browser and never sent to our servers.
          The key you enter here takes priority over any environment variable.
        </div>

        {/* Save */}
        <div style={S.saveRow}>
          <button
            className="btn btn-primary"
            onClick={saveAiSettings}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save AI Settings'}
          </button>
        </div>
      </div>
    );
  }

  function renderAdminTab() {
    return (
      <div style={S.card}>
        <h2 style={S.sectionTitle}>Admin Panel</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--graphite)', marginBottom: 24, lineHeight: 1.6 }}>
          As a Superadmin you have full access to the platform admin dashboard — schools, users, quests, and platform analytics.
        </p>

        <Link
          to="/admin"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'var(--lab-blue)',
            borderRadius: 10,
            textDecoration: 'none',
            transition: 'opacity 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Shield size={20} color="var(--chalk)" />
            <div>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14, color: 'var(--chalk)' }}>Open Admin Dashboard</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Schools · Users · Projects · Analytics</div>
            </div>
          </div>
          <ChevronRight size={18} color="rgba(255,255,255,0.8)" />
        </Link>

        <div style={{ marginTop: 20, padding: '14px 16px', background: '#FEF3C7', borderLeft: '3px solid #D97706', borderRadius: '0 8px 8px 0' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#92400E', lineHeight: 1.5, margin: 0 }}>
            <strong>Superadmin access is permanent and cannot be revoked from the Settings page.</strong> To modify superadmin roles, use the Admin Dashboard or contact your database administrator.
          </p>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div style={S.page}>
      {/* Scoped animations + responsive overrides */}
      <style>{`
        @keyframes toastSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @media (max-width: 640px) {
          .settings-sidebar  { display: none !important; }
          .settings-mobile-tabs { display: flex !important; }
        }
      `}</style>

      <TopBar />

      <div style={S.body}>
        {/* Page header */}
        <div style={S.pageHeader}>
          <button
            style={S.backBtn}
            onClick={() => navigate('/dashboard')}
            aria-label="Back to dashboard"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--parchment)';
              e.currentTarget.style.color = 'var(--ink)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--graphite)';
            }}
          >
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <h1 style={S.pageTitle}>Settings</h1>
        </div>

        {/* Mobile tabs (visible only below 640px via media query) */}
        <div className="settings-mobile-tabs" style={S.mobileTabs}>
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              style={S.mobileTabBtn(activeTab === id)}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={13} strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>

        {/* Desktop layout: sidebar + content */}
        <div style={S.layout}>
          {/* Sidebar (hidden below 640px via media query) */}
          <nav className="settings-sidebar" style={S.sidebar} aria-label="Settings sections">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                style={S.tabBtn(activeTab === id)}
                onClick={() => setActiveTab(id)}
                aria-current={activeTab === id ? 'page' : undefined}
                onMouseEnter={(e) => {
                  if (activeTab !== id) {
                    e.currentTarget.style.background = 'var(--parchment)';
                    e.currentTarget.style.color = 'var(--ink)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== id) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--graphite)';
                  }
                }}
              >
                <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <main style={S.content}>
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'school' && renderSchoolTab()}
            {activeTab === 'ai' && renderAiTab()}
            {activeTab === 'admin' && renderAdminTab()}
          </main>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={S.toastWrapper} role="status" aria-live="polite">
          <div style={S.toast(toast.type)}>
            {toast.type === 'success'
              ? <Check size={15} strokeWidth={2.5} />
              : <AlertCircle size={15} strokeWidth={2.5} />
            }
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
