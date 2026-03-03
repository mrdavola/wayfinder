import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, X, Check, ChevronLeft, BookOpen, Users, Upload, Download, AlertCircle, Eye, EyeOff, Copy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import TopBar from '../components/layout/TopBar';

// ── Constants ─────────────────────────────────────────────────────────────────

const INTEREST_CHIPS = [
  'Minecraft', 'Animals', 'Space', 'Cooking',
  'Sports', 'Music', 'Building', 'Art',
  'Gaming', 'Robotics', 'Science', 'Reading',
];

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

// ── Add Student Modal ─────────────────────────────────────────────────────────

function AddStudentModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gradeBand, setGradeBand] = useState('');
  const [selectedChips, setSelectedChips] = useState([]);
  const [otherInterests, setOtherInterests] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { user } = useAuth();

  function toggleChip(chip) {
    setSelectedChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError('');

    const extras = otherInterests
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const interests = [...selectedChips, ...extras];

    const pin = String(Math.floor(1000 + Math.random() * 9000));

    const { data, error: supaErr } = await supabase
      .from('students')
      .insert({
        name: name.trim(),
        age: age ? parseInt(age, 10) : null,
        grade_band: gradeBand || null,
        interests,
        guide_id: user.id,
        pin,
      })
      .select('*, quest_students(quest_id, quests(id, title, status))')
      .single();

    if (supaErr) {
      setError(supaErr.message || 'Failed to add student.');
      setSaving(false);
      return;
    }

    onAdd(data);
    onClose();
  }

  return (
    <div style={styles.modalBackdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        {/* Header */}
        <div style={styles.modalHeader}>
          <h2 id="modal-title" style={styles.modalTitle}>Add Student</h2>
          <button
            style={styles.iconBtn}
            onClick={onClose}
            aria-label="Close"
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--parchment)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="add-name">Full Name <span style={{ color: 'var(--specimen-red)' }}>*</span></label>
            <input
              id="add-name"
              className="input"
              type="text"
              placeholder="e.g. Alex Johnson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Age + Grade Band row */}
          <div style={styles.formRow}>
            <div style={{ flex: 1 }}>
              <label style={styles.label} htmlFor="add-age">Age</label>
              <input
                id="add-age"
                className="input"
                type="number"
                min={4}
                max={18}
                placeholder="e.g. 11"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label} htmlFor="add-grade">Grade Band</label>
              <select
                id="add-grade"
                className="input"
                value={gradeBand}
                onChange={(e) => setGradeBand(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="">Select...</option>
                {GRADE_BANDS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Interest chips */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Interests</label>
            <div style={styles.chipsGrid}>
              {INTEREST_CHIPS.map((chip) => {
                const selected = selectedChips.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    style={{
                      ...styles.interestChip,
                      background: selected ? 'var(--lab-blue)' : 'var(--parchment)',
                      color: selected ? 'var(--chalk)' : 'var(--ink)',
                      borderColor: selected ? 'var(--lab-blue)' : 'var(--pencil)',
                    }}
                    onClick={() => toggleChip(chip)}
                  >
                    {chip}
                  </button>
                );
              })}
            </div>
            <input
              className="input"
              type="text"
              placeholder="Other interests... (comma-separated)"
              value={otherInterests}
              onChange={(e) => setOtherInterests(e.target.value)}
              style={{ marginTop: '8px' }}
            />
            <p style={styles.helperText}>Separate with commas, e.g. Hiking, Chess, Photography</p>
          </div>

          {error && <p style={styles.errorText}>{error}</p>}

          {/* Footer */}
          <div style={styles.modalFooter}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Adding...' : (
                <>Add Student <span style={{ marginLeft: 2 }}>→</span></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Student Row ───────────────────────────────────────────────────────────────

function StudentRow({ student, isEditing, onEdit, onCancelEdit, onSave, onDelete }) {
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
    />
  );
}

function ViewRow({ student, activeQuestCount, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);
  const [copied, setCopied] = useState(false);
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
    <div className="card" style={styles.studentCard}>
      {/* Left side */}
      <div style={styles.studentLeft}>
        {/* Avatar */}
        <div style={styles.avatar} aria-hidden="true">{initials}</div>

        {/* Info */}
        <div style={styles.studentInfo}>
          {/* Name row */}
          <div style={styles.nameRow}>
            <span style={styles.studentName}>{student.name}</span>
            {student.grade_band && (
              <span style={styles.gradeBadge}>{student.grade_band}</span>
            )}
            {student.age && (
              <span style={styles.ageText}>(age {student.age})</span>
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
                ? `${activeQuestCount} active quest${activeQuestCount !== 1 ? 's' : ''}`
                : 'No quests yet'}
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
            </div>
          )}
        </div>
      </div>

      {/* Right side */}
      <div style={styles.studentRight}>
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

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onAdd }) {
  return (
    <div style={styles.emptyState}>
      <Users size={48} color="var(--pencil)" strokeWidth={1.25} aria-hidden="true" />
      <p style={styles.emptyTitle}>No students yet</p>
      <p style={styles.emptySubtitle}>Add your first student to start assigning quests.</p>
      <button className="btn btn-primary" onClick={onAdd} style={{ marginTop: 16 }}>
        <Plus size={16} />
        Add Student
      </button>
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

// ── Bulk Import Modal ─────────────────────────────────────────────────────────

const CSV_TEMPLATE = `Name,Age,Grade Band,Interests
Alex Johnson,11,3-5,Minecraft|Space|Robotics
Sam Rivera,9,3-5,Art|Animals|Reading
Jordan Lee,13,6-8,Gaming|Music|Science`;

function parseCsvText(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { rows: [], errors: [] };

  // Detect if first line is a header
  const firstLower = lines[0].toLowerCase();
  const startIdx = firstLower.includes('name') ? 1 : 0;
  const rows = [];
  const errors = [];

  for (let i = startIdx; i < lines.length; i++) {
    const raw = lines[i];
    // Support CSV (comma) or TSV (tab)
    const parts = raw.includes('\t')
      ? raw.split('\t')
      : raw.split(',');

    const name = (parts[0] || '').trim().replace(/^"|"$/g, '');
    if (!name) { errors.push(`Row ${i + 1}: missing name — skipped`); continue; }

    const ageRaw = (parts[1] || '').trim().replace(/^"|"$/g, '');
    const age = ageRaw && !isNaN(parseInt(ageRaw, 10)) ? parseInt(ageRaw, 10) : null;

    const gradeBandRaw = (parts[2] || '').trim().replace(/^"|"$/g, '');
    const validGrades = ['K-2', '3-5', '6-8', '9-12'];
    const grade_band = validGrades.includes(gradeBandRaw) ? gradeBandRaw : null;

    const interestRaw = (parts[3] || '').trim().replace(/^"|"$/g, '');
    const interests = interestRaw
      ? interestRaw.split(/[|,]/).map((s) => s.trim()).filter(Boolean)
      : [];

    rows.push({ name, age, grade_band, interests });
  }

  return { rows, errors };
}

function BulkImportModal({ onClose, onImport }) {
  const { user } = useAuth();
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState(null); // { rows, errors }
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  function handleParse() {
    if (!csvText.trim()) return;
    setPreview(parseCsvText(csvText));
    setImportError('');
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setCsvText(text);
      setPreview(parseCsvText(text));
    };
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wayfinder_students_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (!preview || preview.rows.length === 0) return;
    setImporting(true);
    setImportError('');

    const inserts = preview.rows.map((r) => ({
      name: r.name,
      age: r.age,
      grade_band: r.grade_band,
      interests: r.interests,
      guide_id: user.id,
    }));

    const { data, error } = await supabase
      .from('students')
      .insert(inserts)
      .select('*, quest_students(quest_id, quests(id, title, status))');

    setImporting(false);
    if (error) {
      setImportError(error.message || 'Import failed.');
      return;
    }
    setImportResult(data.length);
    onImport(data || []);
  }

  const T = {
    ink: '#1A1A2E', paper: '#FAF8F5', parchment: '#F0EDE6',
    graphite: '#6B7280', pencil: '#9CA3AF', chalk: '#FFFFFF',
    fieldGreen: '#2D6A4F', specimenRed: '#C0392B', compassGold: '#B8860B',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ backgroundColor: T.chalk, borderRadius: 14, width: '100%', maxWidth: 580, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${T.parchment}` }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: T.ink, margin: 0 }}>Import Students</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: T.graphite, margin: '2px 0 0' }}>
              Paste CSV or upload a file — columns: Name, Age, Grade Band, Interests
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: T.graphite }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {importResult ? (
            // Success state
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ marginBottom: 12 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill={`${T.fieldGreen}20`} stroke={T.fieldGreen} strokeWidth="1.5"/>
                  <polyline points="8,12 11,15 16,9" stroke={T.fieldGreen} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: T.ink, marginBottom: 6 }}>
                {importResult} student{importResult !== 1 ? 's' : ''} imported
              </div>
              <button onClick={onClose} className="btn btn-primary" style={{ marginTop: 16 }}>Done</button>
            </div>
          ) : (
            <>
              {/* Template download + file upload */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={downloadTemplate}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.pencil}`, background: 'transparent', color: T.graphite, fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer' }}
                >
                  <Download size={13} /> Download Template
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.pencil}`, background: 'transparent', color: T.graphite, fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)', cursor: 'pointer' }}
                >
                  <Upload size={13} /> Upload CSV
                </button>
                <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" style={{ display: 'none' }} onChange={handleFileUpload} />
              </div>

              {/* Paste area */}
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: T.ink, display: 'block', marginBottom: 6 }}>
                  Or paste data directly
                </label>
                <textarea
                  value={csvText}
                  onChange={(e) => { setCsvText(e.target.value); setPreview(null); }}
                  placeholder={`Name,Age,Grade Band,Interests\nAlex Johnson,11,3-5,Minecraft|Space\nSam Rivera,9,3-5,Art|Animals`}
                  rows={5}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.pencil}`, fontFamily: 'var(--font-mono)', fontSize: 12, color: T.ink, resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
                />
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: T.graphite, marginTop: 4 }}>
                  Separate multiple interests with | (pipe). Grade band: K-2, 3-5, 6-8, or 9-12.
                </p>
              </div>

              {/* Parse button */}
              {!preview && csvText.trim() && (
                <button onClick={handleParse} className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>
                  Preview Import
                </button>
              )}

              {/* Preview */}
              {preview && (
                <div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, color: T.ink, marginBottom: 8 }}>
                    Preview — {preview.rows.length} student{preview.rows.length !== 1 ? 's' : ''} found
                  </div>
                  {preview.errors.length > 0 && (
                    <div style={{ backgroundColor: `${T.specimenRed}10`, border: `1px solid ${T.specimenRed}30`, borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                      {preview.errors.map((e, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.specimenRed, fontFamily: 'var(--font-body)' }}>
                          <AlertCircle size={12} /> {e}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ border: `1px solid ${T.parchment}`, borderRadius: 8, overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)', fontSize: 12 }}>
                      <thead>
                        <tr style={{ backgroundColor: T.parchment }}>
                          {['Name', 'Age', 'Grade', 'Interests'].map((h) => (
                            <th key={h} style={{ textAlign: 'left', padding: '7px 10px', fontWeight: 700, color: T.ink, fontSize: 11 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((row, i) => (
                          <tr key={i} style={{ borderTop: `1px solid ${T.parchment}` }}>
                            <td style={{ padding: '7px 10px', color: T.ink }}>{row.name}</td>
                            <td style={{ padding: '7px 10px', color: T.graphite }}>{row.age || '—'}</td>
                            <td style={{ padding: '7px 10px', color: T.graphite }}>{row.grade_band || '—'}</td>
                            <td style={{ padding: '7px 10px', color: T.graphite }}>{row.interests.join(', ') || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: T.specimenRed, fontFamily: 'var(--font-body)' }}>
                  <AlertCircle size={14} /> {importError}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                {preview && preview.rows.length > 0 && (
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="btn btn-primary"
                  >
                    {importing ? 'Importing...' : `Import ${preview.rows.length} Student${preview.rows.length !== 1 ? 's' : ''}`}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StudentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Derived
  const schoolName = profile?.schools?.name || '';
  const guideName = profile?.full_name || '';

  // Load students
  useEffect(() => {
    if (!user) return;
    fetchStudents();
  }, [user]);

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
      .select('*, quest_students(quest_id, quests(id, title, status))')
      .eq('guide_id', user.id)
      .order('name');

    if (error) {
      setLoadError(error.message || 'Could not load students.');
    } else {
      setStudents(data || []);
    }
    setLoading(false);
  }

  function handleAdd(newStudent) {
    setStudents((prev) => {
      const next = [...prev, newStudent];
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });
  }

  function handleBulkImport(newStudents) {
    setStudents((prev) => {
      const next = [...prev, ...newStudents];
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });
    setShowBulkModal(false);
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
  const classroomCode = profile?.classroom_code || '';

  function copyClassroomCode() {
    if (!classroomCode) return;
    navigator.clipboard.writeText(classroomCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2500);
    });
  }

  return (
    <div style={styles.pageWrapper}>
      <TopBar />

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
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowBulkModal(true)}
                title="Import students from CSV"
              >
                <Upload size={15} />
                Import
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={16} />
                Add Student
              </button>
            </div>
          </div>

          {/* Classroom code banner */}
          {classroomCode && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#EBF2F7', border: '1px solid #C3D9E8', borderRadius: 10,
              padding: '12px 18px', marginBottom: 20, flexWrap: 'wrap', gap: 10,
            }}>
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--lab-blue)', marginBottom: 2 }}>
                  Your classroom code
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.12em' }}>
                  {classroomCode}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--graphite)', marginTop: 2 }}>
                  Share this with students so they can sign up and join your classroom at <strong>quest-lab-delta.vercel.app/student/signup</strong>
                </div>
              </div>
              <button
                onClick={copyClassroomCode}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8,
                  border: '1px solid var(--lab-blue)', background: codeCopied ? 'var(--lab-blue)' : 'var(--chalk)',
                  color: codeCopied ? 'var(--chalk)' : 'var(--lab-blue)',
                  fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 200ms ease', whiteSpace: 'nowrap',
                }}
              >
                {codeCopied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy code</>}
              </button>
            </div>
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
            <EmptyState onAdd={() => setShowAddModal(true)} />
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
                  />
                </div>
              ))}
            </div>
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

      {/* Add modal */}
      {showAddModal && (
        <AddStudentModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAdd}
        />
      )}

      {/* Bulk import modal */}
      {showBulkModal && (
        <BulkImportModal
          onClose={() => setShowBulkModal(false)}
          onImport={handleBulkImport}
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

  // Modal
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(26, 26, 46, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: '24px',
    backdropFilter: 'blur(2px)',
  },
  modal: {
    background: 'var(--chalk)',
    borderRadius: '12px',
    padding: '32px',
    width: '100%',
    maxWidth: '460px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(26, 26, 46, 0.2)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
  },
  modalTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.5rem',
    fontWeight: 400,
    color: 'var(--ink)',
    letterSpacing: '-0.02em',
  },
  iconBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--graphite)',
    padding: '6px',
    borderRadius: '6px',
    transition: 'background 150ms ease',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid var(--parchment)',
  },

  // Form
  formGroup: {
    marginBottom: '18px',
  },
  formRow: {
    display: 'flex',
    gap: 12,
    marginBottom: '18px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--graphite)',
    marginBottom: '6px',
    fontFamily: 'var(--font-body)',
  },
  chipsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '8px',
  },
  interestChip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 12px',
    borderRadius: '100px',
    border: '1px solid',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 120ms ease, color 120ms ease, border-color 120ms ease',
    fontFamily: 'var(--font-body)',
    lineHeight: 1,
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
