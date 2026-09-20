/**
 * Monte Carlo on margin and P(win) using beta-PERT three-point inputs.
 *
 *  PERT:  mean = (min + 4·mode + max) / 6
 *         α = 1 + 4·(mode − min)/(max − min),  β = 1 + 4·(max − mode)/(max − min)
 *         sample Beta(α, β) via two Gamma draws (Marsaglia–Tsang), scale to [min, max].
 *
 * Outputs P10 / P50 / P90 of margin and EV, P(margin < 0), P(EV < 0), histogram.
 * Deterministic when given a seeded rng (mulberry32) — tests rely on this.
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
 *   value: {min, mode, max}, marginPct: {min, mode, max}, pwin: {min, mode, max} (0–1),
 *   bidCost, levyRate (fraction of value), iterations, seed
 * }
 */
export function simulate(a) {
  const n = a.iterations || 5000;
  const rng = mulberry32(a.seed ?? 42);
  const margins = new Array(n), evs = new Array(n), profits = new Array(n);
  for (let i = 0; i < n; i++) {
    const V = samplePert(a.value.min, a.value.mode, a.value.max, rng);
    const m = samplePert(a.marginPct.min, a.marginPct.mode, a.marginPct.max, rng) / 100;
    const p = a.pwin ? samplePert(a.pwin.min, a.pwin.mode, a.pwin.max, rng) : 1;
    const profit = V * m - V * (a.levyRate || 0);
    margins[i] = m * 100;
    profits[i] = profit;
    evs[i] = p * profit - (a.bidCost || 0);
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
