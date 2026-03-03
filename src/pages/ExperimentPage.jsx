import { useState, useRef, useEffect } from 'react';
import { Users, Brain, MessageCircle, ArrowRight, ArrowLeft, Check, Zap, BookOpen, Star, Divide, Triangle, BarChart2, Scale, DollarSign, Timer, Shuffle, Repeat, Plus, Map, Square, ArrowLeftRight } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const MATH_CONCEPTS = [
  { id: 'fractions',    Icon: Divide,         title: 'Fractions',           desc: 'Dividing things into equal parts' },
  { id: 'geometry',    Icon: Triangle,        title: 'Geometry',             desc: 'Shapes, angles, and space' },
  { id: 'data-graphs', Icon: BarChart2,       title: 'Data & Graphs',        desc: 'Reading and making charts' },
  { id: 'ratios',      Icon: Scale,           title: 'Ratios',               desc: 'Comparing amounts' },
  { id: 'money',       Icon: DollarSign,      title: 'Money & Decimals',     desc: 'Working with dollars and cents' },
  { id: 'measurement', Icon: Timer,           title: 'Measurement',          desc: 'Time, distance, weight' },
  { id: 'probability', Icon: Shuffle,         title: 'Probability',          desc: 'Chances and likelihood' },
  { id: 'patterns',    Icon: Repeat,          title: 'Patterns & Sequences', desc: 'Finding the rule' },
  { id: 'operations',  Icon: Plus,            title: 'Operations',           desc: 'Adding, subtracting, multiplying, dividing' },
  { id: 'coordinates', Icon: Map,             title: 'Coordinates',          desc: 'Plotting points on a grid' },
  { id: 'perimeter',   Icon: Square,          title: 'Perimeter & Area',     desc: 'Measuring around and inside shapes' },
  { id: 'proportions', Icon: ArrowLeftRight,  title: 'Proportions',          desc: 'Scaling things up and down' },
];

const LOADING_MESSAGES = [
  'Analyzing your team\'s interests...',
  'Weaving in the math concepts...',
  'Assigning roles based on strengths...',
  'Crafting your shared mission...',
  'Almost ready...',
];

// ─── AI helpers ───────────────────────────────────────────────────────────────

// Shared helper: calls Gemini (default) or Anthropic based on localStorage preference
async function callExperimentAI({ systemPrompt, userMessage, messages }) {
  const aiSettings = JSON.parse(localStorage.getItem('wayfinder_ai_settings') || '{}');
  const provider = aiSettings.provider || 'gemini';

  if (provider === 'gemini') {
    const apiKey = aiSettings.geminiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
    });

    if (messages && messages.length > 0) {
      const converted = messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      const firstUserIdx = converted.findIndex(m => m.role === 'user');
      const history = firstUserIdx > 0 ? converted.slice(firstUserIdx) : converted;
      const lastMsg = messages[messages.length - 1];
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(lastMsg.content);
      return result.response.text();
    } else {
      const result = await model.generateContent(userMessage);
      return result.response.text();
    }
  } else {
    const apiKey = aiSettings.anthropicKey || import.meta.env.VITE_ANTHROPIC_API_KEY || '';
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    const msgs = messages || [{ role: 'user', content: userMessage }];
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: messages ? 200 : 2000,
      system: systemPrompt,
      messages: msgs,
    });
    return response.content[0].text;
  }
}

async function generateGroupQuest(learners, concepts) {
  const learnerDescriptions = learners
    .map((l, i) => `Learner ${i + 1}: ${l.name}, age ${l.age}, loves: ${l.interests}`)
    .join('\n');

  const systemPrompt = `You are designing a group math quest for a team of young learners.
Create a JSON response ONLY. No other text.

The quest must:
- Be a real-world scenario the whole group investigates together
- Incorporate all 3 math concepts naturally (not as worksheets)
- Give each learner a distinct role based on their interests
- Be completable in 45-60 minutes with one device
- Sound exciting, not like school work

Respond with this exact JSON structure:
{
  "quest_title": "exciting title",
  "mission": "2-3 sentence mission statement in second person plural (you all...)",
  "scenario": "3-4 sentences describing the real-world situation",
  "roles": [
    {
      "learner_name": "name from input",
      "role_title": "exciting job title",
      "role_description": "2 sentences about what this person does",
      "math_focus": "which of the 3 concepts they focus on"
    }
  ],
  "shared_challenge": "The central problem the group solves together (2 sentences)",
  "discussion_prompts": [
    "Discussion prompt 1?",
    "Discussion prompt 2?",
    "Discussion prompt 3?",
    "Discussion prompt 4?"
  ],
  "success_looks_like": "What it looks like when the group succeeds"
}`;

  const text = await callExperimentAI({
    systemPrompt,
    userMessage: `Team:\n${learnerDescriptions}\n\nMath concepts: ${concepts.join(', ')}\n\nGenerate the quest JSON.`,
  });
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in response');
  return JSON.parse(jsonMatch[0]);
}

async function sendSocraticMessage(userMessage, chatHistory, questContext) {
  const systemPrompt = `You are a Socratic guide for a group of young learners aged 6-16 on a math quest.

ABSOLUTE RULES — never break these:
1. NEVER give the answer to any math problem or question
2. NEVER explain how to do something
3. ONLY respond with questions — 1 to 3 questions maximum
4. Be a curious devil's advocate — challenge their assumptions with questions
5. If they're on the right track, ask them to explain WHY
6. If they give an answer, ask "How did you get that?" or "What would happen if...?"
7. Keep questions short, friendly, and age-appropriate
8. Reference their specific quest and roles when possible

The group's quest: ${questContext.quest_title}
Their mission: ${questContext.mission}
Math concepts: ${questContext.concepts.join(', ')}`;

  return callExperimentAI({ systemPrompt, messages: chatHistory });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PageHeader() {
  return (
    <header style={{
      borderBottom: '1px solid var(--pencil)',
      backgroundColor: 'var(--chalk)',
      padding: '0.75rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    }}>
      <BookOpen size={18} style={{ color: 'var(--lab-blue)' }} />
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1rem',
        color: 'var(--ink)',
        letterSpacing: '0.01em',
      }}>
        Wayfinder Experiment
      </span>
    </header>
  );
}

// ─── Phase 0: Landing ─────────────────────────────────────────────────────────

function PhaseLanding({ onStart }) {
  return (
    <div style={{
      minHeight: 'calc(100vh - 53px)',
      backgroundColor: 'var(--paper)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
    }}>
      <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
        <span style={{
          display: 'inline-block',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          color: 'var(--graphite)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '1.25rem',
          padding: '0.25rem 0.75rem',
          border: '1px solid var(--pencil)',
          borderRadius: '100px',
        }}>
          Week 1 Experiment · No account needed
        </span>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 5vw, 2.5rem)',
          color: 'var(--ink)',
          lineHeight: 1.2,
          marginBottom: '1rem',
        }}>
          The Math Expedition
        </h1>

        <p style={{
          fontSize: '1.125rem',
          color: 'var(--graphite)',
          marginBottom: '0.75rem',
          fontWeight: 500,
        }}>
          5 learners. 3 concepts. One shared mission.
        </p>

        <p style={{
          fontSize: '1rem',
          color: 'var(--graphite)',
          lineHeight: 1.7,
          marginBottom: '2.5rem',
          maxWidth: '480px',
          margin: '0 auto 2.5rem',
        }}>
          Work together to solve a real problem. An AI guide will ask you
          questions — but never give you the answers.
        </p>

        <button className="btn btn-primary" onClick={onStart} style={{ fontSize: '1rem', padding: '0.875rem 2rem' }}>
          Start the Expedition
          <ArrowRight size={18} />
        </button>

        <div style={{
          marginTop: '2.5rem',
          padding: '1rem 1.5rem',
          backgroundColor: 'var(--parchment)',
          border: '1px solid var(--pencil)',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: 'var(--graphite)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          justifyContent: 'center',
        }}>
          <Users size={16} style={{ flexShrink: 0, color: 'var(--compass-gold)' }} />
          This experiment works best with 2–5 people around one device.
        </div>
      </div>
    </div>
  );
}

// ─── Phase 1: Intake Form ─────────────────────────────────────────────────────

function PhaseIntake({ learners, setLearners, onNext, onBack }) {
  function updateLearner(idx, field, value) {
    setLearners(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  function addLearner() {
    if (learners.length < 5) {
      setLearners(prev => [...prev, { name: '', age: '', interests: '' }]);
    }
  }

  function removeLearner(idx) {
    setLearners(prev => prev.filter((_, i) => i !== idx));
  }

  const canProceed = learners.every(l => l.name.trim() && l.age && l.interests.trim());

  return (
    <div style={{
      minHeight: 'calc(100vh - 53px)',
      backgroundColor: 'var(--paper)',
      padding: '2.5rem 1.5rem',
    }}>
      <div className="container" style={{ maxWidth: '680px' }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '1.5rem', paddingLeft: 0 }}>
          <ArrowLeft size={16} /> Back
        </button>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.5rem, 4vw, 2rem)',
          color: 'var(--ink)',
          marginBottom: '0.5rem',
        }}>
          Who's on this expedition?
        </h2>
        <p style={{ color: 'var(--graphite)', marginBottom: '2rem', fontSize: '0.9375rem' }}>
          Add everyone who'll be participating. Up to 5 learners.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {learners.map((learner, idx) => (
            <div key={idx} className="card" style={{ padding: '1.25rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--lab-blue)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 500,
                }}>
                  Learner {idx + 1}
                </span>
                {learners.length > 1 && (
                  <button
                    onClick={() => removeLearner(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--graphite)',
                      fontSize: '1.125rem',
                      lineHeight: 1,
                      padding: '0.125rem 0.375rem',
                      borderRadius: '4px',
                      transition: 'color 150ms',
                    }}
                    onMouseOver={e => e.currentTarget.style.color = 'var(--specimen-red)'}
                    onMouseOut={e => e.currentTarget.style.color = 'var(--graphite)'}
                    aria-label="Remove learner"
                  >
                    ×
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input
                  className="input"
                  type="text"
                  placeholder="Learner's name"
                  value={learner.name}
                  onChange={e => updateLearner(idx, 'name', e.target.value)}
                />
                <input
                  className="input"
                  type="number"
                  placeholder="Age"
                  min={6}
                  max={18}
                  value={learner.age}
                  onChange={e => updateLearner(idx, 'age', e.target.value)}
                  style={{ width: '80px' }}
                />
              </div>

              <input
                className="input"
                type="text"
                placeholder="What do you love? e.g. dinosaurs, soccer, cooking"
                value={learner.interests}
                onChange={e => updateLearner(idx, 'interests', e.target.value)}
              />
            </div>
          ))}
        </div>

        {learners.length < 5 && (
          <button
            onClick={addLearner}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--lab-blue)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.9375rem',
              fontWeight: 600,
              marginTop: '1rem',
              padding: '0.5rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            + Add another learner
          </button>
        )}

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-primary"
            onClick={onNext}
            disabled={!canProceed}
            style={{ opacity: canProceed ? 1 : 0.45, cursor: canProceed ? 'pointer' : 'not-allowed' }}
          >
            Choose Math Concepts
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Phase 2: Concept Selection ───────────────────────────────────────────────

function PhaseConceptSelection({ selectedConcepts, setSelectedConcepts, onNext, onBack }) {
  function toggleConcept(id) {
    setSelectedConcepts(prev => {
      if (prev.includes(id)) return prev.filter(c => c !== id);
      if (prev.length < 3) return [...prev, id];
      return prev;
    });
  }

  const readyToGenerate = selectedConcepts.length === 3;

  return (
    <div style={{
      minHeight: 'calc(100vh - 53px)',
      backgroundColor: 'var(--paper)',
      padding: '2.5rem 1.5rem',
    }}>
      <div className="container">
        <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '1.5rem', paddingLeft: 0 }}>
          <ArrowLeft size={16} /> Back
        </button>

        <div style={{ marginBottom: '1.75rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            color: 'var(--ink)',
            marginBottom: '0.375rem',
          }}>
            Choose your 3 math concepts
          </h2>
          <p style={{ color: 'var(--graphite)', fontSize: '0.9375rem' }}>
            Pick exactly 3 — your quest will combine them.
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem',
            color: selectedConcepts.length === 3 ? 'var(--field-green)' : 'var(--graphite)',
            fontWeight: 500,
          }}>
            {selectedConcepts.length} / 3 selected
            {selectedConcepts.length === 3 && ' ✓'}
          </span>
          {selectedConcepts.length > 0 && (
            <button
              onClick={() => setSelectedConcepts([])}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--graphite)',
                fontSize: '0.8125rem',
                fontFamily: 'var(--font-body)',
              }}
            >
              Clear selection
            </button>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '0.875rem',
          marginBottom: '2rem',
        }}>
          {MATH_CONCEPTS.map(concept => {
            const isSelected = selectedConcepts.includes(concept.id);
            const isDisabled = !isSelected && selectedConcepts.length === 3;

            return (
              <button
                key={concept.id}
                onClick={() => !isDisabled && toggleConcept(concept.id)}
                style={{
                  textAlign: 'left',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  background: isSelected ? 'rgba(27, 73, 101, 0.06)' : 'var(--chalk)',
                  border: `2px solid ${isSelected ? 'var(--lab-blue)' : 'var(--pencil)'}`,
                  borderRadius: '8px',
                  padding: '1rem',
                  opacity: isDisabled ? 0.45 : 1,
                  transition: 'all 150ms ease',
                  fontFamily: 'var(--font-body)',
                  position: 'relative',
                }}
                onMouseOver={e => {
                  if (!isDisabled && !isSelected) {
                    e.currentTarget.style.borderColor = 'var(--graphite)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(26,26,46,0.1)';
                  }
                }}
                onMouseOut={e => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = 'var(--pencil)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
                aria-pressed={isSelected}
                aria-label={`${concept.title}: ${concept.desc}`}
              >
                {isSelected && (
                  <span style={{
                    position: 'absolute',
                    top: '0.625rem',
                    right: '0.625rem',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'var(--lab-blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Check size={12} color="white" />
                  </span>
                )}
                <span style={{ display: 'block', marginBottom: '0.5rem' }}>
                  <concept.Icon size={28} color={isSelected ? 'var(--lab-blue)' : 'var(--graphite)'} />
                </span>
                <span style={{
                  display: 'block',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  color: isSelected ? 'var(--lab-blue)' : 'var(--ink)',
                  marginBottom: '0.25rem',
                }}>
                  {concept.title}
                </span>
                <span style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  color: 'var(--graphite)',
                  lineHeight: 1.4,
                }}>
                  {concept.desc}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-primary"
            onClick={onNext}
            disabled={!readyToGenerate}
            style={{
              opacity: readyToGenerate ? 1 : 0.45,
              cursor: readyToGenerate ? 'pointer' : 'not-allowed',
            }}
          >
            Generate Our Quest
            <Zap size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Phase 3: Loading ─────────────────────────────────────────────────────────

function PhaseLoading({ error, onRetry }) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (error) return;
    const interval = setInterval(() => {
      setMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [error]);

  if (error) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 53px)',
        backgroundColor: 'var(--paper)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(192, 57, 43, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}>
            <span style={{ fontSize: '1.5rem' }}>!</span>
          </div>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            color: 'var(--ink)',
            marginBottom: '0.625rem',
          }}>
            Something went wrong
          </h3>
          <p style={{ color: 'var(--graphite)', fontSize: '0.9375rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            {error}
          </p>
          <button className="btn btn-primary" onClick={onRetry}>
            Try Again
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 53px)',
      backgroundColor: 'var(--paper)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          border: '3px solid var(--lab-blue)',
          borderTopColor: 'transparent',
          animation: 'spin 0.9s linear infinite',
          margin: '0 auto 1.75rem',
        }} />
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeInOut { 0%,100% { opacity: 0; transform: translateY(6px); } 20%,80% { opacity: 1; transform: translateY(0); } }
        `}</style>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.25rem',
          color: 'var(--ink)',
          marginBottom: '0.5rem',
          animation: 'fadeInOut 2s ease infinite',
          minHeight: '2rem',
        }}>
          {LOADING_MESSAGES[msgIdx]}
        </p>
        <p style={{ color: 'var(--pencil)', fontSize: '0.875rem' }}>
          Crafting your personalised quest…
        </p>
      </div>
    </div>
  );
}

// ─── Phase 4: Quest + Socratic Chat ──────────────────────────────────────────

function PhaseQuest({ quest, learners, selectedConcepts, onWrapUp }) {
  const [chatHistory, setChatHistory] = useState([]);
  const [inputText, setInputText] = useState('');
  const [activeSpeaker, setActiveSpeaker] = useState(learners[0]?.name || '');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [promptsOpen, setPromptsOpen] = useState(false);
  const chatEndRef = useRef(null);

  const conceptNames = selectedConcepts.map(id => {
    const c = MATH_CONCEPTS.find(m => m.id === id);
    return c ? c.title : id;
  });

  // First guide message on mount
  useEffect(() => {
    const firstMsg = {
      role: 'assistant',
      content: `Welcome, expedition team! I've read your mission. Before you dive in — what's the FIRST thing you'd need to figure out to tackle "${quest.shared_challenge}"? Don't give me an answer yet — just tell me what information you think you'd need.`,
    };
    setChatHistory([firstMsg]);
  }, [quest.shared_challenge]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  async function handleSend() {
    if (!inputText.trim() || isSending) return;

    const userContent = `[${activeSpeaker}]: ${inputText.trim()}`;
    const newHistory = [...chatHistory, { role: 'user', content: userContent }];
    setChatHistory(newHistory);
    setInputText('');
    setIsSending(true);
    setChatError(null);

    try {
      const reply = await sendSocraticMessage(userContent, newHistory, {
        quest_title: quest.quest_title,
        mission: quest.mission,
        concepts: conceptNames,
      });
      setChatHistory(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setChatError('The guide couldn\'t respond. Check your API key in settings.');
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 53px)',
      backgroundColor: 'var(--paper)',
      padding: '2rem 1.5rem',
    }}>
      <div className="container">
        {/* Two-column layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: '1.5rem',
          alignItems: 'start',
        }}
          className="quest-layout"
        >
          {/* Inline responsive style */}
          <style>{`
            @media (max-width: 768px) {
              .quest-layout { grid-template-columns: 1fr !important; }
            }
          `}</style>

          {/* Left — Quest Brief */}
          <div>
            <div className="card" style={{ background: 'var(--parchment)', marginBottom: '1rem' }}>
              {/* Title + Mission */}
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--lab-blue)',
                  fontWeight: 500,
                }}>
                  Your Quest
                </span>
                <h2 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  color: 'var(--ink)',
                  lineHeight: 1.25,
                  marginTop: '0.375rem',
                  marginBottom: '0.75rem',
                }}>
                  {quest.quest_title}
                </h2>
                <p style={{ color: 'var(--graphite)', fontSize: '0.9375rem', lineHeight: 1.65 }}>
                  {quest.mission}
                </p>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--pencil)', margin: '1rem 0' }} />

              {/* Scenario */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--graphite)',
                  marginBottom: '0.5rem',
                }}>
                  The Situation
                </h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--ink)', lineHeight: 1.65 }}>
                  {quest.scenario}
                </p>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--pencil)', margin: '1rem 0' }} />

              {/* Roles */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--graphite)',
                  marginBottom: '0.75rem',
                }}>
                  Your Roles
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {quest.roles?.map((role, idx) => (
                    <div key={idx} style={{
                      background: 'var(--chalk)',
                      border: '1px solid var(--pencil)',
                      borderRadius: '6px',
                      padding: '0.75rem 1rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ink)' }}>
                            {role.learner_name}
                          </span>
                          <span style={{ color: 'var(--graphite)', fontSize: '0.875rem' }}> · {role.role_title}</span>
                        </div>
                        <span style={{
                          display: 'inline-block',
                          background: 'rgba(27, 73, 101, 0.08)',
                          color: 'var(--lab-blue)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.65rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '100px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}>
                          {role.math_focus}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--graphite)', lineHeight: 1.55, margin: 0 }}>
                        {role.role_description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--pencil)', margin: '1rem 0' }} />

              {/* Shared Challenge */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--graphite)',
                  marginBottom: '0.5rem',
                }}>
                  Your Shared Challenge
                </h4>
                <div style={{
                  background: 'rgba(27, 73, 101, 0.06)',
                  border: '1px solid rgba(27, 73, 101, 0.2)',
                  borderRadius: '6px',
                  padding: '0.875rem 1rem',
                  fontSize: '0.9rem',
                  color: 'var(--ink)',
                  lineHeight: 1.65,
                  fontStyle: 'italic',
                }}>
                  {quest.shared_challenge}
                </div>
              </div>

              {/* Discussion Prompts (collapsible) */}
              <div>
                <button
                  onClick={() => setPromptsOpen(p => !p)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--graphite)',
                    padding: 0,
                    marginBottom: promptsOpen ? '0.75rem' : 0,
                  }}
                >
                  <MessageCircle size={13} />
                  Discussion Prompts
                  <span style={{ marginLeft: 'auto', fontSize: '0.9rem' }}>{promptsOpen ? '▲' : '▼'}</span>
                </button>
                {promptsOpen && (
                  <ol style={{ paddingLeft: '1.25rem', margin: 0 }}>
                    {quest.discussion_prompts?.map((prompt, idx) => (
                      <li key={idx} style={{
                        fontSize: '0.875rem',
                        color: 'var(--ink)',
                        lineHeight: 1.6,
                        marginBottom: '0.5rem',
                      }}>
                        {prompt}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            {/* Success criteria */}
            {quest.success_looks_like && (
              <div style={{
                background: 'rgba(45, 106, 79, 0.06)',
                border: '1px solid rgba(45, 106, 79, 0.25)',
                borderRadius: '8px',
                padding: '1rem',
                fontSize: '0.875rem',
                color: 'var(--field-green)',
                lineHeight: 1.6,
                marginBottom: '1rem',
              }}>
                <strong>Success looks like:</strong> {quest.success_looks_like}
              </div>
            )}

            <button className="btn btn-secondary" onClick={onWrapUp} style={{ width: '100%', justifyContent: 'center' }}>
              Wrap Up the Expedition
              <Check size={16} />
            </button>
          </div>

          {/* Right — Socratic Chat */}
          <div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Chat header */}
              <div style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--pencil)',
                background: 'var(--ink)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <Brain size={16} color="var(--chalk)" />
                  <span style={{ fontWeight: 700, color: 'var(--chalk)', fontSize: '0.9375rem' }}>
                    Ask the Guide
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                  The guide will only ask you questions. It never gives answers.
                </p>
              </div>

              {/* Messages */}
              <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '1rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.875rem',
                background: 'var(--chalk)',
              }}>
                {chatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                      gap: '0.5rem',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: msg.role === 'assistant' ? 'var(--lab-blue)' : 'var(--parchment)',
                      border: msg.role === 'user' ? '1px solid var(--pencil)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {msg.role === 'assistant'
                        ? <Brain size={13} color="white" />
                        : <span style={{ fontSize: '0.75rem' }}>👤</span>
                      }
                    </div>
                    <div style={{
                      maxWidth: '78%',
                      background: msg.role === 'assistant' ? 'rgba(27, 73, 101, 0.07)' : 'var(--parchment)',
                      border: '1px solid',
                      borderColor: msg.role === 'assistant' ? 'rgba(27, 73, 101, 0.15)' : 'var(--pencil)',
                      borderRadius: msg.role === 'assistant' ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                      padding: '0.625rem 0.875rem',
                      fontSize: '0.875rem',
                      color: 'var(--ink)',
                      lineHeight: 1.55,
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {isSending && (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: 'var(--lab-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Brain size={13} color="white" />
                    </div>
                    <div style={{
                      background: 'rgba(27, 73, 101, 0.07)',
                      border: '1px solid rgba(27, 73, 101, 0.15)',
                      borderRadius: '4px 12px 12px 12px',
                      padding: '0.625rem 1rem',
                      display: 'flex',
                      gap: '4px',
                      alignItems: 'center',
                    }}>
                      <style>{`
                        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
                        .dot1{animation:bounce 1.2s infinite 0s}
                        .dot2{animation:bounce 1.2s infinite 0.15s}
                        .dot3{animation:bounce 1.2s infinite 0.3s}
                      `}</style>
                      {['dot1','dot2','dot3'].map(cls => (
                        <span key={cls} className={cls} style={{
                          display: 'inline-block', width: '6px', height: '6px',
                          borderRadius: '50%', background: 'var(--lab-blue)',
                        }} />
                      ))}
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Error */}
              {chatError && (
                <div style={{
                  padding: '0.625rem 1.25rem',
                  background: 'rgba(192, 57, 43, 0.06)',
                  borderTop: '1px solid rgba(192, 57, 43, 0.2)',
                  fontSize: '0.8125rem',
                  color: 'var(--specimen-red)',
                }}>
                  {chatError}
                </div>
              )}

              {/* Input area */}
              <div style={{
                padding: '1rem 1.25rem',
                borderTop: '1px solid var(--pencil)',
                background: 'var(--parchment)',
              }}>
                {/* Speaker selector */}
                <div style={{ marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--graphite)', whiteSpace: 'nowrap' }}>
                    Learner speaking:
                  </span>
                  <select
                    value={activeSpeaker}
                    onChange={e => setActiveSpeaker(e.target.value)}
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.8125rem',
                      color: 'var(--ink)',
                      background: 'var(--chalk)',
                      border: '1px solid var(--pencil)',
                      borderRadius: '4px',
                      padding: '0.25rem 0.5rem',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    {learners.map((l, i) => (
                      <option key={i} value={l.name}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Type a message to the guide…"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={{ resize: 'none', lineHeight: 1.5 }}
                    disabled={isSending}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleSend}
                    disabled={!inputText.trim() || isSending}
                    style={{
                      alignSelf: 'flex-end',
                      opacity: !inputText.trim() || isSending ? 0.5 : 1,
                      cursor: !inputText.trim() || isSending ? 'not-allowed' : 'pointer',
                      padding: '0.75rem',
                    }}
                    aria-label="Send"
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--pencil)', marginTop: '0.375rem' }}>
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Phase 5: Reflection ──────────────────────────────────────────────────────

const REFLECTION_QUESTIONS = [
  'Which part of the mission was hardest for you?',
  'What moment changed how you were thinking?',
  'Would you want to go on another expedition like this?',
];

function PhaseReflection({ learners, quest, selectedConcepts, onComplete, onRestart }) {
  const [reflections, setReflections] = useState(() =>
    learners.map(() => ['', '', ''])
  );
  const [completed, setCompleted] = useState(false);

  function updateReflection(learnerIdx, questionIdx, value) {
    setReflections(prev => {
      const next = prev.map(r => [...r]);
      next[learnerIdx][questionIdx] = value;
      return next;
    });
  }

  const conceptNames = selectedConcepts.map(id => {
    const c = MATH_CONCEPTS.find(m => m.id === id);
    return c ? c.title : id;
  });

  // Consider "all filled" if every learner has answered at least 1 question
  const hasAnyInput = reflections.some(r => r.some(a => a.trim()));

  if (completed) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 53px)',
        backgroundColor: 'var(--paper)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
      }}>
        <div style={{ maxWidth: '560px', width: '100%', textAlign: 'center' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'rgba(45, 106, 79, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <Check size={36} style={{ color: 'var(--field-green)' }} />
          </div>

          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
            color: 'var(--ink)',
            marginBottom: '0.75rem',
          }}>
            Expedition Complete!
          </h2>

          <p style={{
            color: 'var(--graphite)',
            fontSize: '1rem',
            lineHeight: 1.65,
            marginBottom: '2rem',
          }}>
            Your team explored{' '}
            <strong style={{ color: 'var(--ink)' }}>
              {conceptNames.join(', ')}
            </strong>{' '}
            through{' '}
            <em style={{ fontFamily: 'var(--font-display)', fontSize: '1.0625rem' }}>
              {quest.quest_title}
            </em>.
          </p>

          {/* Role badges */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            justifyContent: 'center',
            marginBottom: '2.5rem',
          }}>
            {quest.roles?.map((role, idx) => (
              <div key={idx} style={{
                background: 'var(--parchment)',
                border: '1px solid var(--pencil)',
                borderRadius: '100px',
                padding: '0.375rem 1rem',
                fontSize: '0.8125rem',
                color: 'var(--ink)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}>
                <Star size={12} style={{ color: 'var(--compass-gold)' }} />
                <strong>{role.learner_name}</strong>
                <span style={{ color: 'var(--graphite)' }}>· {role.role_title}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={onRestart}>
              <ArrowLeft size={16} /> Start a new expedition
            </button>
            <a href="/signup" className="btn btn-primary">
              Join Wayfinder
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 53px)',
      backgroundColor: 'var(--paper)',
      padding: '2.5rem 1.5rem',
    }}>
      <div className="container" style={{ maxWidth: '720px' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.5rem, 4vw, 2rem)',
          color: 'var(--ink)',
          marginBottom: '0.375rem',
        }}>
          How did the expedition go?
        </h2>
        <p style={{ color: 'var(--graphite)', marginBottom: '2rem', fontSize: '0.9375rem' }}>
          Take a moment to reflect on what happened.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {learners.map((learner, lIdx) => {
            const role = quest.roles?.find(r => r.learner_name === learner.name);
            return (
              <div key={lIdx} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(27, 73, 101, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    color: 'var(--lab-blue)',
                    flexShrink: 0,
                  }}>
                    {learner.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ink)' }}>{learner.name}</div>
                    {role && (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--graphite)' }}>{role.role_title}</div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {REFLECTION_QUESTIONS.map((question, qIdx) => (
                    <div key={qIdx}>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--ink)',
                        marginBottom: '0.375rem',
                      }}>
                        {question}
                      </label>
                      <textarea
                        className="input"
                        rows={3}
                        placeholder="Write your thoughts here… (optional)"
                        value={reflections[lIdx][qIdx]}
                        onChange={e => updateReflection(lIdx, qIdx, e.target.value)}
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-primary"
            onClick={() => setCompleted(true)}
            style={{ fontSize: '1rem', padding: '0.875rem 2rem' }}
          >
            Complete the Expedition
            <Check size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function ExperimentPage() {
  const [phase, setPhase] = useState(0);
  const [learners, setLearners] = useState([{ name: '', age: '', interests: '' }]);
  const [selectedConcepts, setSelectedConcepts] = useState([]);
  const [quest, setQuest] = useState(null);
  const [loadingError, setLoadingError] = useState(null);

  const conceptNames = selectedConcepts.map(id => {
    const c = MATH_CONCEPTS.find(m => m.id === id);
    return c ? c.title : id;
  });

  async function startGeneration() {
    setPhase(3);
    setLoadingError(null);
    try {
      const result = await generateGroupQuest(learners, conceptNames);
      setQuest(result);
      setPhase(4);
    } catch (err) {
      setLoadingError(err?.message || 'Something went wrong generating the quest.');
    }
  }

  function handleRetry() {
    startGeneration();
  }

  function resetAll() {
    setPhase(0);
    setLearners([{ name: '', age: '', interests: '' }]);
    setSelectedConcepts([]);
    setQuest(null);
    setLoadingError(null);
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--paper)' }}>
      <PageHeader />

      {phase === 0 && (
        <PhaseLanding onStart={() => setPhase(1)} />
      )}

      {phase === 1 && (
        <PhaseIntake
          learners={learners}
          setLearners={setLearners}
          onNext={() => setPhase(2)}
          onBack={() => setPhase(0)}
        />
      )}

      {phase === 2 && (
        <PhaseConceptSelection
          selectedConcepts={selectedConcepts}
          setSelectedConcepts={setSelectedConcepts}
          onNext={startGeneration}
          onBack={() => setPhase(1)}
        />
      )}

      {phase === 3 && (
        <PhaseLoading error={loadingError} onRetry={handleRetry} />
      )}

      {phase === 4 && quest && (
        <PhaseQuest
          quest={quest}
          learners={learners}
          selectedConcepts={selectedConcepts}
          onWrapUp={() => setPhase(5)}
        />
      )}

      {phase === 5 && quest && (
        <PhaseReflection
          learners={learners}
          quest={quest}
          selectedConcepts={selectedConcepts}
          onComplete={() => {}}
          onRestart={resetAll}
        />
      )}
    </div>
  );
}
