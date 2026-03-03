/**
 * Tooltip.jsx
 * A wrapper component that shows a CSS-only tooltip above its children on hover.
 *
 * Props:
 *   content   {string|ReactNode}  The tooltip text/content to display
 *   children  {ReactNode}         The element that triggers the tooltip
 *
 * The tooltip appears above the child element and is horizontally centred.
 * No JS state is used — visibility is controlled entirely by CSS :hover.
 */

let styleInjected = false;
function injectStyles() {
  if (styleInjected || typeof document === 'undefined') return;
  styleInjected = true;
  const el = document.createElement('style');
  el.textContent = `
    .ql-tooltip-wrapper {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .ql-tooltip-bubble {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: var(--ink);
      color: var(--chalk);
      font-family: var(--font-body);
      font-size: 12px;
      line-height: 1.4;
      white-space: nowrap;
      padding: 5px 10px;
      border-radius: 5px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 140ms ease;
      z-index: 200;
      /* Prevent the bubble from being wider than the viewport on small screens */
      max-width: min(320px, 90vw);
      white-space: normal;
      text-align: center;
    }

    /* Downward-pointing arrow */
    .ql-tooltip-bubble::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent;
      border-top-color: var(--ink);
    }

    /* Show on hover of wrapper — works for both mouse and keyboard focus */
    .ql-tooltip-wrapper:hover .ql-tooltip-bubble,
    .ql-tooltip-wrapper:focus-within .ql-tooltip-bubble {
      opacity: 1;
    }
  `;
  document.head.appendChild(el);
}

export default function Tooltip({ content, children }) {
  injectStyles();

  return (
    <span className="ql-tooltip-wrapper">
      {children}
      <span className="ql-tooltip-bubble" role="tooltip">
        {content}
      </span>
    </span>
  );
}
