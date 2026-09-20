/**
 * BidGate presets.
 *
 * A preset bundles:
 *  contexts   which criteria are shown (see criteria.js contexts)
 *  weights    group weights (attractiveness axis sums to 100; 'compete' is the winnability axis and is
 *             scored separately, so it is listed for display only)
 *  locale     currency, number-format locale, area unit, retention norm (display hint)
 *  economics  default margin (3-point), bid-cost % of value by route, base win rates by route
 *  gates      market-specific hard-gate constants. Each carries valid_from so nobody trusts a stale number.
 *  levies     automatic EV line items — none in these US-only presets; kept as an empty array so the
 *             mechanism degrades gracefully (see src/engine/ev.js).
 *
 * All weights are CONFIGURABLE DEFAULTS, not standards. See docs/METHODOLOGY.md §Weights for provenance.
 * The 2022 meta-analysis puts client/payment factors at the top; these presets reflect that.
 *
 * BidGate models a US flooring / tile / specialty-surface SUBCONTRACTOR bidding discipline packages
 * (US$100K–$4M) to general contractors — not a general contractor running the whole job. USD only; no regulatory-preset machinery.
 */

const USD_LOCALE = {
  currency: 'USD', locale: 'en-US', areaUnit: 'sq ft',
  retentionNorm: '10 % → 5 % at 50 % complete',
};

/** Route-level defaults. Win rates are DIRECTIONAL trade figures (ConstructConnect 2026, ENR/Hedley) — replace with your own log. */
export const ROUTES = [
  { id: 'hardbid_public',  label: 'Hard bid — public',            baseWin: 0.15, bidCostPct: 0.010, typicalBidders: 6 },
  { id: 'hardbid_private', label: 'Hard bid — private',           baseWin: 0.20, bidCostPct: 0.010, typicalBidders: 4 },
  { id: 'invited',         label: 'Invited / select bid list',    baseWin: 0.33, bidCostPct: 0.008, typicalBidders: 3 },
  { id: 'negotiated',      label: 'Negotiated / design-assist',   baseWin: 0.50, bidCostPct: 0.004, typicalBidders: 1 },
  { id: 'repeat',          label: 'Repeat GC / sole source',      baseWin: 0.65, bidCostPct: 0.003, typicalBidders: 0 },
];

export const PRESETS = {
  /* ────────────────────────────────────────────────────────────────── */
  multifamily: {
    id: 'multifamily',
    label: 'Multi-Family / Apartment Flooring & Tile',
    tagline: 'Occupied and new-construction apartment flooring & tile packages, US$100K–$2M. Unit-turn scheduling, repeat property-management-company relationships.',
    contexts: ['multifamily'],
    weights: { client: 24, project: 22, contract: 14, capacity: 16, materials: 16, strategic: 8, compete: 0 },
    locale: USD_LOCALE,
    economics: {
      marginPct: { low: 15, mode: 20, high: 26 },      // gross margin on subcontract value — materials + labour is the sub's whole scope, so this runs well above a GC's overall job margin
      defaultRoute: 'invited',
      contingencyByScope: { 1: 0.15, 2: 0.12, 3: 0.08, 4: 0.05, 5: 0.03 }, // by pr_scope score
    },
    gates: {
      maxEstimatorLoad: 1, maxCrewLoad: 2, largestCompletedMultiple: 1.5,
      valid_from: '2026-09-16',
    },
    levies: [],
  },

  /* ────────────────────────────────────────────────────────────────── */
  commercial_ti: {
    id: 'commercial_ti',
    label: 'Commercial TI Flooring & Tile',
    tagline: 'Office / retail tenant-improvement flooring & tile packages, US$150K–$3M. Tight schedules, AIA / ConsensusDocs subcontract forms, moderate margins.',
    contexts: ['commercial'],
    weights: { client: 22, project: 20, contract: 20, capacity: 14, materials: 14, strategic: 10, compete: 0 },
    locale: USD_LOCALE,
    economics: {
      marginPct: { low: 12, mode: 18, high: 24 },
      defaultRoute: 'hardbid_private',
      contingencyByScope: { 1: 0.15, 2: 0.12, 3: 0.08, 4: 0.05, 5: 0.03 },
    },
    gates: {
      maxEstimatorLoad: 1, maxCrewLoad: 2, largestCompletedMultiple: 1.5,
      valid_from: '2026-09-16',
    },
    levies: [],
  },

  /* ────────────────────────────────────────────────────────────────── */
  specialty_turf: {
    id: 'specialty_turf',
    label: 'Specialty Surfaces (Athletic / Turf)',
    tagline: 'Synthetic-turf and other athletic-surface packages, US$100K–$4M, often school / public hard-bid. Fewer qualified competitors, certification-gated, higher scrutiny on installer credentials and warranty.',
    contexts: ['specialty'],
    weights: { client: 18, project: 22, contract: 16, capacity: 12, materials: 24, strategic: 8, compete: 0 },
    locale: USD_LOCALE,
    economics: {
      marginPct: { low: 18, mode: 25, high: 32 },      // higher band: fewer certified competitors and a specialised scope command a premium over standard flooring/tile
      defaultRoute: 'hardbid_public',
      contingencyByScope: { 1: 0.18, 2: 0.14, 3: 0.10, 4: 0.06, 5: 0.04 },
    },
    gates: {
      maxEstimatorLoad: 1, maxCrewLoad: 2, largestCompletedMultiple: 1.5,
      winnersCurseBidders: 6,
      valid_from: '2026-09-16',
      sourceNote: 'School / public athletic-facility work is frequently a public hard-bid procurement route (lowest responsible bidder); public-works dynamics are folded into this preset rather than split into a fourth one — see docs/METHODOLOGY.md.',
    },
    levies: [],
  },
};

export const PRESET_LIST = Object.values(PRESETS);
export const DEFAULT_PRESET_ID = 'multifamily';
