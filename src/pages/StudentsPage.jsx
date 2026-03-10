import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Edit2, Trash2, X, Check, ChevronLeft, Users, Eye, EyeOff, Copy, Link2, Loader2, Plus, Share2, UserCheck, ExternalLink, RefreshCw, Gift } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { invites as invitesApi, buddyPairs, xp } from '../lib/api';
import ExplorerRankBadge from '../components/xp/ExplorerRankBadge';
import KudosModal from '../components/guide/KudosModal';
import TopBar from '../components/layout/TopBar';

// ── Constants ─────────────────────────────────────────────────────────────────

const GRADE_BANDS = ['K-2', '3-5', '6-8', '9-12'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStudentInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function countActiveQuests(student) {
  if (!student.quest_students || student.quest_students.length === 0) return 0;
  return student.quest_students.filter(
    (qs) => qs.quests && qs.quests.status !== 'archived'
  ).length;
}

// ── Student Row ───────────────────────────────────────────────────────────────

function StudentRow({ student, isEditing, onEdit, onCancelEdit, onSave, onDelete, onPinRegenerated, pairingMode, selectedForPairing, onTogglePairing, buddyInfo, xpData, onKudos }) {
  const activeQuestCount = countActiveQuests(student);

  if (isEditing) {
    return (
      <EditingRow
        student={student}
        onCancel={onCancelEdit}
        onSave={onSave}
      />
    );
  }

  return (
    <ViewRow
      student={student}
      activeQuestCount={activeQuestCount}
      onEdit={onEdit}
      onDelete={onDelete}
      onPinRegenerated={onPinRegenerated}
      pairingMode={pairingMode}
      selectedForPairing={selectedForPairing}
      onTogglePairing={onTogglePairing}
      buddyInfo={buddyInfo}
      xpData={xpData}
      onKudos={onKudos}
    />
  );
}

function ViewRow({ student, activeQuestCount, onEdit, onDelete, onShareParent, onPinRegenerated, pairingMode, selectedForPairing, onTogglePairing, buddyInfo, xpData, onKudos }) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  async function regeneratePin() {
    setRegenerating(true);
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const newPin = String(1000 + (array[0] % 9000));
    const { error } = await supabase
      .from('students')
      .update({ pin: newPin })
      .eq('id', student.id);
    if (!error && onPinRegenerated) {
      onPinRegenerated(student.id, newPin);
    }
    setRegenerating(false);
  }
  const interests = Array.isArray(student.interests) ? student.interests : [];
  const visibleInterests = interests.slice(0, 4);
  const extraCount = interests.length - 4;
  const initials = getStudentInitials(student.name);

  function copyPin() {
    if (!student.pin) return;
    navigator.clipboard.writeText(student.pin).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="card sp-student-card" style={styles.studentCard}>
      {/* Left side */}
      <div style={styles.studentLeft}>
        {/* Avatar */}
        <div className="sp-avatar" style={styles.avatar} aria-hidden="true">{initials}</div>

        {/* Info */}
        <div style={styles.studentInfo}>
          {/* Name row */}
          <div style={styles.nameRow}>
            {student.avatar_emoji && <span style={{ fontSize: 16 }}>{student.avatar_emoji}</span>}
            <span
              style={{ ...styles.studentName, cursor: 'pointer', textDecoration: 'none' }}
              onClick={() => navigate(`/students/${student.id}`)}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--lab-blue)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink)'; }}
              role="link"
              tabIndex={0}
            >
              {student.name}
            </span>
            {student.grade_band && (
              <span style={styles.gradeBadge}>{student.grade_band}</span>
            )}
            {student.age && (
              <span style={styles.ageText}>(age {student.age})</span>
            )}
            {student.onboarded_at && (
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--field-green)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(45,106,79,0.08)', padding: '1px 6px', borderRadius: 4 }}>
                Onboarded
              </span>
            )}
            {xpData && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                <ExplorerRankBadge rank={xpData.current_rank} size="sm" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--graphite)' }}>
                  {xpData.total_points} EP
                </span>
              </span>
            )}
            {student.parent_access?.length > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                padding: '1px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 3,
                color: student.parent_access.some(p => p.onboarded_at) ? 'var(--lab-blue)' : 'var(--compass-gold)',
                background: student.parent_access.some(p => p.onboarded_at) ? 'rgba(27,73,101,0.08)' : 'rgba(184,134,11,0.08)',
              }}>
                <UserCheck size={9} />
                {student.parent_access.some(p => p.onboarded_at) ? 'Parent active' : 'Parent invited'}
              </span>
            )}
          </div>

          {/* Interests + quest count */}
          <div style={styles.metaRow}>
            {visibleInterests.length > 0 ? (
              <>
                {visibleInterests.map((interest) => (
                  <span key={interest} className="skill-tag default" style={{ marginRight: 4 }}>
                    {interest}
                  </span>
                ))}
                {extraCount > 0 && (
                  <span style={styles.extraChips}>+{extraCount} more</span>
                )}
              </>
            ) : (
              <span style={styles.noInterests}>No interests set</span>
            )}
            <span style={styles.questCount}>
              {activeQuestCount > 0
                ? `${activeQuestCount} active project${activeQuestCount !== 1 ? 's' : ''}`
                : 'No projects yet'}
            </span>
          </div>

          {/* PIN row */}
          {student.pin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--graphite)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Student code:</span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                color: 'var(--ink)', letterSpacing: '0.2em',
                background: 'var(--parchment)', padding: '1px 8px', borderRadius: 4,
              }}>
                {pinVisible ? student.pin : '••••'}
              </span>
              <button
                onClick={() => setPinVisible((v) => !v)}
                title={pinVisible ? 'Hide code' : 'Show code'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--graphite)', padding: 2, display: 'inline-flex' }}
              >
                {pinVisible ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <button
                onClick={copyPin}
                title="Copy code"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--field-green)' : 'var(--graphite)', padding: 2, display: 'inline-flex', transition: 'color 150ms' }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
              <button
                onClick={regeneratePin}
                disabled={regenerating}
                title="Generate new code"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--graphite)', padding: 2, display: 'inline-flex', opacity: regenerating ? 0.5 : 1 }}
              >
                <RefreshCw size={12} style={regenerating ? { animation: 'spin 1s linear infinite' } : {}} />
              </button>
            </div>
          )}

          {/* Buddy pairing */}
          {pairingMode ? (
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', marginTop: 6 }}>
              <input type="checkbox"
                checked={selectedForPairing.includes(student.id)}
                disabled={selectedForPairing.length >= 2 && !selectedForPairing.includes(student.id)}
                onChange={e => {
                  if (e.target.checked) onTogglePairing(student.id, true);
                  else onTogglePairing(student.id, false);
                }}
                style={{ accentColor: 'var(--compass-gold)' }}
              />
              <span style={{ fontSize: 10, fontFamily: 'var(--font-body)', color: 'var(--graphite)' }}>Select for pairing</span>
            </label>
          ) : buddyInfo ? (
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 10, marginTop: 6, display: 'inline-block',
              background: 'rgba(184,134,11,0.08)', color: 'var(--compass-gold)', fontFamily: 'var(--font-body)', fontWeight: 600,
            }}>
              Buddy: {buddyInfo.buddy?.name}
            </span>
          ) : null}
        </div>
      </div>

      {/* Right side */}
      <div className="sp-right" style={styles.studentRight}>
        {confirmDelete ? (
          <div style={styles.confirmRow}>
            <button
              className="btn btn-ghost"
              style={{ fontSize: '13px', padding: '4px 10px' }}
              onClick={() => setConfirmDelete(false)}
            >
              <X size={13} style={{ marginRight: 3 }} /> Cancel
            </button>
            <button
              className="btn"
              style={styles.confirmDeleteBtn}
              onClick={() => {
                setConfirmDelete(false);
                onDelete(student.id);
              }}
            >
              <Trash2 size={13} style={{ marginRight: 4 }} />
              Delete {student.name.split(' ')[0]}?
            </button>
          </div>
        ) : (
          <div style={styles.actionBtns}>
            <button
              style={styles.rowIconBtn}
              aria-label={`View ${student.name}'s profile`}
              title="View profile"
              onClick={() => navigate(`/students/${student.id}`)}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--lab-blue)'; e.currentTarget.style.background = 'rgba(27,73,101,0.07)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--graphite)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <ExternalLink size={16} />
            </button>
            <button
              style={styles.rowIconBtn}
              aria-label={`Edit ${student.name}`}
              title="Edit student"
              onClick={() => onEdit(student.id)}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--lab-blue)'; e.currentTarget.style.background = 'rgba(27,73,101,0.07)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--graphite)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <Edit2 size={16} />
            </button>
            <button
              style={styles.rowIconBtn}
              aria-label={`Give kudos to ${student.name}`}
              title="Give Kudos"
              onClick={(e) => { e.stopPropagation(); onKudos?.(student); }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--compass-gold)'; e.currentTarget.style.background = 'rgba(184,134,11,0.07)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--graphite)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <Gift size={16} />
            </button>
            <button
              style={styles.rowIconBtn}
              aria-label={`Delete ${student.name}`}
              title="Delete student"
              onClick={() => setConfirmDelete(true)}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--specimen-red)'; e.currentTarget.style.background = 'rgba(192,57,43,0.07)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--graphite)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

function EditingRow({ student, onCancel, onSave }) {
  const [name, setName] = useState(student.name || '');
  const [age, setAge] = useState(student.age ? String(student.age) : '');
  const [gradeBand, setGradeBand] = useState(student.grade_band || '');
  const [interests, setInterests] = useState(
    Array.isArray(student.interests) ? student.interests.join(', ') : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError('');

    const parsedInterests = interests
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const { data, error: supaErr } = await supabase
      .from('students')
      .update({
        name: name.trim(),
        age: age ? parseInt(age, 10) : null,
        grade_band: gradeBand || null,
        interests: parsedInterests,
      })
      .eq('id', student.id)
      .select('*, quest_students(quest_id, quests(id, title, status))')
      .single();

    if (supaErr) {
      setError(supaErr.message || 'Failed to save changes.');
      setSaving(false);
      return;
    }

    onSave(data);
  }

  return (
    <div className="card" style={{ ...styles.studentCard, flexDirection: 'column', alignItems: 'stretch', gap: 16, background: 'var(--chalk)', borderColor: 'var(--lab-blue)' }}>
      {/* Name */}
      <div style={styles.editFieldRow}>
        <label style={styles.editLabel}>Full Name</label>
        <input
          className="input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          style={styles.editInput}
        />
      </div>

      {/* Age + Grade Band */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ ...styles.editFieldRow, flex: 1 }}>
          <label style={styles.editLabel}>Age</label>
          <input
            className="input"
            type="number"
            min={4}
            max={18}
            placeholder="e.g. 11"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            style={styles.editInput}
          />
        </div>
        <div style={{ ...styles.editFieldRow, flex: 1 }}>
          <label style={styles.editLabel}>Grade Band</label>
          <select
            className="input"
            value={gradeBand}
            onChange={(e) => setGradeBand(e.target.value)}
            style={{ ...styles.editInput, cursor: 'pointer' }}
          >
            <option value="">None</option>
            {GRADE_BANDS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Interests */}
      <div style={styles.editFieldRow}>
        <label style={styles.editLabel}>Interests</label>
        <div style={{ flex: 1 }}>
          <input
            className="input"
            type="text"
            placeholder="e.g. Minecraft, Space, Cooking"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
          />
          <p style={styles.helperText}>Separate with commas, e.g. Minecraft, Space, Cooking</p>
        </div>
      </div>

      {error && <p style={styles.errorText}>{error}</p>}

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel} style={{ fontSize: '13px', padding: '6px 14px' }}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ fontSize: '13px', padding: '6px 14px' }}
        >
          {saving ? (
            'Saving...'
          ) : (
            <><Check size={14} style={{ marginRight: 4 }} />Save Changes</>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Invite Link Section ──────────────────────────────────────────────────────

function InviteLinkSection({ guideId, schoolId }) {
  const [invitesList, setInvitesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [label, setLabel] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expDays, setExpDays] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => { loadInvites(); }, []);

  async function loadInvites() {
    setLoading(true);
    const { data } = await invitesApi.list(guideId);
    setInvitesList(data || []);
    setLoading(false);
  }

  async function handleCreate() {
    setCreating(true);
    const expiresAt = expDays ? new Date(Date.now() + parseInt(expDays) * 86400000).toISOString() : null;
    const { data, error } = await invitesApi.create({
      guideId, schoolId,
      label: label.trim() || null,
      maxUses: maxUses ? parseInt(maxUses) : null,
      expiresAt,
    });
    if (data) {
      setInvitesList(prev => [data, ...prev]);
      setShowCreate(false);
      setLabel('');
      setMaxUses('');
      setExpDays('');
    }
    setCreating(false);
  }

  async function handleDeactivate(id) {
    await invitesApi.deactivate(id);
    setInvitesList(prev => prev.map(inv => inv.id === id ? { ...inv, active: false } : inv));
  }

  function copyLink(invite) {
    const url = `${window.location.origin}/join/${invite.code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  }

  const active = invitesList.filter(i => i.active);

  if (loading) {
    return (
      <div style={{ background: '#EFF8F1', border: '1px solid #A7D7B8', borderRadius: 12, padding: '14px 18px', marginBottom: 20, textAlign: 'center' }}>
        <Loader2 size={16} color="var(--field-green)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{
      background: '#EFF8F1', border: '1px solid #A7D7B8', borderRadius: 12,
      padding: '16px 18px', marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: active.length > 0 || showCreate ? 12 : 0 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, color: 'var(--field-green)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link2 size={14} /> Invite Links
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--graphite)', marginTop: 2 }}>
            Share a link so students can fill out their learner profile and join your class.
          </div>
        </div>
        <button
          onClick={() => setShowCreate(s => !s)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '6px 14px', borderRadius: 8,
            border: '1px solid var(--field-green)', background: showCreate ? 'var(--field-green)' : 'var(--chalk)',
            color: showCreate ? 'var(--chalk)' : 'var(--field-green)',
            fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)',
            cursor: 'pointer', transition: 'all 150ms', whiteSpace: 'nowrap',
          }}
        >
          {showCreate ? <X size={13} /> : <Plus size={13} />}
          {showCreate ? 'Cancel' : 'Create Link'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: 'var(--chalk)', borderRadius: 8, padding: '14px 16px', marginBottom: 12, border: '1px solid #C3E6CF' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: 140 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-body)', display: 'block', marginBottom: 3 }}>Label</label>
              <input className="input" type="text" placeholder="e.g. Fall 2026 intake" value={label} onChange={e => setLabel(e.target.value)} style={{ fontSize: 12 }} />
            </div>
            <div style={{ flex: 1, minWidth: 80 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-body)', display: 'block', marginBottom: 3 }}>Max uses</label>
              <input className="input" type="number" min={1} placeholder="Unlimited" value={maxUses} onChange={e => setMaxUses(e.target.value)} style={{ fontSize: 12 }} />
            </div>
            <div style={{ flex: 1, minWidth: 80 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-body)', display: 'block', marginBottom: 3 }}>Expires in</label>
              <select className="input" value={expDays} onChange={e => setExpDays(e.target.value)} style={{ fontSize: 12, cursor: 'pointer' }}>
                <option value="">Never</option>
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
              </select>
            </div>
          </div>
          <button onClick={handleCreate} disabled={creating} className="btn btn-primary" style={{ fontSize: 12, padding: '6px 16px' }}>
            {creating ? 'Creating...' : 'Create Invite Link'}
          </button>
        </div>
      )}

      {/* Active invites list */}
      {active.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {active.map(inv => (
            <div
              key={inv.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: 8, background: 'var(--chalk)',
                border: '1px solid #C3E6CF', gap: 8, flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {window.location.origin}/join/{inv.code}
                </div>
                <div style={{ fontSize: 10, color: 'var(--graphite)', fontFamily: 'var(--font-body)', marginTop: 1 }}>
                  {inv.label || 'No label'} · {inv.use_count} use{inv.use_count !== 1 ? 's' : ''}
                  {inv.max_uses && ` / ${inv.max_uses} max`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => copyLink(inv)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', borderRadius: 6,
                    border: `1px solid ${copiedId === inv.id ? 'var(--field-green)' : 'var(--pencil)'}`,
                    background: copiedId === inv.id ? 'rgba(45,106,79,0.08)' : 'transparent',
                    color: copiedId === inv.id ? 'var(--field-green)' : 'var(--graphite)',
                    fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-body)',
                    cursor: 'pointer', transition: 'all 150ms',
                  }}
                >
                  {copiedId === inv.id ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                </button>
                <button
                  onClick={() => handleDeactivate(inv.id)}
                  title="Deactivate"
                  style={{
                    display: 'inline-flex', alignItems: 'center', padding: '4px 6px',
                    borderRadius: 6, border: '1px solid var(--pencil)',
                    background: 'transparent', color: 'var(--graphite)',
                    cursor: 'pointer', fontSize: 11,
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={styles.emptyState}>
      <Users size={48} color="var(--pencil)" strokeWidth={1.25} aria-hidden="true" />
      <p style={styles.emptyTitle}>No students yet</p>
      <p style={styles.emptySubtitle}>Create an invite link above to let students join your class.</p>
    </div>
  );
}

function EmptySearchState({ query }) {
  return (
    <div style={styles.emptyState}>
      <Search size={36} color="var(--pencil)" strokeWidth={1.25} aria-hidden="true" />
      <p style={styles.emptyTitle}>No results for "{query}"</p>
      <p style={styles.emptySubtitle}>Try searching by a different name or interest.</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

// ── Parent Connections Section ────────────────────────────────────────────────

function ParentConnectionsSection({ students }) {
  const [copiedLink, setCopiedLink] = useState(false);

  const parentLink = `${window.location.origin}/parent`;
  const withParent = students.filter(s => s.parent_access?.length > 0);
  const onboarded = withParent.filter(s => s.parent_access.some(p => p.onboarded_at));

  function copyParentLink() {
    navigator.clipboard.writeText(parentLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  return (
    <div style={{
      marginTop: 32, padding: '20px 24px',
      background: 'var(--chalk)', border: '1px solid var(--pencil)',
      borderRadius: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserCheck size={16} color="var(--lab-blue)" />
          <h3 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15, color: 'var(--ink)', margin: 0 }}>
            Parent Portal
          </h3>
        </div>
        <div style={{ display: 'flex', gap: 12, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          <span style={{ color: 'var(--lab-blue)' }}>{onboarded.length} active</span>
          <span style={{ color: 'var(--graphite)' }}>{students.length - withParent.length} not connected</span>
        </div>
      </div>

      <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)', lineHeight: 1.5, margin: '0 0 14px' }}>
        Share one link with all parents. They enter their child's student code to connect — the same code students use to join projects.
      </p>

      {/* Universal parent link */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px', borderRadius: 10,
        background: 'rgba(27,73,101,0.04)', border: '2px solid rgba(27,73,101,0.2)',
        marginBottom: 16,
      }}>
        <Share2 size={16} color="var(--lab-blue)" style={{ flexShrink: 0 }} />
        <code style={{
          flex: 1, fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600,
          color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {parentLink}
        </code>
        <button
          onClick={copyParentLink}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '6px 14px', borderRadius: 8, border: 'none',
            background: copiedLink ? 'var(--field-green)' : 'var(--lab-blue)',
            color: 'var(--chalk)', fontSize: 12, fontWeight: 700,
            fontFamily: 'var(--font-body)', cursor: 'pointer', flexShrink: 0,
            transition: 'background 150ms',
          }}
        >
          {copiedLink ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy Link</>}
        </button>
      </div>

      {/* Per-student status */}
      {students.length > 0 && (
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--graphite)', marginBottom: 8 }}>
            Student codes & parent status
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {students.map(student => {
              const pa = student.parent_access?.[0];
              const isOnboarded = !!pa?.onboarded_at;
              const hasParent = !!pa;
              return (
                <div key={student.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 12px', background: 'var(--parchment)',
                  borderRadius: 8,
                }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--ink)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {student.name}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                    color: 'var(--ink)', letterSpacing: '0.15em',
                    background: 'var(--chalk)', padding: '2px 8px', borderRadius: 4,
                    border: '1px solid var(--pencil)',
                  }}>
                    {student.pin || '—'}
                  </span>
                  {hasParent ? (
                    <span style={{
                      fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)',
                      padding: '2px 8px', borderRadius: 4,
                      color: isOnboarded ? 'var(--lab-blue)' : 'var(--compass-gold)',
                      background: isOnboarded ? 'rgba(27,73,101,0.08)' : 'rgba(184,134,11,0.08)',
                      whiteSpace: 'nowrap',
                    }}>
                      {isOnboarded ? (pa.parent_name || 'Parent') + ' connected' : 'Pending'}
                    </span>
                  ) : (
                    <span style={{
                      fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)',
                      padding: '2px 8px', borderRadius: 4,
                      color: 'var(--pencil)', background: 'var(--chalk)',
                      whiteSpace: 'nowrap',
                    }}>
                      Not connected
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {students.length === 0 && (
        <p style={{ color: 'var(--pencil)', fontSize: 13, fontStyle: 'italic', margin: 0 }}>
          Add students first, then share the parent link.
        </p>
      )}
    </div>
  );
}

export default function StudentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [pairs, setPairs] = useState([]);
  const [pairingMode, setPairingMode] = useState(false);
  const [selectedForPairing, setSelectedForPairing] = useState([]);
  const [studentXpMap, setStudentXpMap] = useState({});
  const [kudosTarget, setKudosTarget] = useState(null);

  // Load students
  useEffect(() => {
    if (!user) return;
    fetchStudents();
  }, [user]);

  // Load buddy pairs
  useEffect(() => {
    if (!profile?.school_id) return;
    buddyPairs.getForSchool(profile.school_id).then(setPairs);
  }, [profile?.school_id]);

  // Handle ?edit=studentId URL param
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && students.length > 0) {
      const found = students.find((s) => s.id === editId);
      if (found) setEditingId(editId);
    }
  }, [searchParams, students]);

  async function fetchStudents() {
    setLoading(true);
    setLoadError('');
    const { data, error } = await supabase
      .from('students')
      .select('*, quest_students(quest_id, quests(id, title, status)), parent_access(*)')
      .eq('guide_id', user.id)
      .order('name');

    if (error) {
      setLoadError(error.message || 'Could not load students.');
    } else {
      setStudents(data || []);
      // Load XP for all students
      (data || []).forEach(s => {
        xp.getStudentXP(s.id).then(xpData => {
          setStudentXpMap(prev => ({ ...prev, [s.id]: xpData }));
        }).catch(console.error);
      });
    }
    setLoading(false);
  }

  function handleSave(updated) {
    setStudents((prev) => {
      const next = prev.map((s) => (s.id === updated.id ? updated : s));
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });
    setEditingId(null);
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (!error) {
      setStudents((prev) => prev.filter((s) => s.id !== id));
    }
  }

  // Buddy pairing
  const handlePair = async () => {
    if (selectedForPairing.length !== 2) return;
    const schoolId = profile?.school_id;
    if (!schoolId) return;
    const pair = await buddyPairs.create(selectedForPairing[0], selectedForPairing[1], schoolId);
    if (pair) {
      setPairs(prev => [...prev, pair]);
      setSelectedForPairing([]);
      setPairingMode(false);
    }
  };

  const handleUnpair = async (pairId) => {
    await buddyPairs.end(pairId);
    setPairs(prev => prev.filter(p => p.id !== pairId));
  };

  const getBuddy = (studentId) => {
    const pair = pairs.find(p => p.student_a_id === studentId || p.student_b_id === studentId);
    if (!pair) return null;
    const buddy = pair.student_a_id === studentId ? pair.student_b : pair.student_a;
    return { buddy, pairId: pair.id };
  };

  // Filter
  const filteredStudents = students.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (s.name.toLowerCase().includes(q)) return true;
    if (Array.isArray(s.interests)) {
      return s.interests.some((i) => i.toLowerCase().includes(q));
    }
    return false;
  });

  const hasStudents = students.length > 0;
  const hasResults = filteredStudents.length > 0;

  return (
    <div style={styles.pageWrapper}>
      <TopBar />
      <style>{`
        @media (max-width: 640px) {
          .sp-student-card {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .sp-student-card .sp-avatar {
            display: none !important;
          }
          .sp-student-card .sp-right {
            align-self: flex-end;
            margin-top: -28px;
          }
          .sp-parent-share {
            width: 100%;
          }
          .sp-parent-share > div {
            flex-direction: column !important;
          }
          .sp-parent-share input {
            width: 100% !important;
          }
        }
      `}</style>

      <main style={styles.main}>
        <div style={styles.content}>
          {/* Page header */}
          <div style={styles.pageHeader}>
            <div style={styles.pageHeaderLeft}>
              <button
                style={styles.backBtn}
                onClick={() => navigate('/dashboard')}
                aria-label="Back to Dashboard"
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--graphite)'; }}
              >
                <ChevronLeft size={20} />
              </button>
              <h1 style={styles.pageTitle}>Students</h1>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
              <button onClick={() => { setPairingMode(!pairingMode); setSelectedForPairing([]); }} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                borderRadius: 8, border: pairingMode ? '1.5px solid var(--compass-gold)' : '1px solid var(--pencil)',
                background: pairingMode ? 'rgba(184,134,11,0.06)' : 'var(--chalk)',
                color: 'var(--ink)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}>
                <Users size={13} /> {pairingMode ? 'Cancel Pairing' : 'Pair Buddies'}
              </button>
              {pairingMode && selectedForPairing.length === 2 && (
                <button onClick={handlePair} style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none',
                  background: 'var(--compass-gold)', color: 'white', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>
                  Pair These Learners
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/students/groups')}
                title="AI Group Builder"
              >
                <Users size={15} />
                Groups
              </button>
            </div>
          </div>

          {/* Invite links */}
          {user && (
            <InviteLinkSection guideId={user.id} schoolId={profile?.school_id} />
          )}

          {/* Search bar */}
          {hasStudents && (
            <div style={styles.searchWrapper}>
              <Search size={16} color="var(--pencil)" style={styles.searchIcon} aria-hidden="true" />
              <input
                className="input"
                type="search"
                placeholder="Search by name or interest..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
                aria-label="Search students"
              />
              {searchQuery && (
                <button
                  style={styles.searchClear}
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {/* Body */}
          {loading ? (
            <div style={styles.loadingState}>
              <p style={{ color: 'var(--graphite)', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
                Loading students...
              </p>
            </div>
          ) : loadError ? (
            <div style={styles.loadingState}>
              <p style={{ color: 'var(--specimen-red)', fontSize: '14px' }}>{loadError}</p>
              <button className="btn btn-secondary" onClick={fetchStudents} style={{ marginTop: 12 }}>
                Retry
              </button>
            </div>
          ) : !hasStudents ? (
            <EmptyState />
          ) : !hasResults ? (
            <EmptySearchState query={searchQuery} />
          ) : (
            <div style={styles.studentList} role="list">
              {filteredStudents.map((student) => (
                <div key={student.id} role="listitem">
                  <StudentRow
                    student={student}
                    isEditing={editingId === student.id}
                    onEdit={(id) => setEditingId(id)}
                    onCancelEdit={() => setEditingId(null)}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    onPinRegenerated={(id, newPin) => {
                      setStudents(prev => prev.map(s => s.id === id ? { ...s, pin: newPin } : s));
                    }}
                    pairingMode={pairingMode}
                    selectedForPairing={selectedForPairing}
                    onTogglePairing={(id, add) => {
                      if (add) setSelectedForPairing(prev => [...prev, id]);
                      else setSelectedForPairing(prev => prev.filter(x => x !== id));
                    }}
                    buddyInfo={getBuddy(student.id)}
                    xpData={studentXpMap[student.id]}
                    onKudos={(s) => setKudosTarget(s)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Parent Connections section */}
          {hasStudents && !loading && (
            <ParentConnectionsSection students={students} />
          )}

          {/* Student count footer */}
          {hasStudents && !loading && (
            <p style={styles.footerCount}>
              {searchQuery
                ? `${filteredStudents.length} of ${students.length} student${students.length !== 1 ? 's' : ''}`
                : `${students.length} student${students.length !== 1 ? 's' : ''} total`}
            </p>
          )}
        </div>
      </main>

      {kudosTarget && (
        <KudosModal
          student={kudosTarget}
          guideId={profile?.id}
          onClose={() => setKudosTarget(null)}
          onSuccess={() => {
            xp.getStudentXP(kudosTarget.id).then(data => {
              setStudentXpMap(prev => ({ ...prev, [kudosTarget.id]: data }));
            }).catch(console.error);
          }}
        />
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  pageWrapper: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: 'var(--paper)',
  },
  main: {
    flex: 1,
    padding: '32px 24px 64px',
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
  },

  // Header
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    gap: 12,
  },
  pageHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--graphite)',
    padding: '4px',
    borderRadius: '6px',
    transition: 'color 150ms ease',
    flexShrink: 0,
  },
  pageTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.75rem',
    fontWeight: 400,
    color: 'var(--ink)',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },

  // Search
  searchWrapper: {
    position: 'relative',
    marginBottom: '20px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  searchInput: {
    paddingLeft: '38px',
    paddingRight: '36px',
  },
  searchClear: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--graphite)',
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
    borderRadius: '4px',
  },

  // Student list
  studentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  studentCard: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '14px 18px',
    background: 'var(--chalk)',
    transition: 'box-shadow 150ms ease',
    flexWrap: 'wrap',
  },

  // Student content
  studentLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'var(--parchment)',
    border: '1px solid var(--pencil)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--ink)',
    letterSpacing: '0.04em',
    userSelect: 'none',
    flexShrink: 0,
  },
  studentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  studentName: {
    fontWeight: 700,
    fontSize: 'var(--text-base)',
    color: 'var(--ink)',
    lineHeight: 1.2,
  },
  gradeBadge: {
    display: 'inline-block',
    background: 'var(--parchment)',
    border: '1px solid var(--pencil)',
    borderRadius: '100px',
    padding: '1px 8px',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    fontWeight: 500,
    color: 'var(--graphite)',
    letterSpacing: '0.04em',
    lineHeight: 1.5,
  },
  ageText: {
    fontSize: '12px',
    color: 'var(--graphite)',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  extraChips: {
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--graphite)',
    marginLeft: 2,
  },
  noInterests: {
    fontSize: '12px',
    color: 'var(--pencil)',
    fontStyle: 'italic',
  },
  questCount: {
    fontSize: '12px',
    color: 'var(--graphite)',
    marginLeft: 6,
    whiteSpace: 'nowrap',
  },

  // Right actions
  studentRight: {
    flexShrink: 0,
  },
  actionBtns: {
    display: 'flex',
    gap: 2,
  },
  rowIconBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--graphite)',
    padding: '6px',
    borderRadius: '6px',
    transition: 'color 150ms ease, background 150ms ease',
  },
  confirmRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  confirmDeleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(192,57,43,0.08)',
    color: 'var(--specimen-red)',
    border: '1px solid rgba(192,57,43,0.25)',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    transition: 'background 150ms ease',
    whiteSpace: 'nowrap',
  },

  // Edit row
  editFieldRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
  },
  editLabel: {
    width: '90px',
    flexShrink: 0,
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--graphite)',
    paddingTop: '10px',
    fontFamily: 'var(--font-body)',
  },
  editInput: {
    flex: 1,
  },

  // Empty states
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    gap: 10,
    textAlign: 'center',
  },
  emptyTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.25rem',
    color: 'var(--ink)',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 'var(--text-sm)',
    color: 'var(--graphite)',
    maxWidth: '320px',
  },

  // Loading
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '64px 24px',
    gap: 8,
  },

  // Footer count
  footerCount: {
    marginTop: '20px',
    textAlign: 'center',
    fontSize: '13px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--pencil)',
    letterSpacing: '0.02em',
  },

  helperText: {
    fontSize: '11px',
    color: 'var(--pencil)',
    marginTop: '5px',
    fontFamily: 'var(--font-mono)',
  },
  errorText: {
    color: 'var(--specimen-red)',
    fontSize: '13px',
    marginBottom: '8px',
    fontWeight: 500,
  },
};
