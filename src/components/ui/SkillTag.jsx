/**
 * SkillTag.jsx
 * A pill-shaped badge for categorising skills/subjects.
 *
 * Props:
 *   label    {string}  Text to display inside the tag (required)
 *   variant  {string}  One of: 'science' | 'tech' | 'humanity' | 'career' | 'default'
 *
 * Styles are sourced from the global .skill-tag class defined in index.css.
 * The variant maps directly to a modifier class (.science, .tech, etc.).
 */

const VALID_VARIANTS = new Set(['science', 'tech', 'humanity', 'career', 'default']);

export default function SkillTag({ label, variant = 'default' }) {
  const safeVariant = VALID_VARIANTS.has(variant) ? variant : 'default';

  return (
    <span className={`skill-tag ${safeVariant}`}>
      {label}
    </span>
  );
}
