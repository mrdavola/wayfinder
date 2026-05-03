// List-view alternative to the immersive biome scene. Renders the same mock
// quest + stages as a vertical card stack — matching the visual language of
// the original StudentQuestPage list view, but stripped down to mock data so
// it works on /demo without auth or DB.
import './DemoListView.css';
import { CheckCircle2, Circle, Lock, Sparkles } from 'lucide-react';

function StageCard({ stage }) {
  const isActive    = stage.biomeState === 'active';
  const isCompleted = stage.biomeState === 'completed';
  const isLocked    = stage.biomeState === 'future';

  const Icon = isCompleted ? CheckCircle2 : isLocked ? Lock : Circle;

  return (
    <div className={`dlv-stage dlv-stage--${stage.biomeState}`}>
      <div className="dlv-stage__head">
        <span className={`dlv-stage__icon dlv-stage__icon--${stage.biomeState}`}>
          <Icon size={18} />
        </span>
        <div>
          <span className="dlv-stage__num">Stage {stage.stage_number}</span>
          <h3 className="dlv-stage__title">{stage.title}</h3>
        </div>
        {isActive && <span className="dlv-stage__badge">in progress</span>}
        {isCompleted && <span className="dlv-stage__badge dlv-stage__badge--done">complete</span>}
      </div>
      {stage.description && (
        <p className="dlv-stage__description">{stage.description}</p>
      )}
      {stage.challenge && (
        <div className="dlv-stage__challenge">
          <span className="dlv-stage__challenge-label">Your Challenge</span>
          <p>{stage.challenge}</p>
        </div>
      )}
      {stage.deliverable_description && (
        <p className="dlv-stage__deliverable">
          <strong>Deliverable:</strong> {stage.deliverable_description}
        </p>
      )}
      {!isLocked && (
        <div className="dlv-stage__actions">
          <button className="btn btn-secondary">Submit work</button>
          <button className="btn btn-primary">Talk to your guide →</button>
        </div>
      )}
    </div>
  );
}

export default function DemoListView({ quest, stages, teammates = [] }) {
  const completed = stages.filter(s => s.biomeState === 'completed').length;
  const total = stages.length;

  return (
    <div className="dlv-page">
      <div className="dlv-shell">
        <header className="dlv-header">
          <span className="dlv-eyebrow">your project</span>
          <h1 className="dlv-title">{quest?.title}</h1>
          {quest?.driving_question && (
            <p className="dlv-question">{quest.driving_question}</p>
          )}
          {total > 0 && (
            <div className="dlv-progress" aria-label={`${completed} of ${total} stages complete`}>
              <div className="dlv-progress__bar">
                <span style={{ width: `${(completed / total) * 100}%` }} />
              </div>
              <span className="dlv-progress__count">{completed} of {total} stages complete</span>
            </div>
          )}
        </header>

        <main className="dlv-main">
          <div className="dlv-stages">
            {stages.length === 0 ? (
              <div className="dlv-empty">
                <Sparkles size={28} />
                <h3>Your home base</h3>
                <p>Switch to a project biome to see stage cards. Cabin is your hub between projects.</p>
              </div>
            ) : (
              stages.map(s => <StageCard key={s.id} stage={s} />)
            )}
          </div>

          <aside className="dlv-sidebar">
            <div className="dlv-sidebar__card">
              <span className="dlv-eyebrow">field guide</span>
              <h3>Hi — I&apos;m your guide.</h3>
              <p>I&apos;ll keep you company through this project. Stuck? Ask me anything. Not stuck? I might still ask you something.</p>
              <button className="btn btn-primary dlv-sidebar__cta">Talk to your guide →</button>
            </div>
            {teammates.length > 0 && (
              <div className="dlv-sidebar__card">
                <span className="dlv-eyebrow">teammates</span>
                {teammates.map(t => (
                  <div key={t.student_id} className="dlv-teammate">
                    <span className="dlv-teammate__avatar">
                      {t.avatar_emoji || (t.name?.[0] || 'T')}
                    </span>
                    <div>
                      <div className="dlv-teammate__name">{t.name}</div>
                      {t.role && <div className="dlv-teammate__role">{t.role}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="dlv-sidebar__card">
              <span className="dlv-eyebrow">mailbox</span>
              <p className="dlv-empty-mini">No feedback letters yet. Submit work to get a response.</p>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
