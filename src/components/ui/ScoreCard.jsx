/**
 * ScoreCard.jsx
 * Displays submission feedback with a numeric score circle,
 * expandable detail sections, and an optional resubmit button.
 *
 * Props:
 *   feedback     {object}   — score, feedback, hints, encouragement,
 *                              next_steps, skills_demonstrated[],
 *                              mastery_passed, attempt_number
 *   onResubmit   {function} — optional callback; shows "Try Again" when
 *                              score < MASTERY_THRESHOLD
 */

import { useState } from 'react';
import { CheckCircle, AlertTriangle, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

/* ── design tokens (mirrors CSS custom-property palette) ────────────── */
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

export const MASTERY_THRESHOLD = 35;

/* ── helpers ─────────────────────────────────────────────────────────── */

export function scoreColor(score) {
  if (score >= 43) return '#22c55e';          // green — exceptional
  if (score >= 35) return T.fieldGreen;       // field-green — mastery
  if (score >= 26) return T.compassGold;      // gold — almost there
  if (score >= 16) return '#e67e22';          // orange — keep going
  return T.specimenRed;                       // red — needs work
}

export function scoreLabel(score) {
  if (score >= 43) return 'Exceptional';
  if (score >= 35) return 'Mastery';
  if (score >= 26) return 'Almost There';
  if (score >= 16) return 'Keep Going';
  return 'Needs Work';
}

/* ── component ───────────────────────────────────────────────────────── */

export default function ScoreCard({ feedback, onResubmit }) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (!feedback) return null;

  const {
    score = 0,
    feedback: feedbackText,
    hints,
    encouragement,
    next_steps,
    skills_demonstrated = [],
    mastery_passed,
    attempt_number,
  } = feedback;

  const color = scoreColor(score);
  const label = scoreLabel(score);
  const pct = Math.min((score / 50) * 100, 100);
  const showResubmit = !mastery_passed && typeof onResubmit === 'function';

  /* ── detail rows (only render if content exists) ──────────────────── */
  const detailRows = [
    skills_demonstrated.length > 0 && { heading: 'Skills Shown', type: 'pills', data: skills_demonstrated },
    encouragement && { heading: 'Keep it up', type: 'text', data: encouragement },
    hints && { heading: 'How to improve', type: 'text', data: hints },
    next_steps && { heading: 'Think about', type: 'text', data: next_steps },
  ].filter(Boolean);

  const hasDetails = detailRows.length > 0;

  /* ── styles ───────────────────────────────────────────────────────── */
  const styles = {
    card: {
      background: T.chalk,
      border: `1px solid ${T.parchment}`,
      borderRadius: 12,
      padding: '20px 24px',
      fontFamily: 'var(--font-body, "DM Sans", sans-serif)',
      color: T.ink,
      maxWidth: 520,
    },

    /* header row: icon + label + attempt badge */
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    headerLabel: {
      fontSize: 14,
      fontWeight: 600,
      flex: 1,
    },
    attemptBadge: {
      fontSize: 11,
      fontWeight: 600,
      fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)',
      background: T.parchment,
      color: T.graphite,
      padding: '2px 8px',
      borderRadius: 999,
    },

    /* score row */
    scoreRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      marginBottom: 16,
    },
    scoreCircle: {
      width: 52,
      height: 52,
      borderRadius: '50%',
      border: `3px solid ${color}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    scoreNumber: {
      fontFamily: 'var(--font-display, "Instrument Serif", serif)',
      fontSize: 22,
      fontWeight: 700,
      color,
      lineHeight: 1,
    },
    scoreRight: {
      flex: 1,
      minWidth: 0,
    },
    scoreTagline: {
      fontSize: 15,
      fontWeight: 600,
      color,
      marginBottom: 6,
    },
    barTrack: {
      height: 4,
      borderRadius: 2,
      background: T.parchment,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: 2,
      background: color,
      width: `${pct}%`,
      transition: 'width 0.4s ease',
    },

    /* feedback body text */
    body: {
      fontSize: 14,
      lineHeight: 1.55,
      color: T.graphite,
      marginBottom: hasDetails ? 12 : 0,
    },

    /* expandable toggle */
    toggle: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      background: 'none',
      border: 'none',
      padding: '4px 0',
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: 600,
      color: T.labBlue,
      fontFamily: 'inherit',
    },

    /* detail section */
    details: {
      marginTop: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    },
    detailHeading: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      color: T.pencil,
      marginBottom: 4,
    },
    detailText: {
      fontSize: 13,
      lineHeight: 1.5,
      color: T.graphite,
    },
    pillWrap: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6,
    },
    pill: {
      fontSize: 12,
      fontWeight: 500,
      background: T.parchment,
      color: T.ink,
      padding: '3px 10px',
      borderRadius: 999,
    },

    /* resubmit button */
    resubmit: {
      marginTop: 16,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 18px',
      fontSize: 14,
      fontWeight: 600,
      fontFamily: 'inherit',
      color: T.compassGold,
      background: 'transparent',
      border: `1.5px solid ${T.compassGold}`,
      borderRadius: 8,
      cursor: 'pointer',
      transition: 'background 0.15s ease',
    },
  };

  return (
    <div style={styles.card}>
      {/* ── pass / fail header ────────────────────────────────────── */}
      <div style={styles.header}>
        {mastery_passed ? (
          <CheckCircle size={18} color={T.fieldGreen} />
        ) : (
          <AlertTriangle size={18} color={T.compassGold} />
        )}
        <span style={{ ...styles.headerLabel, color: mastery_passed ? T.fieldGreen : T.compassGold }}>
          {mastery_passed ? 'Mastery Achieved' : 'Not Yet — Keep Going'}
        </span>
        {attempt_number > 1 && (
          <span style={styles.attemptBadge}>Attempt #{attempt_number}</span>
        )}
      </div>

      {/* ── score row ─────────────────────────────────────────────── */}
      <div style={styles.scoreRow}>
        <div style={styles.scoreCircle}>
          <span style={styles.scoreNumber}>{score}</span>
        </div>
        <div style={styles.scoreRight}>
          <div style={styles.scoreTagline}>{label}</div>
          <div style={styles.barTrack}>
            <div style={styles.barFill} />
          </div>
        </div>
      </div>

      {/* ── main feedback text ────────────────────────────────────── */}
      {feedbackText && <p style={styles.body}>{feedbackText}</p>}

      {/* ── expandable details ────────────────────────────────────── */}
      {hasDetails && (
        <>
          <button
            type="button"
            style={styles.toggle}
            onClick={() => setDetailsOpen((o) => !o)}
            aria-expanded={detailsOpen}
          >
            {detailsOpen ? 'Hide details' : 'Show details'}
            {detailsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {detailsOpen && (
            <div style={styles.details}>
              {detailRows.map((row) => (
                <div key={row.heading}>
                  <div style={styles.detailHeading}>{row.heading}</div>
                  {row.type === 'pills' ? (
                    <div style={styles.pillWrap}>
                      {row.data.map((s) => (
                        <span key={s} style={styles.pill}>{s}</span>
                      ))}
                    </div>
                  ) : (
                    <div style={styles.detailText}>{row.data}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── resubmit button ───────────────────────────────────────── */}
      {showResubmit && (
        <button
          type="button"
          style={styles.resubmit}
          onClick={onResubmit}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${T.compassGold}11`; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <RotateCcw size={14} />
          Try Again
        </button>
      )}
    </div>
  );
}
