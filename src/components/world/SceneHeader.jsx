import './SceneHeader.css';

/**
 * Project title + driving question banner displayed at the top of the biome scene.
 * Stays subtle so it doesn't dominate the world art, but anchors the experience
 * in what the project is actually about.
 *
 * @param {object} props
 * @param {object} props.quest         must have title; description optional
 * @param {object} [props.progress]    { completed, total } stage progress
 * @param {() => void} [props.onExit]  optional handler for an X / back affordance
 */
export default function SceneHeader({ quest, progress, onExit }) {
  if (!quest) return null;
  const drivingQuestion = quest.driving_question || quest.description;
  return (
    <header className="scene-header" aria-label="Project overview">
      <div className="scene-header__inner">
        <div className="scene-header__text">
          <p className="scene-header__eyebrow">Your project</p>
          <h1 className="scene-header__title">{quest.title}</h1>
          {drivingQuestion && (
            <p className="scene-header__question">{drivingQuestion}</p>
          )}
        </div>
        {progress?.total > 0 && (
          <div className="scene-header__progress" aria-label={`${progress.completed} of ${progress.total} stages complete`}>
            <span className="scene-header__progress-label">progress</span>
            <span className="scene-header__progress-count">
              {progress.completed}<span className="scene-header__progress-sep">/</span>{progress.total}
            </span>
          </div>
        )}
        {onExit && (
          <button type="button" className="scene-header__exit" onClick={onExit} aria-label="Switch to list view">
            ↗
          </button>
        )}
      </div>
    </header>
  );
}
