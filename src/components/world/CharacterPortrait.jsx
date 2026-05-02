import FieldFigure from './FieldFigure';

/**
 * Shows an AI-generated portrait when available; falls back to <FieldFigure>.
 *
 * @param {object} props
 * @param {string|null|undefined} [props.imageUrl]   fal.ai CDN URL; falsy → FieldFigure
 * @param {number}  [props.size=80]     height in px (width = size × 0.65 to match FieldFigure)
 * @param {string}  [props.label]       aria alt-text / aria-label
 * @param {object}  [props.figureProps] extra props forwarded to FieldFigure (outfit, mood, etc.)
 */
export default function CharacterPortrait({ imageUrl, size = 80, label = 'Field guide', figureProps = {} }) {
  if (imageUrl) {
    const w = Math.round(size * 0.65);
    return (
      <img
        src={imageUrl}
        alt={label}
        width={w}
        height={size}
        style={{
          borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
          border: '2px solid rgba(90,70,40,0.18)',
          objectFit: 'cover',
          objectPosition: 'top center',
          display: 'block',
        }}
      />
    );
  }
  return <FieldFigure size={size} label={label} {...figureProps} />;
}
