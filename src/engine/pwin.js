/**
 * Win-probability model.
 *
 *  Step 1  Base rate p0 with empirical-Bayes shrinkage (Beta-Binomial):
 *          p0 = (wins + α·μ) / (bids + α)   where μ = route default (or firm overall win rate), α = 10 pseudo-bids.
 *          With no history, p0 = μ.
 *
 *  Step 2  Competitor adjustment: p1 = p0 · [ (1/(n+1)) / (1/(n̄+1)) ]  clipped to [0.02, 0.95],
 *          where n = expected competitors on this bid and n̄ = typical competitors for the route.
 *
 *  Step 3  Position adjustment on the logit scale: logit(p) = logit(p1) + β·(s − 3),
 *          s = winnability score mapped to 1–5, β = 0.5 default (recalibrate from outcomes at ≥ 30 logged bids).
 *
 *  Friedman / Gates price curves (hard-bid only): given bid coefficient of variation c (default 0.06) and your
 *  price position d relative to field mean (fraction, e.g. +0.03 = 3 % above), P(lowest | n) under a normal
 *  approximation:  Friedman = (1 − Φ(d/c))^n ;  Gates = 1 / (1 + n·Φ(d/c)/(1 − Φ(d/c))).
 *  Skitmore (2002) found neither dominates a calibrated empirical model; Friedman is the pessimistic bound.
 *
 *  Winner's-curse flag: n ≥ 6 and scope clarity ≤ 2.
 */

export const ALPHA_PSEUDO_BIDS = 10;
export const DEFAULT_BETA = 0.5;
export const DEFAULT_BID_CV = 0.06;

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export const logit = p => Math.log(p / (1 - p));
export const invLogit = z => 1 / (1 + Math.exp(-z));

/** Standard normal CDF (Abramowitz–Stegun 7.1.26). */
export function normCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x >= 0 ? 1 - p : p;
}

export function baseRate({ wins = 0, bids = 0, mu, alpha = ALPHA_PSEUDO_BIDS }) {
  bids = Math.max(0, bids || 0);
  wins = Math.min(Math.max(0, wins || 0), bids);   // wins > bids is a data-entry error, not a >100 % win rate
  if (bids <= 0) return mu;
  return (wins + alpha * mu) / (bids + alpha);
}

export function competitorAdjust(p0, n, nTypical) {
  if (n == null || nTypical == null) return clamp(p0, 0.02, 0.95);
  const factor = (1 / (n + 1)) / (1 / (nTypical + 1));
  return clamp(p0 * factor, 0.02, 0.95);
}

/** winnability 0–100 → position score 1–5 */
export const winnabilityToScore = w => (w == null ? 3 : 1 + (w / 100) * 4);

export function positionAdjust(p1, positionScore, beta = DEFAULT_BETA) {
  const z = logit(clamp(p1, 0.02, 0.95)) + beta * (positionScore - 3);
  return clamp(invLogit(z), 0.02, 0.98);
}

/**
 * Full P(win).
 * @param {object} a  { route, wins, bids, competitors, winnability (0-100|null), beta }
 */
export function pwin(a) {
  const mu = a.route.baseWin;
  const p0 = baseRate({ wins: a.wins, bids: a.bids, mu });
  const p1 = competitorAdjust(p0, a.competitors, a.route.typicalBidders);
  const s = winnabilityToScore(a.winnability);
  const p = positionAdjust(p1, s, a.beta ?? DEFAULT_BETA);
  return { p, p0, p1, positionScore: s };
}

/** Friedman & Gates P(lowest) for price position d (fraction vs field mean) against n competitors. */
export function priceCurves(d, n, cv = DEFAULT_BID_CV) {
  if (n <= 0) return { friedman: 1, gates: 1 };
  const phi = normCdf(d / cv);           // P(a single competitor bids below you)
  const beat = 1 - phi;                   // P(you beat one competitor)
  const friedman = Math.pow(beat, n);
  const gates = beat <= 0 ? 0 : 1 / (1 + n * (phi / beat));
  return { friedman, gates };
}

/** Curve of expected profit vs markup for hard bids. markup m over cost; price position relative to field. */
export function markupCurve({ cost, n, cv = DEFAULT_BID_CV, fieldMarkup = 0.08, steps = 25, maxMarkup = 0.25 }) {
  const rows = [];
  for (let i = 0; i <= steps; i++) {
    const m = (maxMarkup * i) / steps;
    const d = (1 + m) / (1 + fieldMarkup) - 1;            // your price vs field mean
    const { friedman, gates } = priceCurves(d, n, cv);
    rows.push({ m, d, pF: friedman, pG: gates, epF: m * cost * friedman, epG: m * cost * gates });
  }
  const bestF = rows.reduce((b, r) => (r.epF > b.epF ? r : b), rows[0]);
  const bestG = rows.reduce((b, r) => (r.epG > b.epG ? r : b), rows[0]);
  return { rows, bestF, bestG };
}

/** Heuristic markup scaling with competitor count: m2/m1 = (n1/n2)^0.7 */
export const markupScale = (m1, n1, n2) => (n2 <= 0 ? m1 : m1 * Math.pow(n1 / n2, 0.7));

export function winnersCurseFlag(competitors, scopeScore, threshold = 6) {
  return competitors != null && competitors >= threshold && scopeScore != null && scopeScore <= 2;
}
