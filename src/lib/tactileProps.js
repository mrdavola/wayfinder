// Tactile 3D prop registry for Phase 3 — one prop per hotspot role.
// PropId keys here must match the component switch in PropMesh.jsx.

/** @typedef {'lantern'|'journal'|'specimenJar'|'mailbox'|'tent'} PropId */

/** Maps hotspot role → PropId (roles without a prop return null). */
export const ROLE_TO_PROP = {
  trailheadSign:  'tent',
  stage:          'specimenJar',
  guide:          'lantern',
  mailbox:        'mailbox',
  reflection:     'journal',
};

/** Per-prop metadata: accessible label + aria description. */
export const TACTILE_PROPS = {
  lantern:     {
    label:           'Field lantern',
    ariaDescription: 'A brass field lantern with a warm glowing flame inside',
  },
  journal:     {
    label:           'Field journal',
    ariaDescription: 'A well-worn leather field journal with a strap',
  },
  specimenJar: {
    label:           'Specimen jar',
    ariaDescription: 'A glass jar holding a field-collected specimen with a paper label',
  },
  mailbox:     {
    label:           'Mailbox',
    ariaDescription: 'A red rural mailbox on a wooden post with a flag',
  },
  tent:        {
    label:           'Camp tent',
    ariaDescription: 'A weathered canvas trail tent with guy-rope pegs',
  },
};

/**
 * Returns the PropId for a given hotspot role, or null if none.
 * @param {string} role
 * @returns {PropId|null}
 */
export function getPropForRole(role) {
  return ROLE_TO_PROP[role] ?? null;
}

/** All registered prop IDs. */
export const ALL_PROP_IDS = Object.keys(TACTILE_PROPS);
