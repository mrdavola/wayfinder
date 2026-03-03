import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertCircle, ChevronRight, ChevronLeft, Check, Copy } from 'lucide-react';
import { invites, skills as skillsApi } from '../../lib/api';
import WayfinderLogoIcon from '../../components/icons/WayfinderLogo';

// ── Constants ────────────────────────────────────────────────────────────────

const GRADE_BANDS = ['K-2', '3-5', '6-8', '9-12'];

const INTEREST_GROUPS = {
  'Creative': ['Art', 'Music', 'Storytelling', 'Digital Design', 'Photography'],
  'STEM': ['Robotics', 'Coding', 'Engineering', 'Science', 'Math'],
  'Nature & Outdoors': ['Animals', 'Gardening', 'Environmental Science', 'Hiking'],
  'Active & Social': ['Sports', 'Cooking', 'Public Speaking', 'Leadership'],
  'Digital & Gaming': ['Minecraft', 'Gaming', 'Game Design', 'YouTube'],
  'Knowledge & Curiosity': ['Reading', 'Space', 'History', 'Building'],
};

const AVATAR_EMOJIS = [
  '🦊', '🐻', '🦁', '🐼', '🦉', '🐸', '🦋', '🐙',
  '🌻', '🌈', '⭐', '🔥', '🎨', '🎵', '🚀', '⚡',
  '🧩', '🎮', '🏔️', '🌊', '🦜', '🐢', '🌸', '💎',
];

const PROFICIENCY_LABELS = [
  { value: 'emerging', label: 'Just starting' },
  { value: 'developing', label: 'Getting better' },
  { value: 'proficient', label: 'Pretty good' },
  { value: 'advanced', label: 'Really strong' },
];

const T = {
  ink: '#1A1A2E', paper: '#FAF8F5', parchment: '#F0EDE6',
  graphite: '#6B7280', pencil: '#9CA3AF', chalk: '#FFFFFF',
  fieldGreen: '#2D6A4F', labBlue: '#1B4965', compassGold: '#B8860B',
  specimenRed: '#C0392B',
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function LearnerIntakeForm() {
  const { code } = useParams();
  const [step, setStep] = useState(0); // 0=welcome, 1=about, 2=interests, 3=skills, 4=confirm
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { success, pin, student_name }

  // Invite validation
  const [inviteData, setInviteData] = useState(null);

  // Form data
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gradeBand, setGradeBand] = useState('');
  const [email, setEmail] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [passions, setPassions] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [selfAssessment, setSelfAssessment] = useState({});

  // Skills catalog
  const [skillsCatalog, setSkillsCatalog] = useState([]);

  // Validate invite code on mount
  useEffect(() => {
    validateCode();
  }, [code]);

  // Load skills when grade band is selected
  useEffect(() => {
    if (gradeBand) loadSkills();
  }, [gradeBand]);

  async function validateCode() {
    setLoading(true);
    setError('');
    const { data } = await invites.validate(code);
    if (!data?.valid) {
      setError(data?.error || 'Invalid invite code');
    } else {
      setInviteData(data);
    }
    setLoading(false);
  }

  async function loadSkills() {
    const { data } = await skillsApi.listCatalog(gradeBand);
    if (data) setSkillsCatalog(data);
  }

  function toggleInterest(interest) {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  }

  function setSkillRating(skillId, proficiency) {
    setSelfAssessment(prev => ({ ...prev, [skillId]: proficiency }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');

    const { data } = await invites.submitIntake({
      code,
      name: name.trim(),
      age: age ? parseInt(age, 10) : null,
      gradeBand: gradeBand || null,
      email: email.trim() || null,
      interests: selectedInterests,
      passions: passions.split(',').map(s => s.trim()).filter(Boolean),
      aboutMe: aboutMe.trim(),
      avatarEmoji,
      selfAssessment,
    });

    if (!data?.success) {
      setError(data?.error || 'Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    setResult(data);
    setStep(5); // success screen
    setSubmitting(false);
  }

  // ── Loading / Error screens ────────────────────────────────────────────────

  if (loading) {
    return (
      <PageShell>
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <Loader2 size={28} color={T.fieldGreen} style={{ animation: 'lif-spin 1s linear infinite' }} />
          <p style={{ marginTop: 12, color: T.graphite, fontFamily: 'var(--font-body)', fontSize: 14 }}>
            Checking invite link...
          </p>
        </div>
      </PageShell>
    );
  }

  if (error && !inviteData) {
    return (
      <PageShell>
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <AlertCircle size={36} color={T.specimenRed} style={{ marginBottom: 12 }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: T.ink, marginBottom: 8 }}>
            Invite Not Found
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: T.graphite, maxWidth: 340, margin: '0 auto' }}>
            {error}
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: T.pencil, marginTop: 16 }}>
            Ask your guide for a new invite link.
          </p>
        </div>
      </PageShell>
    );
  }

  // ── Step content ───────────────────────────────────────────────────────────

  return (
    <PageShell>
      {/* Progress dots */}
      {step < 5 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              style={{
                width: step === i ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i <= step ? T.fieldGreen : T.parchment,
                transition: 'all 300ms ease',
              }}
            />
          ))}
        </div>
      )}

      {error && step < 5 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          background: `${T.specimenRed}10`, border: `1px solid ${T.specimenRed}30`,
          borderRadius: 8, marginBottom: 16, fontSize: 13, color: T.specimenRed,
          fontFamily: 'var(--font-body)',
        }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {step === 0 && (
        <WelcomeStep
          inviteData={inviteData}
          onNext={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <AboutStep
          name={name} setName={setName}
          age={age} setAge={setAge}
          gradeBand={gradeBand} setGradeBand={setGradeBand}
          email={email} setEmail={setEmail}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <InterestsStep
          selectedInterests={selectedInterests}
          toggleInterest={toggleInterest}
          passions={passions} setPassions={setPassions}
          avatarEmoji={avatarEmoji} setAvatarEmoji={setAvatarEmoji}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <SkillsStep
          skillsCatalog={skillsCatalog}
          selfAssessment={selfAssessment}
          setSkillRating={setSkillRating}
          gradeBand={gradeBand}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
        />
      )}

      {step === 4 && (
        <ConfirmStep
          name={name} age={age} gradeBand={gradeBand} email={email}
          selectedInterests={selectedInterests} passions={passions}
          avatarEmoji={avatarEmoji} aboutMe={aboutMe} setAboutMe={setAboutMe}
          selfAssessment={selfAssessment} skillsCatalog={skillsCatalog}
          submitting={submitting}
          onBack={() => setStep(3)}
          onSubmit={handleSubmit}
        />
      )}

      {step === 5 && result && (
        <SuccessStep result={result} />
      )}
    </PageShell>
  );
}

// ── Page Shell ───────────────────────────────────────────────────────────────

function PageShell({ children }) {
  return (
    <div style={{
      minHeight: '100vh', background: T.paper,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'flex-start', padding: '32px 20px 64px',
    }}>
      <style>{`
        @keyframes lif-fade { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes lif-spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .lif-input:focus { border-color: var(--field-green) !important; outline: none !important; box-shadow: 0 0 0 3px rgba(45,106,79,0.12) !important; }
      `}</style>

      {/* Logo */}
      <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <WayfinderLogoIcon size={28} color={T.fieldGreen} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: T.ink, marginTop: 4 }}>
          Wayfinder
        </div>
      </div>

      <div style={{
        width: '100%', maxWidth: 520,
        background: T.chalk, borderRadius: 16,
        border: `1px solid ${T.parchment}`,
        boxShadow: '0 4px 24px rgba(26,26,46,0.06)',
        padding: '32px 28px',
        animation: 'lif-fade 300ms ease',
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Step 0: Welcome ──────────────────────────────────────────────────────────

function WelcomeStep({ inviteData, onNext }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: T.ink, marginBottom: 8 }}>
        Welcome to Wayfinder
      </h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: T.graphite, marginBottom: 24, lineHeight: 1.6 }}>
        {inviteData.guide_name ? `${inviteData.guide_name} has invited you` : 'You\'ve been invited'} to join
        {inviteData.school_name ? ` ${inviteData.school_name}` : ''}.
        Let's set up your learner profile so we can create amazing quests just for you.
      </p>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: T.pencil, marginBottom: 28 }}>
        This takes about 3 minutes. A parent or guardian can help!
      </p>
      <button onClick={onNext} style={btnStyle}>
        Let's go <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ── Step 1: About You ────────────────────────────────────────────────────────

function AboutStep({ name, setName, age, setAge, gradeBand, setGradeBand, email, setEmail, onBack, onNext }) {
  const canProceed = name.trim().length > 0;

  return (
    <div>
      <h2 style={stepTitle}>About You</h2>
      <p style={stepSubtitle}>Tell us a bit about yourself.</p>

      <div style={fieldGroup}>
        <label style={labelStyle}>
          Your name <span style={{ color: T.specimenRed }}>*</span>
        </label>
        <input
          className="lif-input"
          type="text"
          placeholder="e.g. Alex Johnson"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Age</label>
          <input
            className="lif-input"
            type="number"
            min={4} max={18}
            placeholder="e.g. 11"
            value={age}
            onChange={e => setAge(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Grade Band</label>
          <select
            className="lif-input"
            value={gradeBand}
            onChange={e => setGradeBand(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="">Select...</option>
            {GRADE_BANDS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      <div style={fieldGroup}>
        <label style={labelStyle}>Email <span style={{ color: T.pencil, fontWeight: 400 }}>(optional)</span></label>
        <input
          className="lif-input"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
        />
        <p style={helperStyle}>Only used if your guide needs to reach you.</p>
      </div>

      <div style={navRow}>
        <button onClick={onBack} style={btnSecondary}>
          <ChevronLeft size={15} /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          style={{ ...btnStyle, opacity: canProceed ? 1 : 0.4 }}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Interests & Passions ─────────────────────────────────────────────

function InterestsStep({ selectedInterests, toggleInterest, passions, setPassions, avatarEmoji, setAvatarEmoji, onBack, onNext }) {
  return (
    <div>
      <h2 style={stepTitle}>Interests & Passions</h2>
      <p style={stepSubtitle}>Pick everything that excites you. There are no wrong answers!</p>

      {Object.entries(INTEREST_GROUPS).map(([group, items]) => (
        <div key={group} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.graphite, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            {group}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {items.map(item => {
              const selected = selectedInterests.includes(item);
              return (
                <button
                  key={item}
                  onClick={() => toggleInterest(item)}
                  style={{
                    padding: '6px 14px', borderRadius: 20,
                    border: `1.5px solid ${selected ? T.fieldGreen : T.pencil}`,
                    background: selected ? `${T.fieldGreen}12` : T.chalk,
                    color: selected ? T.fieldGreen : T.ink,
                    fontSize: 13, fontWeight: selected ? 600 : 400,
                    fontFamily: 'var(--font-body)',
                    cursor: 'pointer', transition: 'all 150ms',
                  }}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div style={fieldGroup}>
        <label style={labelStyle}>
          What are you passionate about?
          <span style={{ fontWeight: 400, color: T.pencil, marginLeft: 6 }}>(optional)</span>
        </label>
        <input
          className="lif-input"
          type="text"
          placeholder="e.g. Building tree forts, Taking care of my dog, Making stop-motion videos"
          value={passions}
          onChange={e => setPassions(e.target.value)}
          style={inputStyle}
        />
        <p style={helperStyle}>Separate with commas — these can be anything!</p>
      </div>

      {/* Avatar emoji picker */}
      <div style={fieldGroup}>
        <label style={labelStyle}>Pick your avatar</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {AVATAR_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => setAvatarEmoji(emoji)}
              style={{
                width: 40, height: 40, borderRadius: 10,
                border: `2px solid ${avatarEmoji === emoji ? T.fieldGreen : T.parchment}`,
                background: avatarEmoji === emoji ? `${T.fieldGreen}12` : T.chalk,
                fontSize: 20, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 150ms',
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div style={navRow}>
        <button onClick={onBack} style={btnSecondary}>
          <ChevronLeft size={15} /> Back
        </button>
        <button onClick={onNext} style={btnStyle}>
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Self-Assessment ──────────────────────────────────────────────────

function SkillsStep({ skillsCatalog, selfAssessment, setSkillRating, gradeBand, onBack, onNext }) {
  const categories = [
    { key: 'core', label: 'Core Skills', description: 'Academic foundations' },
    { key: 'soft', label: 'People Skills', description: 'How you work with others' },
    { key: 'interest', label: 'Interest Skills', description: 'Things you can get better at' },
  ];

  return (
    <div>
      <h2 style={stepTitle}>How do you feel about these skills?</h2>
      <p style={stepSubtitle}>
        Be honest — there's no right or wrong answer. This helps your guide understand where you are.
        {!gradeBand && ' (Select a grade band in step 2 for better results.)'}
      </p>

      {categories.map(cat => {
        const catSkills = skillsCatalog.filter(s => s.category === cat.key);
        if (catSkills.length === 0) return null;

        return (
          <div key={cat.key} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.graphite, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              {cat.label}
            </div>
            <p style={{ fontSize: 12, color: T.pencil, fontFamily: 'var(--font-body)', marginBottom: 12 }}>
              {cat.description}
            </p>

            {catSkills.map(skill => (
              <div key={skill.id} style={{ marginBottom: 12, padding: '10px 14px', background: T.paper, borderRadius: 10, border: `1px solid ${T.parchment}` }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: 'var(--font-body)', marginBottom: 8 }}>
                  {skill.name}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {PROFICIENCY_LABELS.map(p => {
                    const selected = selfAssessment[skill.id] === p.value;
                    return (
                      <button
                        key={p.value}
                        onClick={() => setSkillRating(skill.id, p.value)}
                        style={{
                          padding: '5px 12px', borderRadius: 8,
                          border: `1.5px solid ${selected ? T.fieldGreen : T.pencil}`,
                          background: selected ? `${T.fieldGreen}12` : T.chalk,
                          color: selected ? T.fieldGreen : T.graphite,
                          fontSize: 12, fontWeight: selected ? 600 : 400,
                          fontFamily: 'var(--font-body)',
                          cursor: 'pointer', transition: 'all 150ms',
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })}

      <div style={navRow}>
        <button onClick={onBack} style={btnSecondary}>
          <ChevronLeft size={15} /> Back
        </button>
        <button onClick={onNext} style={btnStyle}>
          Almost done <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Step 4: Confirmation ─────────────────────────────────────────────────────

function ConfirmStep({
  name, age, gradeBand, email, selectedInterests, passions,
  avatarEmoji, aboutMe, setAboutMe, selfAssessment, skillsCatalog,
  submitting, onBack, onSubmit,
}) {
  const ratedSkills = skillsCatalog.filter(s => selfAssessment[s.id]);

  return (
    <div>
      <h2 style={stepTitle}>Looking good!</h2>
      <p style={stepSubtitle}>Here's your profile. Add anything else you'd like your guide to know.</p>

      {/* Summary card */}
      <div style={{ background: T.paper, borderRadius: 12, padding: '16px 18px', marginBottom: 20, border: `1px solid ${T.parchment}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          {avatarEmoji && (
            <div style={{ fontSize: 28 }}>{avatarEmoji}</div>
          )}
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: T.ink }}>{name}</div>
            <div style={{ fontSize: 12, color: T.graphite, fontFamily: 'var(--font-body)' }}>
              {[age && `Age ${age}`, gradeBand, email].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>

        {selectedInterests.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.graphite, fontFamily: 'var(--font-mono)', marginBottom: 4, textTransform: 'uppercase' }}>Interests</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {selectedInterests.map(i => (
                <span key={i} style={{ padding: '3px 10px', borderRadius: 20, background: `${T.fieldGreen}10`, color: T.fieldGreen, fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}

        {passions && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.graphite, fontFamily: 'var(--font-mono)', marginBottom: 4, textTransform: 'uppercase' }}>Passions</div>
            <div style={{ fontSize: 13, color: T.ink, fontFamily: 'var(--font-body)' }}>{passions}</div>
          </div>
        )}

        {ratedSkills.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.graphite, fontFamily: 'var(--font-mono)', marginBottom: 4, textTransform: 'uppercase' }}>
              Skills ({ratedSkills.length} rated)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {ratedSkills.slice(0, 8).map(s => (
                <span key={s.id} style={{ padding: '3px 10px', borderRadius: 20, background: T.parchment, color: T.ink, fontSize: 12, fontFamily: 'var(--font-body)' }}>
                  {s.name}
                </span>
              ))}
              {ratedSkills.length > 8 && (
                <span style={{ padding: '3px 10px', fontSize: 12, color: T.graphite, fontFamily: 'var(--font-mono)' }}>
                  +{ratedSkills.length - 8} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* About me */}
      <div style={fieldGroup}>
        <label style={labelStyle}>
          Anything else you'd like your guide to know?
          <span style={{ fontWeight: 400, color: T.pencil, marginLeft: 6 }}>(optional)</span>
        </label>
        <textarea
          className="lif-input"
          placeholder="e.g. I learn best when I can move around. I'm shy at first but love group projects once I know people."
          value={aboutMe}
          onChange={e => setAboutMe(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      <div style={navRow}>
        <button onClick={onBack} style={btnSecondary}>
          <ChevronLeft size={15} /> Back
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          style={{ ...btnStyle, opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? (
            <><Loader2 size={15} style={{ animation: 'lif-spin 1s linear infinite' }} /> Submitting...</>
          ) : (
            <><Check size={15} /> Submit Profile</>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Step 5: Success ──────────────────────────────────────────────────────────

function SuccessStep({ result }) {
  const [copied, setCopied] = useState(false);

  function copyPin() {
    navigator.clipboard.writeText(result.pin).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: T.ink, marginBottom: 8 }}>
        You're all set, {result.student_name}!
      </h2>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: T.graphite, marginBottom: 24, lineHeight: 1.6 }}>
        Your guide will use your profile to create quests just for you.
        Use the code below to log in when your guide shares a quest.
      </p>

      <div style={{
        background: T.paper, borderRadius: 12, padding: '20px 24px',
        border: `2px solid ${T.fieldGreen}`, marginBottom: 24, display: 'inline-block',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.fieldGreen, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          Your Student Code
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700, color: T.ink, letterSpacing: '0.25em' }}>
          {result.pin}
        </div>
        <button
          onClick={copyPin}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10,
            padding: '6px 14px', borderRadius: 8,
            border: `1px solid ${copied ? T.fieldGreen : T.pencil}`,
            background: copied ? `${T.fieldGreen}10` : T.chalk,
            color: copied ? T.fieldGreen : T.graphite,
            fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)',
            cursor: 'pointer', transition: 'all 200ms',
          }}
        >
          {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy code</>}
        </button>
      </div>

      <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: T.pencil }}>
        Write this code down or take a screenshot. You'll need it to log in.
      </p>
    </div>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────────

const stepTitle = {
  fontFamily: 'var(--font-display)', fontSize: 22, color: T.ink, marginBottom: 6,
};

const stepSubtitle = {
  fontFamily: 'var(--font-body)', fontSize: 14, color: T.graphite, marginBottom: 24, lineHeight: 1.5,
};

const fieldGroup = { marginBottom: 20 };

const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 600, color: T.ink,
  fontFamily: 'var(--font-body)', marginBottom: 6,
};

const helperStyle = {
  fontSize: 11, color: T.pencil, fontFamily: 'var(--font-body)', marginTop: 4,
};

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '10px 14px',
  borderRadius: 8, border: `1.5px solid ${T.pencil}`,
  fontSize: 14, fontFamily: 'var(--font-body)', color: T.ink,
  background: T.chalk, outline: 'none', transition: 'border-color 150ms',
};

const navRow = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  marginTop: 28, paddingTop: 20, borderTop: `1px solid ${T.parchment}`,
};

const btnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '10px 22px', borderRadius: 8,
  background: T.fieldGreen, color: T.chalk,
  fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
  border: 'none', cursor: 'pointer', transition: 'opacity 150ms',
};

const btnSecondary = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '10px 16px', borderRadius: 8,
  background: 'transparent', color: T.graphite,
  fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)',
  border: `1px solid ${T.pencil}`, cursor: 'pointer', transition: 'all 150ms',
};
