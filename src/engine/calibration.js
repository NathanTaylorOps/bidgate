/**
 * Calibration loop — closes the loop between predicted P(win) / verdict and what actually happened.
 *
 *  brier(records)          BS = (1/N) Σ (p − o)²   o ∈ {0,1}. 0.25 = always saying 50 %; lower is better.
 *  reliability(records)    5-bin reliability diagram — 5 bins so each bin holds roughly ten or more outcomes in the
 *                          first year of logging (10 bins would be noise).
 *  hitRates(records)       by count and by dollar, split by route / verdict / preset.
 *  criterionSeparation()   won-vs-lost mean score per criterion — an "explore" view, NOT a regression.
 *                          With < 60 outcomes do not fit a model (ADR-0006); show the separation and let the user reason.
 *  murphy(records)         Murphy decomposition: reliability − resolution + uncertainty.
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

export function murphy(records) {
  const rs = records.filter(r => decided(r) && r.pwin != null);
  if (!rs.length) return null;
  const base = rs.filter(r => r.outcome === 'won').length / rs.length;
  const uncertainty = base * (1 - base);
  // Group by unique forecast value so the decomposition is exact (BS = REL − RES + UNC).
  const groups = {};
  for (const r of rs) {
    const k = r.pwin.toFixed(6);
    groups[k] ||= { n: 0, predicted: r.pwin, won: 0 };
    groups[k].n++; groups[k].won += r.outcome === 'won' ? 1 : 0;
  }
  let rel = 0, res = 0;
  for (const g of Object.values(groups)) {
    const obs = g.won / g.n;
    rel += g.n * Math.pow(g.predicted - obs, 2);
    res += g.n * Math.pow(obs - base, 2);
  }
  rel /= rs.length; res /= rs.length;
  return { reliability: rel, resolution: res, uncertainty, brier: rel - res + uncertainty, baseRate: base, n: rs.length };
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

/** Verdict-vs-human agreement: how often the recorded human decision matched the tool's band. */
export function overrideRate(records) {
  const rs = records.filter(r => r.bandShown && r.decisionTaken);
  if (!rs.length) return null;
  const overrides = rs.filter(r => (r.bandShown === 'GO' || r.bandShown === 'APPROVAL') !== (r.decisionTaken === 'bid')).length;
  return { n: rs.length, overrides, rate: overrides / rs.length };
}
