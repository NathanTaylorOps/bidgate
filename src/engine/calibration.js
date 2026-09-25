/**
 * Calibration loop — closes the loop between predicted P(win) / verdict and what actually happened.
 *
 *  brier(records)          BS = (1/N) Σ (p − o)²   o ∈ {0,1}. 0.25 = always saying 50 %; lower is better.
 *  reliability(records)    5-bin reliability diagram — 5 bins so each bin holds roughly ten or more outcomes in the
 *                          first year of logging (10 bins would be noise).
 *  hitRates(records)       by count and by dollar, split by route / verdict / preset.
 *  criterionSeparation()   won-vs-lost mean score per criterion — an "explore" view, NOT a regression.
 *                          With < 60 outcomes do not fit a model (ADR-0006); show the separation and let the user reason.
 *  murphy(records)         Murphy (1973) decomposition on the same 5 equal-width bins as the reliability diagram:
 *                          BS = reliability − resolution + uncertainty + within-bin term. Binning makes the first
 *                          three terms readable (each is a bin-level quantity you can see on the diagram) at the
 *                          cost of a small residual — the within-bin variance of forecasts minus twice the
 *                          within-bin forecast/outcome covariance (Stephenson, Coelho & Jolliffe 2008) — which is
 *                          reported rather than hidden. Group by exact forecast and the residual is zero.
 */

export const OUTCOMES = ['won', 'lost', 'withdrawn', 'declined', 'pending'];

const decided = r => r.outcome === 'won' || r.outcome === 'lost';

export function brier(records) {
  const rs = records.filter(r => decided(r) && r.pwin != null);
  if (!rs.length) return null;
  const s = rs.reduce((acc, r) => acc + Math.pow(r.pwin - (r.outcome === 'won' ? 1 : 0), 2), 0);
  return s / rs.length;
}

export function reliability(records, bins = 5) {
  const rs = records.filter(r => decided(r) && r.pwin != null);
  const out = Array.from({ length: bins }, (_, i) => ({ lo: i / bins, hi: (i + 1) / bins, n: 0, predicted: 0, observed: 0 }));
  for (const r of rs) {
    let k = Math.floor(r.pwin * bins);
    if (k >= bins) k = bins - 1;
    out[k].n++;
    out[k].predicted += r.pwin;
    out[k].observed += r.outcome === 'won' ? 1 : 0;
  }
  for (const b of out) {
    if (b.n) { b.predicted /= b.n; b.observed /= b.n; } else { b.predicted = null; b.observed = null; }
  }
  return out;
}

export const MURPHY_BINS = 5;

export function murphy(records, bins = MURPHY_BINS) {
  const rs = records.filter(r => decided(r) && r.pwin != null);
  if (!rs.length) return null;
  const base = rs.filter(r => r.outcome === 'won').length / rs.length;
  const uncertainty = base * (1 - base);
  const binned = reliability(rs, bins).filter(b => b.n > 0);
  let rel = 0, res = 0;
  for (const b of binned) {
    rel += b.n * Math.pow(b.predicted - b.observed, 2);   // mean forecast vs observed frequency, per bin
    res += b.n * Math.pow(b.observed - base, 2);          // observed frequency vs base rate, per bin
  }
  rel /= rs.length; res /= rs.length;
  const bs = brier(rs);
  return { reliability: rel, resolution: res, uncertainty, withinBin: bs - (rel - res + uncertainty), brier: bs, baseRate: base, n: rs.length, bins: binned.length };
}

export function hitRates(records, keyFn = r => r.route || 'all') {
  const groups = {};
  for (const r of records) {
    if (!decided(r)) continue;
    const k = keyFn(r);
    groups[k] ||= { key: k, bids: 0, wins: 0, bidValue: 0, wonValue: 0 };
    groups[k].bids++;
    groups[k].bidValue += r.value || 0;
    if (r.outcome === 'won') { groups[k].wins++; groups[k].wonValue += r.value || 0; }
  }
  return Object.values(groups).map(g => ({
    ...g,
    hitRateCount: g.bids ? g.wins / g.bids : null,
    hitRateValue: g.bidValue ? g.wonValue / g.bidValue : null,
  }));
}

export function criterionSeparation(records) {
  const acc = {};
  for (const r of records) {
    if (!decided(r) || !r.scores) continue;
    for (const [id, s] of Object.entries(r.scores)) {
      if (s == null) continue;
      acc[id] ||= { id, won: [], lost: [] };
      acc[id][r.outcome].push(s);
    }
  }
  const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  return Object.values(acc).map(c => {
    const w = mean(c.won), l = mean(c.lost);
    return { id: c.id, wonMean: w, lostMean: l, nWon: c.won.length, nLost: c.lost.length, separation: w != null && l != null ? w - l : null };
  }).sort((a, b) => Math.abs(b.separation ?? 0) - Math.abs(a.separation ?? 0));
}

/** Verdict-vs-human agreement: how often the recorded human decision matched the tool's band. INCOMPLETE is not a verdict, so it cannot be overridden. */
export function overrideRate(records) {
  const rs = records.filter(r => r.bandShown && r.bandShown !== 'INCOMPLETE' && r.decisionTaken);
  if (!rs.length) return null;
  const overrides = rs.filter(r => (r.bandShown === 'GO' || r.bandShown === 'APPROVAL') !== (r.decisionTaken === 'bid')).length;
  return { n: rs.length, overrides, rate: overrides / rs.length };
}
