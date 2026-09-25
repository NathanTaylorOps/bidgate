/**
 * Monte Carlo on value, margin and P(win).
 *
 *  Value and margin — beta-PERT three-point inputs:
 *         mean = (min + 4·mode + max) / 6
 *         α = 1 + 4·(mode − min)/(max − min),  β = 1 + 4·(max − mode)/(max − min)
 *         sample Beta(α, β) via two Gamma draws (Marsaglia–Tsang), scale to [min, max].
 *
 *  P(win) — Beta(κ·p, κ·(1 − p)) around the modelled p, mean exactly p, concentration κ.
 *         κ is the Beta-Binomial posterior weight from the P(win) model: α pseudo-bids (10) + the bids you have
 *         logged on this route. With no history the spread is that of a 10-bid record (sd ≈ 0.15 at p = 0.33);
 *         it tightens as outcomes accumulate, which is the point. A {min, mode, max} triple is still accepted (PERT).
 *
 * Outputs P10 / P50 / P90 of margin and EV, P(margin < 0), P(EV < 0), histogram.
 * Deterministic when given a seed (mulberry32) — tests rely on this.
 */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a hash of a string → 32-bit seed, so a bid id maps to a stable RNG stream. */
export function seedFromString(str) {
  let h = 0x811c9dc5;
  for (const ch of String(str ?? '')) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

function randn(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Marsaglia–Tsang gamma sampler, shape k ≥ 1 handled directly; k < 1 via boost. */
function gamma(k, rng) {
  if (k < 1) return gamma(k + 1, rng) * Math.pow(rng(), 1 / k);
  const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x, v;
    do { x = randn(rng); v = 1 + c * x; } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function beta(a, b, rng) {
  const x = gamma(a, rng), y = gamma(b, rng);
  return x / (x + y);
}

/** Beta(κ·mean, κ·(1 − mean)) draw: mean preserved exactly, concentration κ (κ → ∞ is a point mass). */
export function sampleBetaMean(mean, kappa, rng) {
  const m = Math.min(0.999, Math.max(0.001, Number.isFinite(mean) ? mean : 0.5));
  const k = Number.isFinite(kappa) && kappa > 0 ? kappa : 10;
  return beta(m * k, (1 - m) * k, rng);
}

/**
 * Sort a three-point estimate so min ≤ mode ≤ max. Callers (UI inputs, share links, imports) can hand us
 * a mode below the low or above the high; without this the Beta shape parameters go negative and the
 * Gamma sampler returns NaN. Non-finite inputs are coerced to 0 so the sort is total.
 */
export function orderedTriple(a, b, c) {
  return [a, b, c].map(x => (Number.isFinite(x) ? x : 0)).sort((x, y) => x - y);
}

export function pertParams(min, mode, max) {
  const [lo, md, hi] = orderedTriple(min, mode, max);
  if (hi <= lo) return { alpha: 1, beta: 1, mean: md };
  const alpha = 1 + 4 * (md - lo) / (hi - lo);
  const bta = 1 + 4 * (hi - md) / (hi - lo);
  return { alpha, beta: bta, mean: (lo + 4 * md + hi) / 6 };
}

export function samplePert(min, mode, max, rng) {
  const [lo, md, hi] = orderedTriple(min, mode, max);
  if (hi <= lo) return md;
  const { alpha, beta: b } = pertParams(lo, md, hi);
  return lo + beta(alpha, b, rng) * (hi - lo);
}

export function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/**
 * @param {object} a {
 *   value: {min, mode, max}, marginPct: {min, mode, max},
 *   pwin: {mean, kappa} (Beta around the modelled p) — or {min, mode, max} (PERT),
 *   bidCost, postAwardCost, levyRate (fraction of value), iterations, seed
 * }
 * EV per run = p · (V·m − V·levyRate − postAwardCost) − bidCost, the same identity as expectedValue() in ev.js.
 */
export function simulate(a) {
  const n = a.iterations || 5000;
  const rng = mulberry32(a.seed ?? 42);
  const margins = new Array(n), evs = new Array(n), profits = new Array(n);
  const drawP = !a.pwin ? () => 1
    : a.pwin.kappa != null || a.pwin.mean != null ? () => sampleBetaMean(a.pwin.mean, a.pwin.kappa, rng)
    : () => samplePert(a.pwin.min, a.pwin.mode, a.pwin.max, rng);
  for (let i = 0; i < n; i++) {
    const V = samplePert(a.value.min, a.value.mode, a.value.max, rng);
    const m = samplePert(a.marginPct.min, a.marginPct.mode, a.marginPct.max, rng) / 100;
    const p = drawP();
    const profit = V * m - V * (a.levyRate || 0);
    margins[i] = m * 100;
    profits[i] = profit;
    evs[i] = p * (profit - (a.postAwardCost || 0)) - (a.bidCost || 0);
  }
  const sm = margins.slice().sort((x, y) => x - y);
  const se = evs.slice().sort((x, y) => x - y);
  const sp = profits.slice().sort((x, y) => x - y);
  const pLoss = margins.filter(x => x < 0).length / n;
  const pEvNeg = evs.filter(x => x < 0).length / n;
  return {
    n,
    margin: { p10: quantile(sm, 0.1), p50: quantile(sm, 0.5), p90: quantile(sm, 0.9), mean: sm.reduce((x, y) => x + y, 0) / n },
    profit: { p10: quantile(sp, 0.1), p50: quantile(sp, 0.5), p90: quantile(sp, 0.9) },
    ev: { p10: quantile(se, 0.1), p50: quantile(se, 0.5), p90: quantile(se, 0.9), mean: se.reduce((x, y) => x + y, 0) / n },
    pLoss, pEvNeg,
    histogram: histogram(se, 24),
  };
}

export function histogram(sorted, bins = 20) {
  if (!sorted.length) return [];
  const min = sorted[0], max = sorted[sorted.length - 1];
  const w = (max - min) / bins || 1;
  const out = Array.from({ length: bins }, (_, i) => ({ x0: min + i * w, x1: min + (i + 1) * w, n: 0 }));
  for (const v of sorted) {
    let k = Math.floor((v - min) / w);
    if (k >= bins) k = bins - 1;
    out[k].n++;
  }
  return out;
}
