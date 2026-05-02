import { useEffect, useRef } from 'react';
import './ParallaxScene.css';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const DEPTHS = { back: 4, mid: 8, fore: 12 };  // px max travel per layer

/**
 * Three-layer parallax SVG scene. Mouse position drives sub-pixel depth.
 * Disabled under reduced-motion / calmMode.
 *
 * @param {object} props
 * @param {{back: string, mid: string, fore: string}} props.layers
 * @param {boolean} [props.calmMode]
 * @param {React.ReactNode} [props.children]
 */
export default function ParallaxScene({ layers, calmMode = false, children }) {
  const ref = useRef(null);
  const systemReduced = useReducedMotion();
  const reduced = calmMode || systemReduced;

  useEffect(() => {
    if (reduced || !ref.current) return;
    const root = ref.current;
    const onMove = (e) => {
      const rect = root.getBoundingClientRect();
      const cx = (e.clientX - rect.left) / rect.width  - 0.5;  // -0.5 .. +0.5
      const cy = (e.clientY - rect.top)  / rect.height - 0.5;
      Object.entries(DEPTHS).forEach(([name, max]) => {
        const el = root.querySelector(`[data-layer="${name}"]`);
        if (!el) return;
        el.style.transform = `translate3d(${(-cx * max).toFixed(2)}px, ${(-cy * max).toFixed(2)}px, 0)`;
      });
    };
    root.addEventListener('pointermove', onMove);
    return () => root.removeEventListener('pointermove', onMove);
  }, [reduced]);

  return (
    <div
      ref={ref}
      className="parallax-scene"
      data-reduced-motion={reduced ? 'true' : undefined}
    >
      <img data-layer="back" src={layers.back} alt="" aria-hidden="true" draggable={false} />
      <img data-layer="mid"  src={layers.mid}  alt="" aria-hidden="true" draggable={false} />
      <img data-layer="fore" src={layers.fore} alt="" aria-hidden="true" draggable={false} />
      <div className="parallax-scene__overlay">{children}</div>
    </div>
  );
}
