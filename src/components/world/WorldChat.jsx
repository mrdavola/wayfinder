import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Plus, FileUp, Camera, Mic, Square, Award } from 'lucide-react';
import { ai, guideMessages, submissionFeedback } from '../../lib/api';
import { supabase } from '../../lib/supabase';

// Strip the hidden ---ASSESSMENT--- block from AI responses before displaying
function stripAssessment(text) {
  if (!text) return '';
  const idx = text.indexOf('---ASSESSMENT---');
  return idx >= 0 ? text.slice(0, idx).trim() : text.trim();
}

const CHALLENGER_COLOR = '#e74c3c';

// Simple inline markdown → React elements (bold, italic, bold-italic)
function renderMarkdown(text) {
  if (!text) return text;
  // Split by markdown patterns: ***bold italic***, **bold**, *italic*
  const parts = [];
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={match.index}><em>{match[2]}</em></strong>);
    } else if (match[3]) {
      parts.push(<strong key={match.index}>{match[3]}</strong>);
    } else if (match[4]) {
      parts.push(<em key={match.index}>{match[4]}</em>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length ? parts : text;
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
function MessageBubble({ message, mentorName, challengerName, accentColor }) {
  const isMentor = message.role === 'mentor';
  const isChallenger = message.role === 'challenger';
  const isNPC = isMentor || isChallenger;

  const displayName = isChallenger ? challengerName : mentorName;
  const displayColor = isChallenger ? CHALLENGER_COLOR : (accentColor || 'var(--world-accent, #4ecdc4)');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isNPC ? 'flex-start' : 'flex-end',
      marginBottom: 10,
    }}>
      {isNPC && (
        <span style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 600,
          color: displayColor,
          marginBottom: 3,
          paddingLeft: 4,
        }}>
          {displayName}
        </span>
      )}
      <div style={{
        maxWidth: '85%',
        padding: '10px 14px',
        borderRadius: isNPC ? '14px 14px 14px 4px' : '14px 14px 4px 14px',
        background: isChallenger
          ? 'rgba(231,76,60,0.08)'
          : isNPC
            ? 'rgba(255,255,255,0.06)'
            : 'var(--world-surface, rgba(255,255,255,0.12))',
        border: isChallenger
          ? '1px solid rgba(231,76,60,0.2)'
          : isNPC
            ? `1px solid ${accentColor ? accentColor + '22' : 'rgba(78,205,196,0.13)'}`
            : '1px solid rgba(255,255,255,0.08)',
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        lineHeight: 1.55,
        color: 'var(--world-text, #f0f0f0)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {renderMarkdown(message.content)}
      </div>
      {/* Submission feedback badge */}
      {message.feedbackScore != null && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          marginTop: 4, paddingLeft: 4,
        }}>
          <Award size={12} color={message.feedbackScore >= 35 ? '#4ecdc4' : '#f39c12'} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: message.feedbackScore >= 35 ? '#4ecdc4' : '#f39c12',
          }}>
            {message.feedbackScore >= 35 ? 'Mastery achieved' : 'Keep going'}
          </span>
        </div>
      )}
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--world-text-muted, rgba(240,240,240,0.4))',
        marginTop: 2,
        paddingLeft: isNPC ? 4 : 0,
        paddingRight: isNPC ? 0 : 4,
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
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Task 10: Challenger state
  const [challengerActive, setChallengerActive] = useState(false);
  const [challengerResponded, setChallengerResponded] = useState(false);
  const mentorExchangeCount = useRef(0);

  // Task 11: Submission state
  const [submissionMode, setSubmissionMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);

  // Attachment menu + recording state
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [recording, setRecording] = useState(false);

  // Close attach menu on outside click
  useEffect(() => {
    if (!attachMenuOpen) return;
    const close = () => setAttachMenuOpen(false);
    const timer = setTimeout(() => document.addEventListener('click', close), 0);
    return () => { clearTimeout(timer); document.removeEventListener('click', close); };
  }, [attachMenuOpen]);

  const mentor = blueprint?.mentor || {};
  const mentorName = mentor.name || 'Mentor';
  const mentorRole = mentor.role || 'Guide';
  const mentorPersonality = mentor.personality || '';
  const accentColor = blueprint?.palette?.accent || 'var(--world-accent, #4ecdc4)';
  const setting = blueprint?.setting || '';

  // Challenger data from blueprint
  const challenger = blueprint?.challenger || {};
  const challengerName = challenger.name || 'The Challenger';
  const challengerPersonality = challenger.personality || '';

  // Find the matching blueprint stage for richer narrative data
  const stageIndex = quest?.quest_stages
    ? [...(quest.quest_stages || [])].sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0)).findIndex(s => s.id === stage?.id)
    : -1;
  const blueprintStage = blueprint?.stages?.[stageIndex] || null;
  const locationName = blueprintStage?.location || stage?.location_name || stage?.title || 'this location';
  const arrivalNarrative = blueprintStage?.arrivalNarrative || stage?.location_narrative || '';

  // Check if this stage is an "ordeal" beat
  const heroJourneyBeat = stage?.hero_journey_beat || blueprintStage?.beat || '';
  const isOrdealStage = heroJourneyBeat === 'the_ordeal';

  // Check if stage is completed
  const stageCompleted = stage?.status === 'completed';

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
            role: m.role === 'assistant'
              ? (m.message_type === 'devil_advocate' ? 'challenger' : 'mentor')
              : (m.role === 'user' ? 'student' : m.role),
            content: stripAssessment(m.content),
            timestamp: m.created_at,
          }));
          setMessages(loaded);

          // Count existing mentor exchanges for challenger trigger
          const mentorMsgCount = existing.filter(m => m.role === 'assistant' && m.message_type === 'field_guide').length;
          mentorExchangeCount.current = mentorMsgCount;

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
          messageType: 'field_guide',
        });

        mentorExchangeCount.current = 1;

        setMessages([{
          role: 'mentor',
          content: greeting,
          timestamp: new Date().toISOString(),
        }]);
        setInitialized(true);

        // If this is an ordeal stage, trigger challenger on first visit
        if (isOrdealStage) {
          triggerChallenger(greeting);
        }
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

  // ===================== CHALLENGER LOGIC (Task 10) =====================

  // Check if challenger should trigger after a student message
  const shouldTriggerChallenger = useCallback((studentContent) => {
    if (challengerActive) return false; // already active

    // Trigger 1: short submission content (< 100 chars)
    if (studentContent && studentContent.length < 100 && submissionMode) return true;

    // Trigger 2: ordeal stage — trigger on first student reply
    if (isOrdealStage && !challengerResponded) return true;

    // Trigger 3: every 3rd mentor exchange
    if (mentorExchangeCount.current > 0 && mentorExchangeCount.current % 3 === 0) return true;

    return false;
  }, [challengerActive, isOrdealStage, challengerResponded, submissionMode]);

  // Trigger the challenger to appear with a challenge message
  const triggerChallenger = useCallback(async (contextText) => {
    setChallengerActive(true);
    setSending(true);

    try {
      const challengeResponse = await ai.devilsAdvocate({
        stageTitle: stage?.title || '',
        stageDescription: stage?.description || '',
        studentWork: contextText || '(student is exploring)',
        studentProfile: {
          name: studentSession?.studentName,
          interests: studentSession?.interests || [],
          passions: studentSession?.passions || [],
        },
      });

      // Build a character-wrapped challenger message
      const challengerSystemNote = [
        `You are ${challengerName}. ${challengerPersonality}`,
        `The student is working on "${stage?.title || 'this stage'}" in the world of "${setting}".`,
        'Challenge their thinking on their recent work. Push them to go deeper.',
        'Stay in character. One direct, challenging question. 2-3 sentences max.',
      ].join('\n');

      // Use the devilsAdvocate response directly (it's already a challenge)
      const cleanChallenge = stripAssessment(challengeResponse);

      // Persist challenger message
      await guideMessages.add({
        questId: quest.id,
        stageId: stage.id,
        studentId: studentSession?.studentId || null,
        studentName: studentSession?.studentName || 'Student',
        role: 'assistant',
        content: cleanChallenge,
        messageType: 'devil_advocate',
      });

      setMessages(prev => [...prev, {
        role: 'challenger',
        content: cleanChallenge,
        timestamp: new Date().toISOString(),
      }]);
    } catch (err) {
      console.error('Challenger trigger error:', err);
      // Fallback challenge
      const fallback = `Hold on. Are you sure about that? I think you're skating on the surface here. What evidence do you actually have?`;
      setMessages(prev => [...prev, {
        role: 'challenger',
        content: fallback,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  }, [challengerName, challengerPersonality, stage, setting, quest, studentSession]);

  // ===================== FILE UPLOAD (Task 11) =====================

  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 50MB
    if (file.size > 52428800) {
      alert('File is too large. Maximum size is 50MB.');
      return;
    }

    setAttachedFile(file);
  }, []);

  const handleCameraCapture = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 52428800) {
      alert('File is too large. Maximum size is 50MB.');
      return;
    }
    setAttachedFile(file);
    setAttachMenuOpen(false);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        setAttachedFile(file);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setAttachMenuOpen(false);
    } catch (err) {
      alert('Could not access microphone. Please allow microphone access and try again.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  const uploadFile = useCallback(async (file) => {
    const ext = file.name.split('.').pop() || 'bin';
    const timestamp = Date.now();
    const safeName = (studentSession?.studentName || 'student').replace(/[^a-zA-Z0-9]/g, '_');
    const path = `${quest.id}/${stage.id}/${safeName}/${timestamp}.${ext}`;

    const { data, error } = await supabase.storage
      .from('student-submissions')
      .upload(path, file, { contentType: file.type });

    if (error) {
      console.error('File upload error:', error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('student-submissions')
      .getPublicUrl(path);

    return {
      url: urlData?.publicUrl || '',
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    };
  }, [quest?.id, stage?.id, studentSession?.studentName]);

  // ===================== SUBMISSION FLOW (Task 11) =====================

  const handlePresentWork = useCallback(() => {
    setSubmissionMode(true);
    // Mentor prompts for the work
    const promptMsg = {
      role: 'mentor',
      content: `Show me what you've found at ${locationName}. Take your time and share your work when you're ready.`,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, promptMsg]);

    // Persist the prompt
    guideMessages.add({
      questId: quest.id,
      stageId: stage.id,
      studentId: studentSession?.studentId || null,
      studentName: studentSession?.studentName || 'Student',
      role: 'assistant',
      content: promptMsg.content,
      messageType: 'field_guide',
    }).catch(err => console.error('Persist prompt error:', err));

    setTimeout(() => inputRef.current?.focus(), 100);
  }, [locationName, quest, stage, studentSession]);

  const handleSubmitWork = useCallback(async () => {
    const trimmed = input.trim();
    if ((!trimmed && !attachedFile) || submitting) return;

    setSubmitting(true);
    setSending(true);

    let fileInfo = null;
    let submissionContent = trimmed;

    try {
      // Upload file if attached
      if (attachedFile) {
        fileInfo = await uploadFile(attachedFile);
        submissionContent = trimmed
          ? `${trimmed}\n\n[Attached file: ${fileInfo.fileName}](${fileInfo.url})`
          : `[Attached file: ${fileInfo.fileName}](${fileInfo.url})`;
      }

      // Add student message to chat
      const studentMsg = {
        role: 'student',
        content: submissionContent,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, studentMsg]);
      setInput('');
      setAttachedFile(null);

      // Persist student submission message
      await guideMessages.add({
        questId: quest.id,
        stageId: stage.id,
        studentId: studentSession?.studentId || null,
        studentName: studentSession?.studentName || 'Student',
        role: 'user',
        content: submissionContent,
        messageType: 'field_guide',
      });

      // Save to stage_submissions via RPC
      await supabase.rpc('submit_stage_work', {
        p_quest_id: quest.id,
        p_stage_id: stage.id,
        p_student_name: studentSession?.studentName || 'Student',
        p_submission_type: fileInfo ? 'file' : 'text',
        p_content: trimmed || null,
        p_file_url: fileInfo?.url || null,
        p_file_name: fileInfo?.fileName || null,
        p_file_size: fileInfo?.fileSize || null,
        p_mime_type: fileInfo?.mimeType || null,
      });

      // Call AI to review the submission
      const review = await ai.reviewSubmission({
        stageTitle: stage?.title || '',
        stageDescription: stage?.description || '',
        deliverable: stage?.deliverable || stage?.deliverable_description || '',
        submissionContent: submissionContent,
        studentProfile: {
          name: studentSession?.studentName,
          interests: studentSession?.interests || [],
          passions: studentSession?.passions || [],
        },
      });

      const score = review?.score || 0;
      const mastery = review?.mastery_passed || score >= 35;

      // Save feedback to submission_feedback table
      await submissionFeedback.add({
        questId: quest.id,
        stageId: stage.id,
        studentName: studentSession?.studentName || 'Student',
        feedbackText: review?.feedback || '',
        skillsDemonstrated: review?.skills_demonstrated || review?.skill_ratings?.map(s => s.skill_name) || [],
        encouragement: review?.encouragement || '',
        nextSteps: review?.next_steps || '',
        score: score,
        hints: review?.hints || '',
      }).catch(err => console.error('Save feedback error:', err));

      // Build in-character mentor response based on score
      let mentorFeedback;
      if (mastery) {
        mentorFeedback = `${review?.feedback || 'Impressive work.'}\n\n${review?.encouragement || 'You have truly earned your passage.'} You've proven yourself at ${locationName}.`;
      } else {
        mentorFeedback = `${review?.feedback || 'I see promise in this.'}\n\n${review?.hints || 'Dig deeper.'} ${review?.next_steps || 'What else might you discover here?'}`;
      }

      // Persist mentor feedback
      await guideMessages.add({
        questId: quest.id,
        stageId: stage.id,
        studentId: studentSession?.studentId || null,
        studentName: studentSession?.studentName || 'Student',
        role: 'assistant',
        content: mentorFeedback,
        messageType: 'field_guide',
      });

      setMessages(prev => [...prev, {
        role: 'mentor',
        content: mentorFeedback,
        timestamp: new Date().toISOString(),
        feedbackScore: score,
      }]);

      mentorExchangeCount.current += 1;

      if (mastery) {
        setSubmissionMode(false);
        // Small delay so student sees the feedback before stage completes
        setTimeout(() => {
          if (onStageComplete) onStageComplete();
        }, 2000);
      } else {
        // Check if challenger should appear for short submission
        if (submissionContent.length < 100) {
          setTimeout(() => triggerChallenger(submissionContent), 1500);
        }
      }
    } catch (err) {
      console.error('Submission error:', err);
      setMessages(prev => [...prev, {
        role: 'mentor',
        content: "I couldn't fully assess your work right now. Try presenting it again in a moment.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setSubmitting(false);
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, attachedFile, submitting, quest, stage, studentSession, locationName, uploadFile, onStageComplete, triggerChallenger]);

  // ===================== SEND MESSAGE =====================

  const handleSend = useCallback(async () => {
    // If in submission mode, route to submission handler
    if (submissionMode) {
      handleSubmitWork();
      return;
    }

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
        messageType: challengerActive ? 'devil_advocate' : 'field_guide',
      });

      // If challenger was active and student responded, return to mentor
      if (challengerActive) {
        setChallengerActive(false);
        setChallengerResponded(true);

        // Mentor returns with an encouraging message
        const returnMsg = `Well said. ${challengerName} will test you again, but for now, let's continue. Where were we?`;

        await guideMessages.add({
          questId: quest.id,
          stageId: stage.id,
          studentId: studentSession?.studentId || null,
          studentName: studentSession?.studentName || 'Student',
          role: 'assistant',
          content: returnMsg,
          messageType: 'field_guide',
        });

        mentorExchangeCount.current += 1;

        setMessages(prev => [...prev, {
          role: 'mentor',
          content: returnMsg,
          timestamp: new Date().toISOString(),
        }]);

        setSending(false);
        setTimeout(() => inputRef.current?.focus(), 100);
        return;
      }

      // Build conversation history for AI
      const aiMessages = messages.concat(studentMsg).map(m => ({
        role: (m.role === 'mentor' || m.role === 'challenger') ? 'assistant' : 'user',
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
        messageType: 'field_guide',
      });

      mentorExchangeCount.current += 1;

      setMessages(prev => [...prev, {
        role: 'mentor',
        content: cleanResponse,
        timestamp: new Date().toISOString(),
      }]);

      // Check if challenger should trigger after this exchange
      if (shouldTriggerChallenger(trimmed)) {
        setTimeout(() => triggerChallenger(trimmed), 1500);
      }
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
  }, [input, sending, messages, quest, stage, studentSession, buildSystemPrompt, challengerActive, challengerName, submissionMode, handleSubmitWork, shouldTriggerChallenger, triggerChallenger]);

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Detect mobile (simple heuristic)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Header display — changes for challenger mode
  const headerName = challengerActive ? challengerName : mentorName;
  const headerRole = challengerActive ? 'Challenger' : mentorRole;
  const headerColor = challengerActive ? CHALLENGER_COLOR : (accentColor || 'var(--world-accent, #4ecdc4)');

  // Placeholder text
  const placeholderText = sending
    ? `${challengerActive ? challengerName : mentorName} is thinking...`
    : challengerActive
      ? `Respond to ${challengerName}...`
      : submissionMode
        ? 'Describe your work...'
        : `Talk to ${mentorName}...`;

  const sendDisabled = sending || submitting || (!input.trim() && !attachedFile);

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
        @keyframes world-chat-challenger-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(231,76,60,0.3); }
          50% { box-shadow: 0 0 12px 4px rgba(231,76,60,0.15); }
        }
      `}</style>

      <div style={{
        position: 'fixed',
        zIndex: 20,
        ...(isMobile ? {
          bottom: 0, left: 0, right: 0,
          height: 'calc(100vh - 60px)',
          borderRadius: '16px 16px 0 0',
        } : {
          top: 0, right: 0, bottom: 0,
          width: 380,
          borderRadius: '16px 0 0 16px',
        }),
        background: 'rgba(15,15,30,0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: challengerActive
          ? '1px solid rgba(231,76,60,0.25)'
          : '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'world-chat-slide-in 300ms ease-out',
        overflow: 'hidden',
        ...(challengerActive ? { animation: 'world-chat-slide-in 300ms ease-out, world-chat-challenger-pulse 2s ease-in-out infinite' } : {}),
      }}>
        {/* Mobile drag handle */}
        {isMobile && (
          <div style={{
            display: 'flex', justifyContent: 'center',
            padding: '10px 0 4px',
            cursor: 'grab',
          }}>
            <div style={{
              width: 40, height: 5, borderRadius: 3,
              background: 'rgba(255,255,255,0.25)',
            }} />
          </div>
        )}

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: challengerActive
            ? '1px solid rgba(231,76,60,0.2)'
            : '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
          transition: 'border-color 300ms',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              color: challengerActive ? CHALLENGER_COLOR : 'var(--world-text, #f0f0f0)',
              transition: 'color 300ms',
            }}>
              {headerName}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 8,
              background: challengerActive
                ? 'rgba(231,76,60,0.15)'
                : (accentColor ? `${accentColor}20` : 'rgba(78,205,196,0.12)'),
              color: headerColor,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 600,
              transition: 'background 300ms, color 300ms',
            }}>
              {headerRole}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none',
              color: 'var(--world-text-muted, rgba(240,240,240,0.6))',
              cursor: 'pointer',
              padding: isMobile ? 10 : 4,
              minWidth: isMobile ? 44 : 'auto',
              minHeight: isMobile ? 44 : 'auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
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
              challengerName={challengerName}
              accentColor={accentColor}
            />
          ))}

          {(sending || submitting) && (
            <TypingIndicator accentColor={challengerActive ? CHALLENGER_COLOR : accentColor} />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Present your work button — shows when stage is active + not already in submission mode */}
        {!stageCompleted && !submissionMode && !challengerActive && (
          <div style={{
            padding: '0 14px 8px',
            flexShrink: 0,
          }}>
            <button
              onClick={handlePresentWork}
              disabled={sending}
              style={{
                width: '100%',
                padding: isMobile ? '12px 16px' : '10px 16px',
                minHeight: isMobile ? 44 : 'auto',
                borderRadius: 10,
                border: `1px solid ${accentColor ? accentColor + '33' : 'rgba(78,205,196,0.2)'}`,
                background: 'rgba(255,255,255,0.04)',
                color: accentColor || 'var(--world-accent, #4ecdc4)',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 600,
                cursor: sending ? 'default' : 'pointer',
                opacity: sending ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'background 200ms, opacity 200ms',
              }}
              onMouseEnter={e => { if (!sending) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            >
              <Award size={15} />
              Present your work
            </button>
          </div>
        )}

        {/* Input area */}
        <div style={{
          padding: isMobile ? '12px 14px 16px' : '12px 14px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}>
          {/* Attached file indicator */}
          {attachedFile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 10px',
              marginBottom: 8,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              color: 'var(--world-text-muted, rgba(240,240,240,0.6))',
            }}>
              {attachedFile.type?.startsWith('audio') ? <Mic size={12} />
                : attachedFile.type?.startsWith('image') || attachedFile.type?.startsWith('video') ? <Camera size={12} />
                : <FileUp size={12} />}
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {attachedFile.type?.startsWith('audio') ? 'Voice recording' : attachedFile.name}
              </span>
              <button
                onClick={() => setAttachedFile(null)}
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--world-text-muted, rgba(240,240,240,0.6))',
                  cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center',
                }}
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.txt,.pptx,.xlsx"
          />
          <input
            ref={cameraInputRef}
            type="file"
            style={{ display: 'none' }}
            accept="image/*,video/*"
            capture="environment"
            onChange={handleCameraCapture}
          />

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            {/* + button with attachment menu */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {recording ? (
                <button
                  onClick={stopRecording}
                  title="Stop recording"
                  style={{
                    width: isMobile ? 44 : 36, height: isMobile ? 44 : 36,
                    borderRadius: 8,
                    border: '1px solid rgba(231,76,60,0.4)',
                    background: 'rgba(231,76,60,0.15)',
                    color: '#e74c3c',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'world-chat-dot 1.4s ease-in-out infinite',
                  }}
                >
                  <Square size={14} fill="#e74c3c" />
                </button>
              ) : (
                <button
                  onClick={() => setAttachMenuOpen(prev => !prev)}
                  disabled={sending || submitting}
                  title="Add attachment"
                  style={{
                    width: isMobile ? 44 : 36, height: isMobile ? 44 : 36,
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: attachMenuOpen ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                    color: attachMenuOpen
                      ? 'var(--world-text, #f0f0f0)'
                      : 'var(--world-text-muted, rgba(240,240,240,0.5))',
                    cursor: (sending || submitting) ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 200ms, color 200ms, transform 200ms',
                    transform: attachMenuOpen ? 'rotate(45deg)' : 'none',
                  }}
                >
                  <Plus size={17} />
                </button>
              )}

              {/* Popover menu */}
              {attachMenuOpen && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  marginBottom: 6,
                  background: 'rgba(20,20,30,0.95)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  padding: '4px 0',
                  minWidth: 170,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(12px)',
                  zIndex: 100,
                }}>
                  {[
                    {
                      icon: <FileUp size={15} />,
                      label: 'Upload file',
                      onClick: () => { fileInputRef.current?.click(); setAttachMenuOpen(false); },
                    },
                    {
                      icon: <Camera size={15} />,
                      label: 'Photo or video',
                      onClick: () => { cameraInputRef.current?.click(); setAttachMenuOpen(false); },
                    },
                    {
                      icon: <Mic size={15} />,
                      label: 'Record audio',
                      onClick: () => startRecording(),
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={item.onClick}
                      style={{
                        width: '100%',
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--world-text, #f0f0f0)',
                        fontFamily: 'var(--font-body)',
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'background 150ms',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ color: 'var(--world-text-muted, rgba(240,240,240,0.6))', display: 'flex' }}>
                        {item.icon}
                      </span>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholderText}
              disabled={sending || submitting}
              rows={submissionMode ? 3 : 1}
              style={{
                flex: 1,
                padding: isMobile ? '12px 14px' : '10px 14px',
                minHeight: isMobile ? 44 : 'auto',
                borderRadius: 12,
                border: challengerActive
                  ? '1px solid rgba(231,76,60,0.25)'
                  : '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--world-text, #f0f0f0)',
                fontFamily: 'var(--font-body)',
                fontSize: isMobile ? 16 : 14,
                lineHeight: 1.4,
                resize: 'none',
                outline: 'none',
                maxHeight: submissionMode ? 160 : 100,
                transition: 'border-color 200ms',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = challengerActive
                ? CHALLENGER_COLOR
                : (accentColor || 'var(--world-accent, #4ecdc4)')}
              onBlur={e => e.target.style.borderColor = challengerActive
                ? 'rgba(231,76,60,0.25)'
                : 'rgba(255,255,255,0.1)'}
            />
            <button
              onClick={handleSend}
              disabled={sendDisabled}
              style={{
                width: isMobile ? 44 : 40, height: isMobile ? 44 : 40,
                borderRadius: 10,
                border: 'none',
                background: sendDisabled
                  ? 'rgba(255,255,255,0.08)'
                  : challengerActive
                    ? CHALLENGER_COLOR
                    : (accentColor || 'var(--world-accent, #4ecdc4)'),
                color: sendDisabled
                  ? 'rgba(255,255,255,0.3)'
                  : '#111',
                cursor: sendDisabled ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 200ms, opacity 200ms',
              }}
              onMouseEnter={e => { if (!sendDisabled) e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
