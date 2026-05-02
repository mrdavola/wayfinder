import './Specimen.css';
import { seededJitterDeg } from '../../lib/jitter';

/**
 * Field-journal "specimen" primitive — paper card with deckled edge, soft drop
 * shadow, optional pin/tape, deterministic 1° jitter from the id.
 *
 * @param {object} props
 * @param {string} [props.id]      stable id, drives jitter
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {'none'|'pin'|'tape'|'clip'} [props.pin='none']
 * @param {number} [props.maxJitterDeg=1]
 * @param {string} [props.className]
 * @param {React.CSSProperties} [props.style]
 * @param {React.ReactNode} props.children
 */
export default function Specimen({
  id,
  size = 'md',
  pin = 'none',
  maxJitterDeg = 1,
  className = '',
  style,
  children,
  ...rest
}) {
  const jitter = id ? seededJitterDeg(id, maxJitterDeg) : 0;
  return (
    <div
      className={`specimen ${className}`}
      data-size={size}
      data-pin={pin === 'none' ? undefined : pin}
      style={{
        ...style,
        '--specimen-jitter': `${jitter}deg`,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
