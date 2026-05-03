import { lazy, Suspense, useRef, useEffect } from 'react';
import './HotspotOverlay.css';
import Specimen from './Specimen';
import CampfireChat from '../social/CampfireChat';
import ProjectBanner from './ProjectBanner';
import TeammatePanel from './panels/TeammatePanel';

const WorldChat = lazy(() => import('./WorldChat'));

// Roles that benefit from a project-relevant illustrated banner at the top of
// their overlay panel. Pure functional roles (chat, mailbox, journal) are
// listed; the panel for each then layers its own content over the banner.
const BANNER_ROLES = new Set([
  'trailheadSign', 'stage', 'mailbox', 'bulletinSubmit', 'reflection', 'challenger',
  'stretch', 'parentLetter',
]);

function PropHeader({ role, quest }) {
  if (!quest || !BANNER_ROLES.has(role)) return null;
  return <ProjectBanner quest={quest} role={role} />;
}

function TrailheadPanel({ quest }) {
  return (
    <div className="ho-panel">
      <PropHeader role="trailheadSign" quest={quest} />
      <h2 id="ho-dialog-title" className="ho-title" style={{ marginTop: 14 }}>{quest?.title}</h2>
      <p className="ho-body">{quest?.description}</p>
    </div>
  );
}

function StagePanel({ quest, stage, onOpenChat, studentSession }) {
  if (!stage) return <p className="ho-empty">No stage data.</p>;
  return (
    <div className="ho-panel">
      <PropHeader role="stage" quest={quest} />
      <div className="ho-stage-badge" style={{ marginTop: 14 }}>Stage {stage.stage_number}</div>
      <h2 id="ho-dialog-title" className="ho-title">{stage.title}</h2>
      {stage.description && <p className="ho-body">{stage.description}</p>}
      {stage.challenge && (
        <Specimen id={stage.id} pin="pin" size="md" style={{ margin: '12px 0', width: '100%', boxSizing: 'border-box' }}>
          <strong style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--graphite)' }}>YOUR CHALLENGE</strong>
          <p style={{ margin: '6px 0 0', fontFamily: 'var(--font-body)' }}>{stage.challenge}</p>
        </Specimen>
      )}
      {stage.deliverable_description && (
        <p className="ho-body" style={{ fontSize: 13, color: 'var(--graphite)' }}>
          <strong>Deliverable:</strong> {stage.deliverable_description}
        </p>
      )}
      <button className="btn btn-primary ho-cta" onClick={onOpenChat}>
        Talk to your guide →
      </button>
      <p className="ho-hint">For full submission tools, use the list view (↗ top-right).</p>
    </div>
  );
}

function MailboxPanel({ quest, feedback = [] }) {
  return (
    <div className="ho-panel">
      <PropHeader role="mailbox" quest={quest} />
      <h2 id="ho-dialog-title" className="ho-title" style={{ marginTop: 14 }}>Mailbox</h2>
      {feedback.length === 0 ? (
        <p className="ho-empty">No feedback letters yet. Submit work to get a response.</p>
      ) : (
        <div className="ho-feedback-list">
          {feedback.map(fb => (
            <Specimen key={fb.id} id={fb.id} pin="tape" size="md"
              style={{ marginBottom: 12, width: '100%', boxSizing: 'border-box' }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--graphite)', marginBottom: 6 }}>
                Stage {fb.stage_number || '?'} feedback
              </div>
              {fb.warm_feedback && <p style={{ margin: '0 0 6px', fontFamily: 'var(--font-body)', fontSize: 14 }}>{fb.warm_feedback}</p>}
              {fb.cool_feedback && <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--graphite)' }}>{fb.cool_feedback}</p>}
            </Specimen>
          ))}
        </div>
      )}
    </div>
  );
}

function BulletinPanel({ quest }) {
  return (
    <div className="ho-panel">
      <PropHeader role="bulletinSubmit" quest={quest} />
      <h2 id="ho-dialog-title" className="ho-title" style={{ marginTop: 14 }}>Submit Work</h2>
      <p className="ho-body">
        Pin your work to the bulletin board. Use the <strong>list view</strong> (↗ top-right) for the full submission uploader.
      </p>
    </div>
  );
}

function ReflectionPanel({ quest, stage, studentSession }) {
  return (
    <div className="ho-panel">
      <PropHeader role="reflection" quest={quest} />
      <h2 id="ho-dialog-title" className="ho-title" style={{ marginTop: 14 }}>Reflection Journal</h2>
      <CampfireChat
        questId={quest?.id}
        stageId={stage?.id || null}
        studentName={studentSession?.studentName}
        studentId={studentSession?.studentId}
      />
    </div>
  );
}

function HubPanel({ quest, role, body, items }) {
  const titles = {
    wallMap:         'Field Map — your projects',
    specimenCabinet: 'Cabinet — your skills',
    bulletinBoard:   'Bulletin Board — messages',
  };
  return (
    <div className="ho-panel">
      <PropHeader role={role} quest={quest} />
      <h2 id="ho-dialog-title" className="ho-title" style={{ marginTop: 14 }}>{titles[role] || 'Cabin'}</h2>
      <p className="ho-body">{body}</p>
      {items && items.length > 0 && (
        <div className="ho-feedback-list" style={{ marginTop: 12 }}>
          {items.map((it, i) => (
            <Specimen key={i} id={`hub-${role}-${i}`} pin={i % 2 === 0 ? 'pin' : 'tape'} size="md"
              style={{ marginBottom: 10, width: '100%', boxSizing: 'border-box' }}>
              <strong style={{ fontSize: 12, fontFamily: 'var(--font-body)' }}>{it.title}</strong>
              {it.subtitle && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--graphite)', fontFamily: 'var(--font-body)' }}>
                  {it.subtitle}
                </p>
              )}
            </Specimen>
          ))}
        </div>
      )}
    </div>
  );
}

function WallMapPanel({ quest }) {
  return (
    <HubPanel
      quest={quest}
      role="wallMap"
      body="A map of every project you've taken on — open, paused, or finished. Tap a pin to revisit."
      items={[
        { title: 'How can our cafeteria reduce food waste?', subtitle: 'Active · Stage 2 of 3' },
        { title: 'What lives in our schoolyard pond?',         subtitle: 'Paused · Stage 1' },
        { title: 'Storytelling with shadows',                  subtitle: 'Completed · last term' },
      ]}
    />
  );
}

function SpecimenCabinetPanel({ quest }) {
  return (
    <HubPanel
      quest={quest}
      role="specimenCabinet"
      body="Each jar is a skill you've collected through your work. Open one to see the projects that earned it."
      items={[
        { title: 'Field observation',  subtitle: 'Earned in 2 projects' },
        { title: 'Interviewing',       subtitle: 'Earned in 1 project' },
        { title: 'Iterative design',   subtitle: 'Growing — 3 more samples to mastery' },
        { title: 'Data analysis',      subtitle: 'New — first sample collected' },
      ]}
    />
  );
}

function BulletinBoardPanel({ quest }) {
  return (
    <HubPanel
      quest={quest}
      role="bulletinBoard"
      body="Notes from your guide, parent, and teammates. Read them when you have a quiet moment."
      items={[
        { title: 'Note from your guide',     subtitle: 'I loved your interview write-up — let\'s pick a prototype path on Friday.' },
        { title: 'Letter from home',         subtitle: 'Dad says he\'s proud of how you handled the messy second draft.' },
        { title: 'Reminder',                  subtitle: 'Stage 3 deliverable due in 4 days.' },
      ]}
    />
  );
}

function ChatPanel({ quest, stage, studentSession, onClose, onStageComplete, role }) {
  const session = {
    studentName: studentSession?.studentName,
    studentId: studentSession?.studentId,
    pin: studentSession?.pin || '',
  };
  return (
    <div className="ho-panel ho-panel--chat">
      <PropHeader role={role ?? 'guide'} quest={quest} />
      <Suspense fallback={<p className="ho-empty">Loading guide...</p>}>
        <WorldChat
          quest={quest}
          stage={stage}
          blueprint={null}
          studentSession={session}
          onClose={onClose}
          onStageComplete={onStageComplete}
        />
      </Suspense>
    </div>
  );
}

function OverlayContent({ role, quest, stage, studentSession, feedback, teammate, onClose, onStageComplete, onOpenChat }) {
  switch (role) {
    case 'trailheadSign':
      return <TrailheadPanel quest={quest} />;
    case 'stage':
      return <StagePanel quest={quest} stage={stage} onOpenChat={onOpenChat} studentSession={studentSession} />;
    case 'guide':
      return <ChatPanel quest={quest} stage={stage} studentSession={studentSession} onClose={onClose} onStageComplete={onStageComplete} role="guide" />;
    case 'challenger':
      return <ChatPanel quest={quest} stage={stage} studentSession={studentSession} onClose={onClose} onStageComplete={onStageComplete} role="challenger" />;
    case 'reflection':
      return <ReflectionPanel quest={quest} stage={stage} studentSession={studentSession} />;
    case 'mailbox':
      return <MailboxPanel quest={quest} feedback={feedback} />;
    case 'bulletinSubmit':
      return <BulletinPanel quest={quest} />;
    case 'teammate':
      return <TeammatePanel teammate={teammate} />;
    case 'wallMap':
      return <WallMapPanel quest={quest} />;
    case 'specimenCabinet':
      return <SpecimenCabinetPanel quest={quest} />;
    case 'bulletinBoard':
      return <BulletinBoardPanel quest={quest} />;
    default:
      return <p className="ho-empty">Coming soon.</p>;
  }
}

export default function HotspotOverlay({ role, quest, stage, studentSession, feedback = [], teammate = null, onClose, onStageComplete, onOpenChat = () => {} }) {
  const sheetRef = useRef(null);

  useEffect(() => {
    sheetRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="hotspot-overlay" data-role={role} role="dialog" aria-modal="true" aria-labelledby="ho-dialog-title">
      <div className="hotspot-overlay__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="hotspot-overlay__sheet" ref={sheetRef} tabIndex={-1}>
        <button
          className="hotspot-overlay__close"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
        <div className="hotspot-overlay__scroll">
          <OverlayContent
            role={role}
            quest={quest}
            stage={stage}
            studentSession={studentSession}
            feedback={feedback}
            teammate={teammate}
            onClose={onClose}
            onStageComplete={onStageComplete}
            onOpenChat={onOpenChat}
          />
        </div>
      </div>
    </div>
  );
}
