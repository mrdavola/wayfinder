import './Hotspot.css';

/**
 * @param {object} props
 * @param {string} props.id
 * @param {string} props.role            HotspotRole from biome config
 * @param {string} props.x               '50%'
 * @param {string} props.y               '70%'
 * @param {string} props.label           plain-language aria-label
 * @param {'future'|'active'|'completed'} [props.state='active']
 * @param {() => void} [props.onActivate]
 */
export default function Hotspot({ id, role, x, y, label, state = 'active', onActivate }) {
  const disabled = state === 'future';
  return (
    <button
      type="button"
      className="hotspot"
      data-role={role}
      data-state={state}
      data-id={id}
      aria-label={label}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onActivate}
      style={{ left: x, top: y }}
    >
      <span className="hotspot__pulse" aria-hidden="true" />
    </button>
  );
}
