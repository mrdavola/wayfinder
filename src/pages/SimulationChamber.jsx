import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Trophy,
  X,
  Loader2,
  AlertCircle,
  Send,
  Volume2,
  VolumeX,
} from 'lucide-react';
import useSpeech from '../hooks/useSpeech';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ai } from '../lib/api';
import { getStudentSession } from '../lib/studentSession';

// ===================== SYSTEM PROMPT BUILDER =====================

const buildSystemPrompt = (simulation, quest, fieldNotes) => `
You are a voice agent in Wayfinder's career simulation.
Role: ${simulation?.voice_agent_personality || 'An experienced professional'}
Quest: ${quest?.title || 'Career exploration'}
Scenario: ${simulation?.context || ''}
${fieldNotes?.length ? `\nThe student's notes from their project work:\n${fieldNotes.map(n => `- ${n}`).join('\n')}` : ''}

Behavior:
- All content must be age-appropriate for school-age children. Never reference violence, sexual content, drugs, or any inappropriate topics.
- Speak at a student's comprehension level but NEVER condescend
- Treat the student as a junior colleague
- Keep responses to 2-4 sentences maximum
- Use specific data from the scenario
- Reference the student's own notes and prior work when relevant to make the conversation feel connected to their learning journey
- Never say "wrong" — ask them to explain their reasoning, then introduce new information
- After 4-5 exchanges, guide toward a conclusion
- End by thanking them with specific genuine praise
`;

// ===================== CSS INJECTION =====================

const injectStyles = () => {
  if (document.getElementById('sim-chamber-styles')) return;
  const el = document.createElement('style');
  el.id = 'sim-chamber-styles';
  el.textContent = `
    @keyframes breathe {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }
    @keyframes pulse-red {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    @keyframes pulse-green {
      0%, 100% { box-shadow: 0 0 16px rgba(45,106,79,0.2); border-color: var(--field-green); }
      50% { box-shadow: 0 0 32px rgba(45,106,79,0.4); border-color: var(--field-green); }
    }
    @keyframes bar1 {
      0%, 100% { height: 20%; }
      50% { height: 70%; }
    }
    @keyframes bar2 {
      0%, 100% { height: 50%; }
      50% { height: 20%; }
    }
    @keyframes bar3 {
      0%, 100% { height: 30%; }
      50% { height: 90%; }
    }
    @keyframes bar4 {
      0%, 100% { height: 70%; }
      50% { height: 35%; }
    }
    @keyframes bar5 {
      0%, 100% { height: 40%; }
      50% { height: 80%; }
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    @keyframes fadeSlideUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .agent-idle { animation: breathe 3s ease-in-out infinite; }
    .agent-listening { animation: pulse-green 1.5s ease-in-out infinite; }
    .timer-urgent { animation: pulse-red 1.2s ease-in-out infinite; }
    .decision-card-enter {
      animation: fadeSlideUp 300ms ease forwards;
      opacity: 0;
    }
    .debrief-fade-in { animation: fadeIn 500ms ease forwards; }
    .sim-input:focus {
      border-color: var(--lab-blue) !important;
      box-shadow: 0 0 0 3px rgba(27,73,101,0.12) !important;
      outline: none !important;
    }
    .send-btn:hover:not(:disabled) { background: rgba(27,73,101,0.08) !important; }
    .exit-btn:hover { color: var(--ink) !important; background: var(--parchment) !important; }
    .decision-card-el:hover { border-color: var(--lab-blue) !important; }
    .decision-card-selected {
      background: var(--chalk) !important;
      border-color: var(--lab-blue) !important;
      box-shadow: 0 0 0 2px rgba(27,73,101,0.2) !important;
    }
    .skill-tag-debrief {
      display: inline-block;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      border: 1px solid rgba(27,73,101,0.35);
      border-radius: 100px;
      padding: 3px 12px;
      color: var(--lab-blue);
      opacity: 0;
      animation: fadeSlideUp 300ms ease forwards;
    }
    .spin-anim { animation: spin 1s linear infinite; }
  `;
  document.head.appendChild(el);
};

// ===================== TIMER =====================

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ===================== TYPEWRITER HOOK =====================

function useTypewriter(text, speed = 30) {
  // Store index and current text in a single state object so resets
  // happen in one atomic update without synchronous setState in effect body.
  const [state, setState] = useState({ displayed: '', done: !text, textKey: text });
  const timerRef = useRef(null);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (!text) {
      setState({ displayed: '', done: true, textKey: text }); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    // Start fresh — reset in the timer's first tick to avoid sync setState
    let index = 0;
    timerRef.current = setInterval(() => {
      index += 1;
      const slice = text.slice(0, index);
      const finished = index >= text.length;
      setState({ displayed: slice, done: finished, textKey: text });
      if (finished) clearInterval(timerRef.current);
    }, speed);
    return () => clearInterval(timerRef.current);
  }, [text, speed]);

  return { displayed: state.textKey === text ? state.displayed : '', done: state.textKey === text ? state.done : false };
}

// ===================== SOUND BARS =====================

function SoundBars() {
  const barStyle = (animName, delay) => ({
    width: '6px',
    borderRadius: '3px',
    background: 'var(--lab-blue)',
    animationName: animName,
    animationDuration: '0.8s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    animationDelay: delay,
    alignSelf: 'center',
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '60px' }}>
      <div style={barStyle('bar1', '0ms')} />
      <div style={barStyle('bar2', '100ms')} />
      <div style={barStyle('bar3', '200ms')} />
      <div style={barStyle('bar4', '80ms')} />
      <div style={barStyle('bar5', '160ms')} />
    </div>
  );
}

// ===================== AGENT CIRCLE =====================

function AgentCircle({ agentState }) {
  const circleClass =
    agentState === 'idle'      ? 'agent-idle' :
    agentState === 'listening' ? 'agent-listening' : '';

  const listeningStyle = agentState === 'listening'
    ? { borderColor: 'var(--field-green)' }
    : {};

  return (
    <div
      className={circleClass}
      style={{
        width: 160,
        height: 160,
        borderRadius: '50%',
        background: 'var(--parchment)',
        border: '2px solid var(--lab-blue)',
        boxShadow: '0 0 20px rgba(27,73,101,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
        overflow: 'hidden',
        ...listeningStyle,
      }}
    >
      {agentState === 'speaking' ? (
        <SoundBars />
      ) : (
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(27,73,101,0.12)',
          border: '1px solid rgba(27,73,101,0.25)',
        }} />
      )}
    </div>
  );
}

// ===================== DECISION CARDS =====================

function DecisionCards({ options, onSelect, selectedIndex }) {
  return (
    <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 720, flexWrap: 'wrap' }}>
      {options.map((opt, i) => (
        <div
          key={i}
          className={`decision-card-el decision-card-enter ${selectedIndex === i ? 'decision-card-selected' : ''}`}
          style={{
            flex: '1 1 180px',
            background: 'var(--parchment)',
            border: '1px solid var(--pencil)',
            borderRadius: 8,
            padding: '14px 16px',
            cursor: 'pointer',
            transition: 'border-color 150ms, background 150ms, box-shadow 150ms',
            textAlign: 'left',
            animationDelay: `${i * 100}ms`,
            animationFillMode: 'both',
          }}
          onClick={() => onSelect(opt, i)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(opt, i); }}
        >
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
            {opt.title}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--graphite)', lineHeight: 1.5 }}>
            {opt.description}
          </div>
        </div>
      ))}
    </div>
  );
}

// ===================== YOUR NOTES SIDEBAR =====================

function NotesSidebar({ fieldNotes, submissions, keyDecisions }) {
  const hasNotes = fieldNotes?.length > 0;
  const hasSubmissions = submissions?.length > 0;
  const hasDecisions = keyDecisions?.length > 0;

  return (
    <aside style={{
      width: 260,
      minWidth: 260,
      borderLeft: '1px solid var(--pencil)',
      background: 'var(--chalk)',
      padding: '20px 16px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 0 }}>
        Your Notes
      </div>

      {!hasNotes && !hasSubmissions && (
        <p style={{ fontSize: 11, color: 'var(--pencil)', lineHeight: 1.6, margin: 0 }}>
          Your field notes and work from earlier stages will appear here during the simulation.
        </p>
      )}

      {/* Field notes from the quest */}
      {hasNotes && (
        <div>
          {fieldNotes.map((note, i) => (
            <div key={i} style={{
              padding: '8px 10px', marginBottom: 6,
              background: 'var(--parchment)', borderRadius: 6,
              borderLeft: '2px solid var(--compass-gold)',
            }}>
              {note.stageTitle && (
                <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--compass-gold)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
                  {note.stageTitle}
                </div>
              )}
              <p style={{ fontSize: 11, color: 'var(--ink)', lineHeight: 1.5, margin: 0 }}>
                {note.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Submissions summary */}
      {hasSubmissions && (
        <div style={{ borderTop: hasNotes ? '1px solid var(--pencil)' : 'none', paddingTop: hasNotes ? 12 : 0 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Your Work
          </div>
          {submissions.map((sub, i) => (
            <div key={i} style={{
              padding: '6px 10px', marginBottom: 6,
              background: 'rgba(27,73,101,0.04)', borderRadius: 6,
              borderLeft: '2px solid var(--lab-blue)',
            }}>
              <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--lab-blue)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
                Stage {sub.stageNumber}: {sub.stageTitle}
              </div>
              <p style={{ fontSize: 11, color: 'var(--ink)', lineHeight: 1.5, margin: 0 }}>
                {sub.content?.length > 150 ? sub.content.slice(0, 150) + '…' : sub.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Key decisions */}
      {hasDecisions && (
        <div style={{ borderTop: '1px solid var(--pencil)', paddingTop: 12 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Key Decisions
          </div>
          {keyDecisions.map((d, i) => (
            <div key={i} style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--graphite)', lineHeight: 1.5, marginBottom: 8, paddingLeft: 8, borderLeft: '2px solid rgba(184,134,11,0.35)' }}>
              {d}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

// ===================== DEBRIEF SCREEN =====================

function DebriefScreen({ simulation, messages, onReturnToQuest }) {
  const [reflectionValue, setReflectionValue] = useState('');
  const [summaryText, setSummaryText] = useState('');
  const [savingDebrief, setSavingDebrief] = useState(false);

  const skills = simulation?.skills_assessed?.length > 0
    ? simulation.skills_assessed
    : ['Data Interpretation', 'Persuasive Reasoning', 'Scientific Thinking'];

  // Generate & save debrief on mount
  useEffect(() => {
    const saveDebrief = async () => {
      if (!simulation?.id) return;
      setSavingDebrief(true);
      try {
        const summary = await ai.debriefSummary({
          transcript: messages,
          skillsAssessed: simulation.skills_assessed || [],
          scenarioContext: simulation.context || '',
        });
        setSummaryText(summary);

        await supabase.from('career_simulations').update({
          status: 'completed',
          debrief_summary: summary,
        }).eq('id', simulation.id);

      } catch {
        setSummaryText('You completed the simulation and demonstrated strong reasoning throughout the conversation.');
      }
      setSavingDebrief(false);
    };
    saveDebrief();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const keyDecisions = simulation?.key_decisions || [
    'You evaluated multiple data points to find the best overall fit.',
    'You adapted your recommendation when new information changed the picture.',
    'You prioritized evidence over assumption.',
  ];

  return (
    <div
      className="debrief-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--paper)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        overflowY: 'auto',
        padding: '48px 24px',
        gap: 32,
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Hero */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
        <Trophy size={48} color="var(--compass-gold)" strokeWidth={1.5} />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', color: 'var(--ink)', marginTop: 8, marginBottom: 0 }}>
          Simulation Complete
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--graphite)', maxWidth: 440, lineHeight: 1.65 }}>
          {simulation?.scenario_title || 'Career Simulation'} — You made it through. Here's what you accomplished.
        </p>
      </div>

      {/* Summary card */}
      <div style={{
        width: '100%', maxWidth: 600,
        background: 'var(--chalk)',
        border: '1px solid var(--pencil)',
        borderRadius: 12,
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>
        {/* AI summary */}
        {(savingDebrief || summaryText) && (
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Summary
            </div>
            {savingDebrief ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--graphite)', fontSize: 'var(--text-sm)' }}>
                <Loader2 size={14} className="spin-anim" />
                Generating your debrief...
              </div>
            ) : (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--ink)', lineHeight: 1.7, margin: 0, borderLeft: '3px solid var(--compass-gold)', paddingLeft: 14 }}>
                {summaryText}
              </p>
            )}
          </div>
        )}

        {/* Decisions */}
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Decisions Made
          </div>
          {keyDecisions.map((decision, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--compass-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--chalk)', fontWeight: 700 }}>{i + 1}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--ink)', lineHeight: 1.5 }}>
                {decision}
              </div>
            </div>
          ))}
        </div>

        {/* Skills */}
        <div style={{ borderTop: '1px solid var(--pencil)', paddingTop: 16 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Skills Practiced
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {skills.map((skill, i) => (
              <span
                key={skill}
                className="skill-tag-debrief"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Real-world connection */}
        <div style={{ borderTop: '1px solid var(--pencil)', paddingTop: 16 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--graphite)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Real-World Connection
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--ink)', lineHeight: 1.7, borderLeft: '3px solid var(--lab-blue)', padding: '10px 10px 10px 14px', background: 'rgba(27,73,101,0.04)', borderRadius: '0 4px 4px 0', margin: 0 }}>
            {simulation?.real_world_connection || `In this simulation, you reasoned through real professional decisions. Every day, people in careers like this one face the exact same tradeoffs you worked through.`}
          </p>
        </div>
      </div>

      {/* Reflection */}
      <div style={{ width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--ink)' }}>
          What was the hardest decision? Why?
        </label>
        <textarea
          value={reflectionValue}
          onChange={(e) => setReflectionValue(e.target.value)}
          placeholder="Share your thinking..."
          rows={4}
          style={{
            background: 'var(--chalk)',
            border: '1px solid var(--pencil)',
            borderRadius: 6,
            padding: '12px 16px',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--ink)',
            width: '100%',
            resize: 'vertical',
            outline: 'none',
            lineHeight: 1.6,
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={onReturnToQuest}
          style={{
            alignSelf: 'flex-start',
            padding: '10px 20px',
            borderRadius: 6,
            border: 'none',
            background: 'var(--ink)',
            color: 'var(--chalk)',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Return to Project Map
        </button>
      </div>
    </div>
  );
}

// ===================== MAIN COMPONENT =====================

export default function SimulationChamber() {
  const { id } = useParams();
  const navigate = useNavigate();
  useAuth(); // Auth context available; user accessible if needed for future writes

  // Inject CSS once
  useEffect(() => { injectStyles(); }, []);

  // ---- State ----
  const [simulation, setSimulation] = useState(null);
  const [quest, setQuest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [agentState, setAgentState] = useState('idle'); // idle | listening (speaking derived from typewriter)
  const [contextCollapsed, setContextCollapsed] = useState(false);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 min
  const [currentAgentText, setCurrentAgentText] = useState('');
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [fieldNotes, setFieldNotes] = useState([]);
  const [studentSubmissions, setStudentSubmissions] = useState([]);

  // Refs
  const timerRef = useRef(null);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  // Typewriter
  const { displayed: displayedText, done: typewriterDone } = useTypewriter(currentAgentText, 30);

  // TTS
  const { speak, stop: stopSpeech, speaking, supported: ttsSupported } = useSpeech();
  const prevDoneRef = useRef(false);
  useEffect(() => {
    if (typewriterDone && !prevDoneRef.current && currentAgentText) {
      speak(currentAgentText);
    }
    prevDoneRef.current = typewriterDone;
  }, [typewriterDone, currentAgentText, speak]);

  // ---- Fetch simulation ----
  useEffect(() => {
    const fetchSim = async () => {
      setLoading(true);
      setLoadError(null);

      const { data: simData, error } = await supabase
        .from('career_simulations')
        .select('*, simulation_messages(*), quests(*)')
        .eq('id', id)
        .single();

      // Helper to load field notes + submissions for a quest
      const loadStudentWork = async (questId) => {
        if (!questId) return;
        // Get stages for this quest
        const { data: stages } = await supabase.from('quest_stages').select('id, stage_number, title').eq('quest_id', questId).order('stage_number');
        const stageMap = {};
        (stages || []).forEach(s => { stageMap[s.id] = s; });

        // Load reflections (field notes)
        const { data: reflections } = await supabase.from('quest_reflections').select('*').eq('quest_id', questId).eq('entry_type', 'student').order('created_at');
        setFieldNotes((reflections || []).map(r => ({
          content: r.content,
          stageTitle: stageMap[r.stage_id]?.title || `Stage ${stageMap[r.stage_id]?.stage_number || ''}`,
        })));

        // Load submissions (text only for sidebar readability)
        const { data: subs } = await supabase.from('stage_submissions').select('*').eq('quest_id', questId).eq('submission_type', 'text').order('created_at');
        setStudentSubmissions((subs || []).map(s => ({
          content: s.content,
          stageNumber: stageMap[s.stage_id]?.stage_number || '?',
          stageTitle: stageMap[s.stage_id]?.title || 'Stage',
        })));
      };

      if (simData) {
        setSimulation(simData);
        setQuest(simData.quests);
        loadStudentWork(simData.quest_id);

        const msgs = [...(simData.simulation_messages || [])].sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at)
        );
        setMessages(msgs);

        // If there are existing messages, show the last agent message
        const lastAgent = [...msgs].reverse().find((m) => m.role === 'agent');
        if (lastAgent) {
          setCurrentAgentText(lastAgent.content);
          setExchangeCount(msgs.filter((m) => m.role === 'student').length);
        } else {
          // Opening line from simulation
          const opener = simData.opening_line || `Hello. I'm ${simData.voice_agent_personality || 'your simulation guide'}. Let's begin — tell me what you know about the scenario so far.`;
          setCurrentAgentText(opener);
        }

        // If sim is already completed, show debrief
        if (simData.status === 'completed') {
          setSimulationComplete(true);
        }

        setLoading(false);
      } else {
        // Could be a quest id — try to load simulation via quest_id
        const { data: simByQuest } = await supabase
          .from('career_simulations')
          .select('*, simulation_messages(*), quests(*)')
          .eq('quest_id', id)
          .single();

        if (simByQuest) {
          setSimulation(simByQuest);
          setQuest(simByQuest.quests);
          loadStudentWork(simByQuest.quest_id);
          const msgs = [...(simByQuest.simulation_messages || [])].sort(
            (a, b) => new Date(a.created_at) - new Date(b.created_at)
          );
          setMessages(msgs);
          const lastAgent = [...msgs].reverse().find((m) => m.role === 'agent');
          if (lastAgent) {
            setCurrentAgentText(lastAgent.content);
            setExchangeCount(msgs.filter((m) => m.role === 'student').length);
          } else {
            const opener = simByQuest.opening_line || `Hello. I'm ready for your presentation. What is your recommendation?`;
            setCurrentAgentText(opener);
          }
          if (simByQuest.status === 'completed') setSimulationComplete(true);
          setLoading(false);
        } else {
          setLoadError(error?.message || 'Simulation not found.');
          setLoading(false);
        }
      }
    };

    if (id) fetchSim();
  }, [id]);

  // ---- Agent state from typewriter ----
  // Derive agent speaking/idle directly from typewriter state (avoids extra effect)
  const agentStateDerived = currentAgentText && !typewriterDone ? 'speaking' : agentState;
  const isTypingDerived = currentAgentText && !typewriterDone;

  // ---- Timer ----
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setSimulationComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // ---- Decision cards — derived from messages + typewriterDone ----
  const lastMsg = messages[messages.length - 1];
  const shouldShowDecisionCards = typewriterDone && lastMsg?.role === 'agent' && lastMsg?.is_decision_point;

  // ---- Auto-complete after enough exchanges ----
  useEffect(() => {
    if (exchangeCount >= 5 && typewriterDone && !simulationComplete) {
      const timer = setTimeout(() => setSimulationComplete(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [exchangeCount, typewriterDone, simulationComplete]);

  // ---- Scroll to bottom ----
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, displayedText]);

  // ---- Send message ----
  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || inputValue).trim();
    if (!trimmed || isTypingDerived || !simulation) return;

    setInputValue('');
    setSelectedDecision(null);
    setAgentState('listening');

    const userMsg = {
      id: crypto.randomUUID(),
      role: 'student',
      content: trimmed,
      created_at: new Date().toISOString(),
      is_decision_point: false,
    };
    setMessages((prev) => [...prev, userMsg]);
    setContextCollapsed(true);

    // Save student message to DB
    await supabase.from('simulation_messages').insert({
      simulation_id: simulation.id,
      role: 'student',
      content: trimmed,
      is_decision_point: false,
    });

    setExchangeCount((c) => c + 1);

    // Small thinking delay
    await new Promise((res) => setTimeout(res, 700));

    // Build conversation history for AI
    const conversationHistory = [...messages, userMsg].map((m) => ({
      role: m.role === 'agent' ? 'assistant' : 'user',
      content: m.content,
    }));

    let agentReply = '';
    try {
      agentReply = await ai.simulationChat({
        systemPrompt: buildSystemPrompt(simulation, quest, fieldNotes.map(n => n.content)),
        messages: conversationHistory,
      });
    } catch {
      const fallbacks = [
        "Interesting choice. Walk me through your data — what makes this stand out to you?",
        "I see your reasoning. But what happens if conditions change? Does your answer hold?",
        "Good point. Now here's something new: this changes one of our constraints. Does that affect your recommendation?",
        "You're getting closer. What's the single most important factor here, and why?",
        "Excellent reasoning. You've adapted to new information without abandoning your thinking. Well done.",
      ];
      agentReply = fallbacks[Math.min(exchangeCount, fallbacks.length - 1)];
    }

    // Detect decision point
    const isDecisionPoint = agentReply.includes('?') && exchangeCount < 3;

    const agentMsg = {
      id: crypto.randomUUID(),
      role: 'agent',
      content: agentReply,
      created_at: new Date().toISOString(),
      is_decision_point: isDecisionPoint,
    };

    setMessages((prev) => [...prev, agentMsg]);
    setCurrentAgentText(agentReply);

    // Save agent message to DB
    await supabase.from('simulation_messages').insert({
      simulation_id: simulation.id,
      role: 'agent',
      content: agentReply,
      is_decision_point: isDecisionPoint,
    });
  }, [inputValue, isTypingDerived, messages, simulation, quest, exchangeCount, fieldNotes]);

  // ---- Decision card click ----
  const handleDecisionSelect = useCallback((option, index) => {
    setSelectedDecision(index);
    const text = `${option.title}: ${option.description}`;
    setInputValue(text);
    setTimeout(() => sendMessage(text), 100);
  }, [sendMessage]);

  // ---- Decision card options ----
  const decisionCardOptions = (() => {
    if (!simulation?.key_decisions?.length) return [];
    const idx = Math.min(exchangeCount, simulation.key_decisions.length - 1);
    // Build choices from key_decisions if available, otherwise use defaults
    return [
      { title: 'Option A', description: simulation.key_decisions[idx] || '' },
      { title: 'Option B', description: 'Take a different approach based on the available data.' },
      { title: 'Ask for more info', description: 'Request additional data before making a recommendation.' },
    ].filter((o) => o.description);
  })();

  // ---- Back navigation ----
  const handleExit = useCallback(() => {
    const isStudent = !!getStudentSession()?.studentId;
    if (quest?.id) navigate(isStudent ? `/q/${quest.id}` : `/quest/${quest.id}`);
    else navigate(isStudent ? '/student' : '/dashboard');
  }, [navigate, quest]);

  // ---- Loading ----
  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--paper)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'var(--font-body)' }}>
        <Loader2 size={32} color="var(--lab-blue)" className="spin-anim" />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--graphite)' }}>Loading simulation...</span>
      </div>
    );
  }

  // ---- Error ----
  if (loadError) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'var(--paper)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32, fontFamily: 'var(--font-body)' }}>
        <AlertCircle size={40} color="var(--specimen-red)" strokeWidth={1.5} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', color: 'var(--ink)' }}>Simulation Not Found</h2>
        <p style={{ color: 'var(--graphite)', fontSize: 'var(--text-sm)' }}>{loadError}</p>
        <button onClick={() => navigate('/dashboard')} style={{ padding: '10px 20px', borderRadius: 6, border: 'none', background: 'var(--ink)', color: 'var(--chalk)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)' }}>
          Go to Dashboard
        </button>
      </div>
    );
  }

  // ---- Debrief ----
  if (simulationComplete) {
    return (
      <DebriefScreen
        simulation={simulation}
        messages={messages}
        onReturnToQuest={handleExit}
      />
    );
  }

  // ---- Timer state ----
  const timerIsUrgent = timeLeft < 300;

  // ---- Render ----
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--paper)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'var(--font-body)',
    }}>
      {/* TOP BAR */}
      <header style={{
        height: 48,
        minHeight: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: 'var(--chalk)',
        borderBottom: '1px solid var(--pencil)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        {/* Brand */}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
          color: 'var(--graphite)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          Wayfinder
        </span>

        {/* Timer */}
        <span
          className={timerIsUrgent ? 'timer-urgent' : ''}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.5rem',
            color: timerIsUrgent ? 'var(--specimen-red)' : 'var(--ink)',
            letterSpacing: '0.02em',
            lineHeight: 1,
          }}
          aria-label={`Time remaining: ${formatTime(timeLeft)}`}
        >
          {formatTime(timeLeft)}
        </span>

        {/* TTS mute toggle + Exit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {ttsSupported && (
            <button
              onClick={speaking ? stopSpeech : () => speak(currentAgentText)}
              title={speaking ? 'Stop reading' : 'Read aloud'}
              style={{
                background: 'transparent', border: 'none',
                color: speaking ? 'var(--lab-blue)' : 'var(--graphite)',
                cursor: 'pointer', padding: '6px 8px', borderRadius: 6,
                display: 'flex', alignItems: 'center',
                transition: 'color 150ms',
              }}
            >
              {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          )}
          <button
            className="exit-btn"
            onClick={handleExit}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--graphite)',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'color 150ms, background 150ms',
            }}
          >
            <X size={14} />
            Exit Simulation
          </button>
        </div>
      </header>

      {/* MAIN AREA */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* CENTER COLUMN */}
        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflowY: 'auto',
          padding: '20px 24px 24px',
          gap: 20,
        }}>

          {/* SCENARIO CONTEXT PANEL */}
          <div style={{
            width: '100%',
            maxWidth: 720,
            background: 'var(--parchment)',
            border: '1px solid var(--pencil)',
            borderRadius: 8,
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => setContextCollapsed((v) => !v)}
              role="button"
              tabIndex={0}
              aria-expanded={!contextCollapsed}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setContextCollapsed((v) => !v); }}
            >
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--compass-gold)',
                letterSpacing: '0.03em',
              }}>
                You are: {simulation?.role || 'A Junior Analyst'}
              </span>
              <button
                style={{ background: 'transparent', border: 'none', color: 'var(--graphite)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2, borderRadius: 4 }}
                aria-label={contextCollapsed ? 'Expand context' : 'Collapse context'}
                tabIndex={-1}
              >
                {contextCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
            </div>

            {!contextCollapsed && (
              <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--ink)', lineHeight: 1.65, margin: 0 }}>
                  {simulation?.context || 'You are presenting your findings. The panel expects a well-reasoned recommendation backed by data.'}
                </p>
                <div style={{ borderLeft: '3px solid var(--compass-gold)', background: 'rgba(240,237,230,0.7)', padding: '10px 14px', borderRadius: '0 4px 4px 0' }}>
                  <strong style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--ink)' }}>Your goal:</strong>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--ink)' }}>
                    {' '}{simulation?.objective || 'Make a well-reasoned recommendation and defend it under scrutiny.'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* VOICE AGENT */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%', maxWidth: 720 }}>
            <AgentCircle agentState={agentStateDerived} />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%', maxWidth: 520, textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '18px', color: 'var(--ink)', lineHeight: 1.65, minHeight: 60, margin: 0 }}>
                {displayedText}
                {isTypingDerived && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 2,
                      height: 18,
                      background: 'var(--ink)',
                      marginLeft: 2,
                      verticalAlign: 'middle',
                      animation: 'blink 0.8s step-end infinite',
                    }}
                    aria-hidden="true"
                  />
                )}
              </p>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--graphite)' }}>
                {simulation?.voice_agent_personality
                  ? simulation.voice_agent_personality.split(',')[0]
                  : 'Simulation Guide'}
              </span>
            </div>
          </div>

          {/* INPUT AREA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 720 }}>
            <input
              ref={inputRef}
              className="sim-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your response..."
              disabled={isTypingDerived}
              aria-label="Your response"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              style={{
                flex: 1,
                background: 'var(--chalk)',
                border: '1px solid var(--pencil)',
                borderRadius: 6,
                padding: '12px 16px',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-base)',
                color: 'var(--ink)',
                outline: 'none',
                transition: 'border-color 150ms, box-shadow 150ms',
                lineHeight: 1.5,
              }}
            />
            <button
              className="send-btn"
              onClick={() => sendMessage()}
              disabled={isTypingDerived || !inputValue.trim()}
              aria-label="Send message"
              style={{
                width: 44,
                height: 44,
                borderRadius: 6,
                background: 'transparent',
                border: '1px solid var(--lab-blue)',
                color: 'var(--lab-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isTypingDerived || !inputValue.trim() ? 'not-allowed' : 'pointer',
                transition: 'background 150ms',
                flexShrink: 0,
                opacity: isTypingDerived || !inputValue.trim() ? 0.5 : 1,
              }}
            >
              <Send size={18} />
            </button>
          </div>

          {/* DECISION CARDS */}
          {shouldShowDecisionCards && decisionCardOptions.length > 0 && (
            <DecisionCards
              options={decisionCardOptions}
              onSelect={handleDecisionSelect}
              selectedIndex={selectedDecision}
            />
          )}

          <div ref={bottomRef} />
        </main>

        {/* NOTES SIDEBAR — desktop only */}
        <NotesSidebar fieldNotes={fieldNotes} submissions={studentSubmissions} keyDecisions={simulation?.key_decisions || []} />
      </div>
    </div>
  );
}
