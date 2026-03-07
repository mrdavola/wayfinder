// Tier 1: auto-trusted (green)
const TIER_1_DOMAINS = new Set(['gov', 'edu', 'mil']);
const TIER_1_PUBLISHERS = new Set([
  'ap news', 'reuters', 'bbc', 'nytimes', 'washingtonpost', 'nature.com',
  'science.org', 'pubmed', 'ncbi.nlm.nih.gov', 'cdc.gov', 'epa.gov',
  'nasa.gov', 'smithsonian', 'nationalgeographic', 'britannica',
]);

// Tier 2: review suggested (yellow)
const TIER_2_DOMAINS = new Set(['org', 'wikipedia.org', 'khanacademy.org']);

export function getTrustTier(url) {
  if (!url) return 'unknown';
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const tld = hostname.split('.').pop();
    const domain = hostname.replace(/^www\./, '');
    if (TIER_1_DOMAINS.has(tld)) return 'trusted';
    for (const pub of TIER_1_PUBLISHERS) { if (domain.includes(pub)) return 'trusted'; }
    if (TIER_2_DOMAINS.has(tld)) return 'review';
    for (const d of TIER_2_DOMAINS) { if (domain.includes(d)) return 'review'; }
    return 'unverified';
  } catch { return 'unknown'; }
}

export function getTrustColor(tier) {
  switch (tier) {
    case 'trusted': return 'var(--field-green)';
    case 'review': return 'var(--compass-gold)';
    case 'unverified': return 'var(--specimen-red)';
    case 'verified_by_guide': return 'var(--lab-blue)';
    default: return 'var(--pencil)';
  }
}

export function getTrustLabel(tier) {
  switch (tier) {
    case 'trusted': return 'Trusted source';
    case 'review': return 'Review suggested';
    case 'unverified': return 'Unverified';
    case 'verified_by_guide': return 'Verified by guide';
    case 'incorrect': return 'Marked incorrect';
    default: return 'Unknown source';
  }
}
