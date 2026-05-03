import './SceneFigure.css';
import CharacterPortrait from './CharacterPortrait';

/**
 * Positionable in-scene NPC / player figure with an optional name tag.
 * Used for guide, teammates, and the player avatar (positioned at current stage).
 *
 * @param {object} props
 * @param {string} props.x
 * @param {string} props.y
 * @param {string|null} [props.imageUrl]
 * @param {string} [props.name]
 * @param {string} [props.role]               'guide' | 'teammate' | 'player'
 * @param {object} [props.figureProps]        forwarded to FieldFigure
 * @param {number} [props.size=80]
 * @param {boolean} [props.showTag=true]
 * @param {() => void} [props.onClick]        when clickable (e.g. teammate)
 * @param {string} [props.ariaLabel]
 */
export default function SceneFigure({
  x,
  y,
  imageUrl = null,
  name,
  role = 'player',
  figureProps,
  size = 80,
  showTag = true,
  onClick,
  ariaLabel,
  figureLabel,
}) {
  const Wrapper = onClick ? 'button' : 'div';
  const wrapperProps = onClick
    ? { type: 'button', onClick, 'aria-label': ariaLabel || name || role }
    : { 'aria-hidden': 'true' };

  return (
    <Wrapper
      className={`scene-figure scene-figure--${role}${onClick ? ' scene-figure--clickable' : ''}`}
      style={{ left: x, top: y }}
      {...wrapperProps}
    >
      <CharacterPortrait
        imageUrl={imageUrl}
        size={size}
        label={figureLabel || ariaLabel || name || role}
        figureProps={figureProps}
      />
      {showTag && name && (
        <span className="scene-figure__tag" aria-hidden="true">{name}</span>
      )}
      {role === 'player' && (
        <span className="scene-figure__here" aria-hidden="true">you are here</span>
      )}
    </Wrapper>
  );
}
