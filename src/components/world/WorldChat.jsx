import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send } from 'lucide-react';
import { ai, guideMessages } from '../../lib/api';

// Strip the hidden ---ASSESSMENT--- block from AI responses before displaying
function stripAssessment(text) {
  if (!text) return '';
  const idx = text.indexOf('---ASSESSMENT---');
  return idx >= 0 ? text.slice(0, idx).trim() : text.trim();
}

// ===================== TYPING INDICATOR =====================
function TypingIndicator({ accentColor }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '10px 14px',
      background: 'rgba(255,255,255,0.06)',
      borderRadius: '14px 14px 14px 4px',
      maxWidth: '80%',
      alignSelf: 'flex-start',
    }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: accentColor || 'var(--world-accent, #4ecdc4)',
            opacity: 0.5,
            animation: `world-chat-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ===================== MESSAGE BUBBLE =====================
function MessageBubble({ message, mentorName, accentColor }) {
  const isMentor = message.role === 'mentor';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isMentor ? 'flex-start' : 'flex-end',
      marginBottom: 10,
    }}>
      {isMentor && (
        <span style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 600,
          color: accentColor || 'var(--world-accent, #4ecdc4)',
          marginBottom: 3,
          paddingLeft: 4,
        }}>
          {mentorName}
        </span>
      )}
      <div style={{
        maxWidth: '85%',
        padding: '10px 14px',
        borderRadius: isMentor ? '14px 14px 14px 4px' : '14px 14px 4px 14px',
        background: isMentor
          ? 'rgba(255,255,255,0.06)'
          : 'var(--world-surface, rgba(255,255,255,0.12))',
        border: isMentor
          ? `1px solid ${accentColor ? accentColor + '22' : 'rgba(78,205,196,0.13)'}`
          : '1px solid rgba(255,255,255,0.08)',
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        lineHeight: 1.55,
        color: 'var(--world-text, #f0f0f0)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {message.content}
      </div>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--world-text-muted, rgba(240,240,240,0.4))',
        marginTop: 2,
        paddingLeft: isMentor ? 4 : 0,
        paddingRight: isMentor ? 0 : 4,
      }}>
        {message.timestamp
          ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : ''}
      </span>
    </div>
  );
}

// ===================== MAIN WORLDCHAT COMPONENT =====================
export default function WorldChat({ quest, stage, blueprint, studentSession, onClose, onStageComplete }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const initRef = useRef(false);

  const mentor = blueprint?.mentor || {};
  const mentorName = mentor.name || 'Mentor';
  const mentorRole = mentor.role || 'Guide';
  const mentorPersonality = mentor.personality || '';
  const accentColor = blueprint?.palette?.accent || 'var(--world-accent, #4ecdc4)';
  const setting = blueprint?.setting || '';

  // Find the matching blueprint stage for richer narrative data
  const stageIndex = quest?.quest_stages
    ? [...(quest.quest_stages || [])].sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0)).findIndex(s => s.id === stage?.id)
    : -1;
  const blueprintStage = blueprint?.stages?.[stageIndex] || null;
  const locationName = blueprintStage?.location || stage?.location_name || stage?.title || 'this location';
  const arrivalNarrative = blueprintStage?.arrivalNarrative || stage?.location_narrative || '';

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Load existing messages + generate greeting on mount or stage change
  useEffect(() => {
    if (!quest?.id || !stage?.id || !studentSession?.studentName) return;
    // Prevent double-init in StrictMode
    if (initRef.current) return;
    initRef.current = true;

    async function init() {
      try {
        // Load existing messages for this stage
        const { data: existing } = await guideMessages.list(quest.id, stage.id, studentSession.studentName);

        if (existing && existing.length > 0) {
          // Map DB messages to local format
          const loaded = existing.map(m => ({
            role: m.role === 'assistant' ? 'mentor' : (m.role === 'user' ? 'student' : m.role),
            content: stripAssessment(m.content),
            timestamp: m.created_at,
          }));
          setMessages(loaded);
          setInitialized(true);
          return;
        }

        // No existing messages — generate mentor greeting
        const greetingSnippet = arrivalNarrative
          ? arrivalNarrative.split('.').slice(0, 2).join('.') + '.'
          : `Welcome to ${locationName}.`;

        const greeting = `${greetingSnippet} What's your first instinct here?`;

        // Persist greeting
        await guideMessages.add({
          questId: quest.id,
          stageId: stage.id,
          studentId: studentSession.studentId || null,
          studentName: studentSession.studentName,
          role: 'assistant',
          content: greeting,
          messageType: 'world_mentor',
        });

        setMessages([{
          role: 'mentor',
          content: greeting,
          timestamp: new Date().toISOString(),
        }]);
        setInitialized(true);
      } catch (err) {
        console.error('WorldChat init error:', err);
        // Fallback greeting if DB fails
        setMessages([{
          role: 'mentor',
          content: `Welcome to ${locationName}. What's your first instinct here?`,
          timestamp: new Date().toISOString(),
        }]);
        setInitialized(true);
      }
    }

    init();

    // Reset when stage changes
    return () => {
      initRef.current = false;
    };
  }, [quest?.id, stage?.id, studentSession?.studentName, locationName, arrivalNarrative]);

  // Build the character-wrapped system prompt for AI calls
  const buildSystemPrompt = useCallback(() => {
    const characterBlock = [
      `You are ${mentorName}, ${mentorRole}.`,
      mentorPersonality ? mentorPersonality : '',
      `You are guiding a student through "${stage?.title || 'this stage'}" in the world of "${setting}".`,
      `The current location is "${locationName}".`,
      'STAY IN CHARACTER. Refer to the world, locations, the journey. Never break the fourth wall.',
      'Use Socratic questioning — ask 1-2 follow-up questions instead of giving direct answers.',
      'Keep replies under 3 sentences. Be warm but take the student seriously.',
    ].filter(Boolean).join('\n');

    return characterBlock;
  }, [mentorName, mentorRole, mentorPersonality, stage?.title, setting, locationName]);

  // Send message
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const studentMsg = {
      role: 'student',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, studentMsg]);
    setInput('');
    setSending(true);

    try {
      // Persist student message
      await guideMessages.add({
        questId: quest.id,
        stageId: stage.id,
        studentId: studentSession?.studentId || null,
        studentName: studentSession?.studentName || 'Student',
        role: 'user',
        content: trimmed,
        messageType: 'world_mentor',
      });

      // Build conversation history for AI
      const aiMessages = messages.concat(studentMsg).map(m => ({
        role: m.role === 'mentor' ? 'assistant' : 'user',
        content: m.content,
      }));

      // Guiding questions array
      const guidingQuestions = stage?.guiding_questions || [];
      const questionsArray = Array.isArray(guidingQuestions)
        ? guidingQuestions
        : typeof guidingQuestions === 'string'
          ? guidingQuestions.split('\n').filter(Boolean)
          : [];

      // Call AI with character-wrapped prompt
      const response = await ai.questHelp({
        stageTitle: stage?.title || '',
        stageDescription: stage?.description || '',
        guidingQuestions: questionsArray,
        deliverable: stage?.deliverable || stage?.deliverable_description || '',
        studentProfile: {
          name: studentSession?.studentName,
          interests: studentSession?.interests || [],
          passions: studentSession?.passions || [],
        },
        messages: aiMessages,
      });

      const cleanResponse = stripAssessment(response);

      // Persist mentor response
      await guideMessages.add({
        questId: quest.id,
        stageId: stage.id,
        studentId: studentSession?.studentId || null,
        studentName: studentSession?.studentName || 'Student',
        role: 'assistant',
        content: response, // persist full response with assessment
        messageType: 'world_mentor',
      });

      setMessages(prev => [...prev, {
        role: 'mentor',
        content: cleanResponse,
        timestamp: new Date().toISOString(),
      }]);
    } catch (err) {
      console.error('WorldChat send error:', err);
      setMessages(prev => [...prev, {
        role: 'mentor',
        content: "I'm having trouble thinking right now. Try asking again in a moment.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
      // Re-focus input after sending
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, sending, messages, quest, stage, studentSession, buildSystemPrompt]);

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Detect mobile (simple heuristic)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <>
      <style>{`
        @keyframes world-chat-slide-in {
          from { transform: ${isMobile ? 'translateY(100%)' : 'translateX(100%)'}; opacity: 0; }
          to { transform: ${isMobile ? 'translateY(0)' : 'translateX(0)'}; opacity: 1; }
        }
        @keyframes world-chat-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 0.8; }
        }
      `}</style>

      <div style={{
        position: 'fixed',
        zIndex: 20,
        ...(isMobile ? {
          bottom: 0, left: 0, right: 0,
          height: '70vh',
          borderRadius: '16px 16px 0 0',
        } : {
          top: 0, right: 0, bottom: 0,
          width: 380,
          borderRadius: '16px 0 0 16px',
        }),
        background: 'rgba(15,15,30,0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'world-chat-slide-in 300ms ease-out',
        overflow: 'hidden',
      }}>
        {/* Mobile drag handle */}
        {isMobile && (
          <div style={{
            display: 'flex', justifyContent: 'center',
            padding: '8px 0 0',
          }}>
            <div style={{
              width: 36, height: 4, borderRadius: 2,
              background: 'rgba(255,255,255,0.2)',
            }} />
          </div>
        )}

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              color: 'var(--world-text, #f0f0f0)',
            }}>
              {mentorName}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 8,
              background: accentColor ? `${accentColor}20` : 'rgba(78,205,196,0.12)',
              color: accentColor || 'var(--world-accent, #4ecdc4)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 600,
            }}>
              {mentorRole}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none',
              color: 'var(--world-text-muted, rgba(240,240,240,0.6))',
              cursor: 'pointer', padding: 4,
              display: 'flex', alignItems: 'center',
              borderRadius: 6,
              transition: 'color 200ms',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--world-text, #f0f0f0)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--world-text-muted, rgba(240,240,240,0.6))'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 16px 8px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              message={msg}
              mentorName={mentorName}
              accentColor={accentColor}
            />
          ))}

          {sending && <TypingIndicator accentColor={accentColor} />}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div style={{
          padding: '12px 14px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'flex-end', gap: 8,
          flexShrink: 0,
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={sending ? `${mentorName} is thinking...` : `Talk to ${mentorName}...`}
            disabled={sending}
            rows={1}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--world-text, #f0f0f0)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              lineHeight: 1.4,
              resize: 'none',
              outline: 'none',
              maxHeight: 100,
              transition: 'border-color 200ms',
            }}
            onFocus={e => e.target.style.borderColor = accentColor || 'var(--world-accent, #4ecdc4)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            style={{
              width: 40, height: 40,
              borderRadius: 10,
              border: 'none',
              background: (sending || !input.trim())
                ? 'rgba(255,255,255,0.08)'
                : (accentColor || 'var(--world-accent, #4ecdc4)'),
              color: (sending || !input.trim())
                ? 'rgba(255,255,255,0.3)'
                : '#111',
              cursor: (sending || !input.trim()) ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 200ms, opacity 200ms',
            }}
            onMouseEnter={e => { if (!sending && input.trim()) e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
