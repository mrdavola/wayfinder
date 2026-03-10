/**
 * ExploreSkillPage.jsx
 * Student-facing skill tree exploration page.
 * Route: /student/explore/:explorationId
 *
 * Left: SVG tree with nodes + edges
 * Right: 380px detail panel (or full-width overlay on mobile)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Lock, Check, Play, BookOpen, Target,
  Send, Loader2, Award, ChevronRight, X, Sparkles,
} from 'lucide-react';
import { explorations, ai, skills as skillsApi, skillSnapshots, xp, tokens, ST_VALUES, badgesApi, inventory } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { getStudentSession } from '../../lib/studentSession';
import ScoreCard, { MASTERY_THRESHOLD } from '../../components/ui/ScoreCard';
import WayfinderLogoIcon from '../../components/icons/WayfinderLogo';

/* ── design tokens ─────────────────────────────────────────────────────── */
const T = {
  ink: '#1A1A2E',
  paper: '#FAF8F5',
  parchment: '#F0EDE6',
  graphite: '#6B7280',
  pencil: '#9CA3AF',
  chalk: '#FFFFFF',
  fieldGreen: '#2D6A4F',
  compassGold: '#B8860B',
  labBlue: '#1B4965',
  specimenRed: '#C0392B',
};

/* ── simple markdown renderer ──────────────────────────────────────────── */
function SimpleMarkdown({ text }) {
  if (!text) return null;
  const paragraphs = text.split(/\n\n+/);
  return (
    <div>
      {paragraphs.map((p, i) => {
        // Bold: **text**
        const parts = p.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j}>{part.slice(2, -2)}</strong>;
          }
          // Handle single newlines as <br>
          return part.split('\n').map((line, k, arr) => (
            <span key={`${j}-${k}`}>
              {line}
              {k < arr.length - 1 && <br />}
            </span>
          ));
        });
        // Detect if it's a heading (starts with #)
        const trimmed = p.trim();
        if (trimmed.startsWith('### ')) {
          return <h4 key={i} style={{ fontSize: 15, fontWeight: 600, color: T.ink, margin: '16px 0 8px' }}>{trimmed.slice(4)}</h4>;
        }
        if (trimmed.startsWith('## ')) {
          return <h3 key={i} style={{ fontSize: 17, fontWeight: 700, color: T.ink, margin: '20px 0 8px', fontFamily: 'var(--font-display)' }}>{trimmed.slice(3)}</h3>;
        }
        if (trimmed.startsWith('# ')) {
          return <h2 key={i} style={{ fontSize: 20, fontWeight: 700, color: T.ink, margin: '24px 0 8px', fontFamily: 'var(--font-display)' }}>{trimmed.slice(2)}</h2>;
        }
        return (
          <p key={i} style={{ fontSize: 14, lineHeight: 1.7, color: T.graphite, marginBottom: 12 }}>
            {rendered}
          </p>
        );
      })}
    </div>
  );
}

/* ── YouTube URL → embed URL ───────────────────────────────────────────── */
function toEmbedUrl(url) {
  if (!url) return null;
  let videoId = null;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      videoId = u.searchParams.get('v');
    } else if (u.hostname === 'youtu.be') {
      videoId = u.pathname.slice(1);
    }
  } catch {
    return null;
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

/* ── node status helpers ───────────────────────────────────────────────── */
const NODE_RADIUS = 28;
const NODE_COLORS = {
  completed: T.fieldGreen,
  active: T.compassGold,
  locked: T.pencil,
};

/* ── main component ────────────────────────────────────────────────────── */
export default function ExploreSkillPage() {
  const { explorationId } = useParams();
  const navigate = useNavigate();
  const session = getStudentSession();

  const [exploration, setExploration] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Panel state
  const [submissionText, setSubmissionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [treeCompleted, setTreeCompleted] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const panelRef = useRef(null);

  /* ── responsive ──────────────────────────────────────────────────────── */
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  /* ── load exploration data ───────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await explorations.get(explorationId);
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setExploration(data);
    const sortedNodes = (data.exploration_nodes || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    setNodes(sortedNodes);
    setLoading(false);
  }, [explorationId]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── derived data ────────────────────────────────────────────────────── */
  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);
  const completedCount = useMemo(() => nodes.filter(n => n.status === 'completed' && n.node_type !== 'root').length, [nodes]);
  const totalCount = useMemo(() => nodes.filter(n => n.node_type !== 'root').length, [nodes]);

  /* ── select a node ───────────────────────────────────────────────────── */
  const handleSelectNode = useCallback((node) => {
    setSelectedNodeId(node.id);
    setSubmissionText(node.submission_text || '');
    setFeedback(node.score != null ? {
      score: node.score,
      feedback: node.score_feedback,
      mastery_passed: node.score >= MASTERY_THRESHOLD,
      attempt_number: node.attempt_number || 1,
    } : null);
  }, []);

  /* ── submit for scoring ──────────────────────────────────────────────── */
  const handleSubmit = useCallback(async () => {
    if (!selectedNode || !submissionText.trim()) return;
    setSubmitting(true);
    try {
      const result = await ai.reviewSubmission({
        stageTitle: selectedNode.title,
        stageDescription: selectedNode.description,
        deliverable: selectedNode.action_item,
        submissionContent: submissionText,
        studentProfile: session ? { name: session.studentName } : undefined,
      });

      const attemptNum = (selectedNode.attempt_number || 0) + 1;
      const nodeUpdate = {
        submission_text: submissionText,
        score: result.score,
        score_feedback: result.feedback,
        attempt_number: attemptNum,
      };

      await explorations.updateNode(selectedNode.id, nodeUpdate);

      // Update local state
      setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, ...nodeUpdate } : n));
      setFeedback({ ...result, attempt_number: attemptNum });
    } catch (err) {
      console.error('Submission error:', err);
    } finally {
      setSubmitting(false);
    }
  }, [selectedNode, submissionText, session]);

  /* ── resubmit (try again) ────────────────────────────────────────────── */
  const handleResubmit = useCallback(() => {
    setSubmissionText('');
    setFeedback(null);
  }, []);

  /* ── mark node complete ──────────────────────────────────────────────── */
  const handleCompleteNode = useCallback(async () => {
    if (!selectedNode) return;
    setCompleting(true);
    try {
      // 1. Mark this node completed
      await explorations.updateNode(selectedNode.id, { status: 'completed' });

      // 2. Find children and check if they can be unlocked
      const childNodes = nodes.filter(n => n.parent_node_id === selectedNode.id);
      const updatedNodes = nodes.map(n => n.id === selectedNode.id ? { ...n, status: 'completed' } : n);

      for (const child of childNodes) {
        // Check if ALL parent nodes of this child are completed
        // A child may have multiple logical parents in complex trees —
        // but our schema uses a single parent_node_id, so just check that
        const parentCompleted = updatedNodes.find(n => n.id === child.parent_node_id)?.status === 'completed';
        if (parentCompleted && child.status === 'locked') {
          await explorations.updateNode(child.id, { status: 'active' });
          const idx = updatedNodes.findIndex(n => n.id === child.id);
          if (idx >= 0) updatedNodes[idx] = { ...updatedNodes[idx], status: 'active' };
        }
      }

      setNodes(updatedNodes);

      // Award EP + ST for skill node completion
      if (session?.studentId) {
        supabase.rpc('award_xp', {
          p_student_id: session.studentId,
          p_event_type: 'skill_node',
          p_points: 30,
        }).catch(console.error);
        tokens.award(session.studentId, ST_VALUES.skill_node, 'earn_skill_node', `Completed skill node: ${selectedNode.title || selectedNode.label}`).catch(console.error);
      }

      // 3. Check if all non-root nodes are completed
      const allDone = updatedNodes
        .filter(n => n.node_type !== 'root')
        .every(n => n.status === 'completed');

      if (allDone) {
        await handleTreeCompletion(updatedNodes);
      }

      setSelectedNodeId(null);
    } catch (err) {
      console.error('Complete node error:', err);
    } finally {
      setCompleting(false);
    }
  }, [selectedNode, nodes]);

  /* ── tree completion ─────────────────────────────────────────────────── */
  const handleTreeCompletion = useCallback(async (allNodes) => {
    setTreeCompleted(true);

    // Mark exploration as completed
    await explorations.complete(explorationId);

    // Award EP + ST for skill tree completion
    if (session?.studentId) {
      supabase.rpc('award_xp', {
        p_student_id: session.studentId,
        p_event_type: 'skill_tree',
        p_points: 100,
      }).catch(console.error);
      tokens.award(session.studentId, ST_VALUES.skill_tree, 'earn_skill_tree', 'Completed skill tree').catch(console.error);

      // Check for badges and milestone unlocks
      const newBadges = await badgesApi.checkAndAward(session.studentId);
      if (newBadges?.length > 0) {
        for (const badge of newBadges) {
          tokens.award(session.studentId, ST_VALUES.badge_earned, 'earn_badge', `Earned badge: ${badge.name || badge.slug}`).catch(console.error);
        }
      }
    }

    if (!session?.studentId || !exploration?.skill_id) return;

    try {
      // Gather evidence from all completed nodes
      const evidence = allNodes
        .filter(n => n.node_type !== 'root' && n.submission_text)
        .map(n => ({ title: n.title, submission: n.submission_text, score: n.score }));

      const skillsDemonstrated = allNodes
        .filter(n => n.score_feedback)
        .map(n => n.title);

      // Get current student skills
      const { data: currentSkills } = await skillsApi.getStudentSkills(session.studentId);

      // Assess mastery
      const mastery = await ai.assessMastery({
        stageTitle: exploration.skill_name || 'Skill Exploration',
        submissionContent: evidence.map(e => `${e.title}: ${e.submission}`).join('\n\n'),
        skillsDemonstrated,
        studentSkills: currentSkills || [],
        score: Math.round(evidence.reduce((sum, e) => sum + (e.score || 0), 0) / Math.max(evidence.length, 1)),
      });

      // Update student skills
      if (mastery?.updates?.length) {
        for (const update of mastery.updates) {
          // Try to find the skill_id from current skills
          const existing = (currentSkills || []).find(s => s.skill_name === update.skill_name);
          if (existing?.skill_id) {
            await skillsApi.upsertStudentSkill({
              studentId: session.studentId,
              skillId: existing.skill_id,
              proficiency: update.new_proficiency,
              source: 'exploration',
            });
            await skillSnapshots.add({
              studentId: session.studentId,
              skillId: existing.skill_id,
              proficiency: update.new_proficiency,
              source: 'exploration',
            });
          }
        }
      }

      // Also update the exploration's skill directly if we have it
      if (exploration.skill_id) {
        await skillsApi.upsertStudentSkill({
          studentId: session.studentId,
          skillId: exploration.skill_id,
          proficiency: 'proficient',
          source: 'exploration',
        });
        await skillSnapshots.add({
          studentId: session.studentId,
          skillId: exploration.skill_id,
          proficiency: 'proficient',
          source: 'exploration',
        });
      }
    } catch (err) {
      console.error('Mastery assessment error:', err);
    }
  }, [explorationId, exploration, session]);

  /* ── SVG tree computation ────────────────────────────────────────────── */
  const { edges, svgWidth, svgHeight } = useMemo(() => {
    if (!nodes.length) return { edges: [], svgWidth: 600, svgHeight: 400 };

    const xs = nodes.map(n => n.x || 0);
    const ys = nodes.map(n => n.y || 0);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const pad = 80;
    const w = Math.max(maxX - minX + pad * 2, 400);
    const h = Math.max(maxY - minY + pad * 2, 300);

    const edgeList = nodes
      .filter(n => n.parent_node_id)
      .map(n => {
        const parent = nodes.find(p => p.id === n.parent_node_id);
        if (!parent) return null;
        return { from: parent, to: n };
      })
      .filter(Boolean);

    return { edges: edgeList, svgWidth: w, svgHeight: h };
  }, [nodes]);

  /* ── loading / error states ──────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: T.paper }}>
        <Loader2 size={32} color={T.compassGold} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: T.paper, gap: 16, padding: 24 }}>
        <p style={{ color: T.specimenRed, fontSize: 15 }}>Failed to load exploration: {error}</p>
        <button onClick={() => navigate('/student')} style={S.backBtn}>Back to Home</button>
      </div>
    );
  }

  const panelOpen = selectedNodeId != null;

  return (
    <div style={{ minHeight: '100vh', background: T.paper, fontFamily: 'var(--font-body)' }}>
      {/* ── keyframe animations ─────────────────────────────────────────── */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { filter: drop-shadow(0 0 4px ${T.compassGold}40); }
          50% { filter: drop-shadow(0 0 12px ${T.compassGold}80); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes confetti-pop {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={S.header}>
        <button onClick={() => navigate('/student')} style={S.backBtn}>
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </button>

        <div style={S.headerCenter}>
          <WayfinderLogoIcon size={20} color={T.labBlue} />
          <span style={S.headerTitle}>
            Exploring: {exploration?.skill_name || 'Skill Tree'}
          </span>
        </div>

        <div style={S.headerRight}>
          <span style={S.progressBadge}>
            {completedCount}/{totalCount} nodes
          </span>
          <div style={S.progressBarTrack}>
            <div style={{ ...S.progressBarFill, width: totalCount ? `${(completedCount / totalCount) * 100}%` : '0%' }} />
          </div>
        </div>
      </header>

      {/* ── Tree Completed Celebration ─────────────────────────────────── */}
      {treeCompleted && (
        <div style={S.celebration}>
          <div style={S.celebrationCard}>
            <Award size={48} color={T.compassGold} style={{ animation: 'confetti-pop 0.5s ease' }} />
            <h2 style={S.celebrationTitle}>Exploration Complete!</h2>
            <p style={S.celebrationText}>
              You have completed all nodes in this skill tree. Your skills have been updated.
            </p>
            <button
              onClick={() => navigate('/student')}
              style={S.celebrationBtn}
            >
              Back to Home
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Main Layout ────────────────────────────────────────────────── */}
      <div style={S.mainLayout}>
        {/* ── SVG Tree View ────────────────────────────────────────────── */}
        <div style={{ ...S.treeContainer, flex: panelOpen && !isMobile ? '1 1 0' : '1 1 100%' }}>
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{ width: '100%', height: '100%', minHeight: 400 }}
          >
            {/* Edges */}
            {edges.map((e, i) => (
              <line
                key={i}
                x1={e.from.x}
                y1={e.from.y}
                x2={e.to.x}
                y2={e.to.y}
                stroke={e.to.status === 'completed' ? T.fieldGreen : e.to.status === 'active' ? T.compassGold : '#D1D5DB'}
                strokeWidth={2.5}
                strokeDasharray={e.to.status === 'locked' ? '6,4' : 'none'}
                opacity={e.to.status === 'locked' ? 0.4 : 0.7}
              />
            ))}

            {/* Nodes */}
            {nodes.map(node => {
              const color = NODE_COLORS[node.status] || T.pencil;
              const isSelected = node.id === selectedNodeId;
              const isActive = node.status === 'active';
              const isCompleted = node.status === 'completed';
              const isLocked = node.status === 'locked';

              return (
                <g
                  key={node.id}
                  onClick={() => handleSelectNode(node)}
                  style={{ cursor: 'pointer' }}
                  {...(isActive ? { style: { cursor: 'pointer', animation: 'pulse-glow 2s ease-in-out infinite' } } : {})}
                >
                  {/* Selection ring */}
                  {isSelected && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={NODE_RADIUS + 6}
                      fill="none"
                      stroke={T.labBlue}
                      strokeWidth={2}
                      strokeDasharray="4,3"
                    />
                  )}

                  {/* Node circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={NODE_RADIUS}
                    fill={isCompleted ? color : isActive ? T.chalk : '#F3F4F6'}
                    stroke={color}
                    strokeWidth={isSelected ? 3 : 2}
                    opacity={isLocked ? 0.5 : 1}
                  />

                  {/* Icon */}
                  {isCompleted && (
                    <Check
                      x={node.x - 10}
                      y={node.y - 10}
                      size={20}
                      color={T.chalk}
                    />
                  )}
                  {isActive && (
                    <Play
                      x={node.x - 8}
                      y={node.y - 8}
                      size={16}
                      color={T.compassGold}
                      fill={T.compassGold}
                    />
                  )}
                  {isLocked && (
                    <Lock
                      x={node.x - 8}
                      y={node.y - 8}
                      size={16}
                      color={T.pencil}
                    />
                  )}

                  {/* Label */}
                  <text
                    x={node.x}
                    y={node.y + NODE_RADIUS + 16}
                    textAnchor="middle"
                    fontSize={12}
                    fontFamily="var(--font-body)"
                    fontWeight={isSelected ? 600 : 500}
                    fill={isLocked ? T.pencil : T.ink}
                    opacity={isLocked ? 0.6 : 1}
                  >
                    {node.title?.length > 20 ? node.title.slice(0, 18) + '...' : node.title}
                  </text>

                  {/* Score badge */}
                  {node.score != null && (
                    <>
                      <circle
                        cx={node.x + NODE_RADIUS - 4}
                        cy={node.y - NODE_RADIUS + 4}
                        r={12}
                        fill={node.score >= MASTERY_THRESHOLD ? T.fieldGreen : T.compassGold}
                      />
                      <text
                        x={node.x + NODE_RADIUS - 4}
                        y={node.y - NODE_RADIUS + 8}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={700}
                        fontFamily="var(--font-mono)"
                        fill={T.chalk}
                      >
                        {node.score}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* ── Detail Panel ─────────────────────────────────────────────── */}
        {panelOpen && selectedNode && (
          isMobile ? (
            /* Mobile: full-width overlay */
            <div style={S.mobileOverlay}>
              <div style={S.mobilePanel} ref={panelRef}>
                <NodeDetailPanel
                  node={selectedNode}
                  submissionText={submissionText}
                  setSubmissionText={setSubmissionText}
                  submitting={submitting}
                  feedback={feedback}
                  completing={completing}
                  onSubmit={handleSubmit}
                  onResubmit={handleResubmit}
                  onComplete={handleCompleteNode}
                  onClose={() => setSelectedNodeId(null)}
                  isMobile
                />
              </div>
            </div>
          ) : (
            /* Desktop: side panel */
            <div style={S.panel} ref={panelRef}>
              <NodeDetailPanel
                node={selectedNode}
                submissionText={submissionText}
                setSubmissionText={setSubmissionText}
                submitting={submitting}
                feedback={feedback}
                completing={completing}
                onSubmit={handleSubmit}
                onResubmit={handleResubmit}
                onComplete={handleCompleteNode}
                onClose={() => setSelectedNodeId(null)}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   NodeDetailPanel — renders inside the side panel or mobile overlay
   ═══════════════════════════════════════════════════════════════════════════ */
function NodeDetailPanel({
  node, submissionText, setSubmissionText,
  submitting, feedback, completing,
  onSubmit, onResubmit, onComplete, onClose, isMobile,
}) {
  const embedUrl = toEmbedUrl(node.video_url);
  const canComplete = feedback?.mastery_passed && node.status !== 'completed';
  const isCompleted = node.status === 'completed';
  const isLocked = node.status === 'locked';

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      {/* Close / title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: node.node_type === 'challenge' ? T.specimenRed : T.labBlue,
              fontFamily: 'var(--font-mono)',
            }}>
              {node.node_type === 'challenge' ? 'Challenge' : node.node_type === 'root' ? 'Root' : 'Skill'}
            </span>
            {isCompleted && (
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                background: `${T.fieldGreen}15`,
                color: T.fieldGreen,
                padding: '2px 8px',
                borderRadius: 999,
              }}>
                Completed
              </span>
            )}
            {isLocked && (
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                background: T.parchment,
                color: T.pencil,
                padding: '2px 8px',
                borderRadius: 999,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <Lock size={10} /> Preview
              </span>
            )}
          </div>
          <h2 style={{
            fontSize: 20,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            color: T.ink,
            lineHeight: 1.3,
          }}>
            {node.title}
          </h2>
        </div>
        <button onClick={onClose} style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 4,
          color: T.graphite,
          flexShrink: 0,
          marginLeft: 8,
        }}>
          <X size={20} />
        </button>
      </div>

      {/* Description */}
      {node.description && (
        <p style={{ fontSize: 14, lineHeight: 1.6, color: T.graphite, marginBottom: 20 }}>
          {node.description}
        </p>
      )}

      {/* Video embed */}
      {embedUrl && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Play size={14} color={T.specimenRed} />
            <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>
              {node.video_title || 'Watch'}
            </span>
          </div>
          <div style={{
            position: 'relative',
            paddingBottom: '56.25%',
            borderRadius: 8,
            overflow: 'hidden',
            background: T.ink,
          }}>
            <iframe
              src={embedUrl}
              title={node.video_title || 'Video'}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* One-pager content */}
      {node.one_pager && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <BookOpen size={14} color={T.labBlue} />
            <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Reading</span>
          </div>
          <div style={{
            background: T.chalk,
            border: `1px solid ${T.parchment}`,
            borderRadius: 8,
            padding: 16,
          }}>
            <SimpleMarkdown text={node.one_pager} />
          </div>
        </div>
      )}

      {/* Resources */}
      {node.resources?.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 8 }}>Resources</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {node.resources.map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: T.parchment,
                  borderRadius: 6,
                  fontSize: 13,
                  color: T.labBlue,
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                <ChevronRight size={14} />
                {r.title || r.url}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Action item / Challenge card */}
      {node.action_item && (
        <div style={{
          marginBottom: 24,
          background: `${T.compassGold}08`,
          border: `1px solid ${T.compassGold}30`,
          borderRadius: 8,
          padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Target size={14} color={T.compassGold} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.compassGold, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Challenge
            </span>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: T.ink }}>
            {node.action_item}
          </p>
        </div>
      )}

      {/* Submission area (only for non-completed, non-locked active nodes with an action_item) */}
      {node.action_item && !isCompleted && !isLocked && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 8 }}>
            Your Response
          </div>
          <textarea
            value={submissionText}
            onChange={e => setSubmissionText(e.target.value)}
            placeholder="Write your response here..."
            disabled={submitting}
            style={{
              width: '100%',
              minHeight: 120,
              padding: 12,
              borderRadius: 8,
              border: `1px solid ${T.parchment}`,
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              lineHeight: 1.6,
              color: T.ink,
              background: T.chalk,
              resize: 'vertical',
              outline: 'none',
            }}
            onFocus={e => { e.target.style.borderColor = T.labBlue; }}
            onBlur={e => { e.target.style.borderColor = T.parchment; }}
          />
          {!feedback && (
            <button
              onClick={onSubmit}
              disabled={submitting || !submissionText.trim()}
              style={{
                marginTop: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 20px',
                background: submitting || !submissionText.trim() ? T.pencil : T.labBlue,
                color: T.chalk,
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'var(--font-body)',
                cursor: submitting || !submissionText.trim() ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s ease',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  Scoring...
                </>
              ) : (
                <>
                  <Send size={14} />
                  Submit
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* ScoreCard */}
      {feedback && (
        <div style={{ marginBottom: 24 }}>
          <ScoreCard
            feedback={feedback}
            onResubmit={!feedback.mastery_passed && !isCompleted ? onResubmit : undefined}
          />
        </div>
      )}

      {/* Completed node: show previous submission read-only */}
      {isCompleted && node.submission_text && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 8 }}>Your Submission</div>
          <div style={{
            padding: 12,
            background: T.parchment,
            borderRadius: 8,
            fontSize: 14,
            lineHeight: 1.6,
            color: T.graphite,
          }}>
            {node.submission_text}
          </div>
        </div>
      )}

      {/* Complete Node button */}
      {canComplete && (
        <button
          onClick={onComplete}
          disabled={completing}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '12px 24px',
            background: T.fieldGreen,
            color: T.chalk,
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            cursor: completing ? 'wait' : 'pointer',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={e => { if (!completing) e.currentTarget.style.background = '#245a42'; }}
          onMouseLeave={e => { e.currentTarget.style.background = T.fieldGreen; }}
        >
          {completing ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Completing...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Mark Complete
            </>
          )}
        </button>
      )}

      {/* No action_item, non-root, active node: just complete directly */}
      {!node.action_item && node.status === 'active' && !isLocked && node.node_type !== 'root' && (
        <button
          onClick={onComplete}
          disabled={completing}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '12px 24px',
            background: T.fieldGreen,
            color: T.chalk,
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            cursor: completing ? 'wait' : 'pointer',
          }}
        >
          {completing ? (
            <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Completing...</>
          ) : (
            <><Check size={16} /> Mark Complete</>
          )}
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════════════════════════════════ */
const S = {
  header: {
    height: 48,
    background: T.chalk,
    borderBottom: `1px solid ${T.pencil}30`,
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    gap: 16,
    fontFamily: 'var(--font-body)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    color: T.graphite,
    fontFamily: 'var(--font-body)',
    padding: '4px 0',
    flexShrink: 0,
  },
  headerCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: T.ink,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  progressBadge: {
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
    color: T.graphite,
    whiteSpace: 'nowrap',
  },
  progressBarTrack: {
    width: 80,
    height: 6,
    borderRadius: 3,
    background: T.parchment,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    background: T.fieldGreen,
    transition: 'width 0.4s ease',
  },

  mainLayout: {
    display: 'flex',
    height: 'calc(100vh - 48px)',
    overflow: 'hidden',
  },
  treeContainer: {
    overflow: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    transition: 'flex 0.3s ease',
  },

  panel: {
    width: 380,
    flexShrink: 0,
    background: T.chalk,
    borderLeft: `1px solid ${T.pencil}30`,
    overflowY: 'auto',
    animation: 'slide-in 0.25s ease',
  },

  mobileOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'flex-end',
    animation: 'fade-in 0.2s ease',
  },
  mobilePanel: {
    width: '100%',
    maxHeight: '70vh',
    background: T.chalk,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflowY: 'auto',
    animation: 'slide-in 0.3s ease',
  },

  celebration: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 300,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    animation: 'fade-in 0.3s ease',
  },
  celebrationCard: {
    background: T.chalk,
    borderRadius: 16,
    padding: 40,
    textAlign: 'center',
    maxWidth: 420,
    animation: 'confetti-pop 0.5s ease',
  },
  celebrationTitle: {
    fontSize: 24,
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    color: T.ink,
    marginTop: 16,
    marginBottom: 12,
  },
  celebrationText: {
    fontSize: 15,
    color: T.graphite,
    lineHeight: 1.6,
    marginBottom: 24,
  },
  celebrationBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '12px 24px',
    background: T.fieldGreen,
    color: T.chalk,
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
  },
};
