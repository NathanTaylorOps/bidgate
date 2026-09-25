/**
 * Weight derivation.
 *
 *  swingWeights(ranks)   — Swing weighting (UK Government Analysis Function recommended method):
 *                          the user gives each group a "swing" score 0–100 where the most important swing = 100.
 *                          Normalise to sum 100.
 *
 *  ahp(matrix)           — Analytic Hierarchy Process (Saaty): reciprocal pairwise matrix on the 1–9 scale →
 *                          priority vector via normalised row geometric means → λmax → CI → CR.
 *                          CR > 0.10 ⇒ inconsistent judgements (warn).
 *
 *  ahpWorstCell(matrix)  — which single pairwise judgement most reduces CR if revised (nudge for the user).
 *                          The suggested replacement is snapped to the Saaty scale (1/9 … 1/2, 1 … 9) so it is
 *                          always a value the user can actually pick.
 */

export function swingWeights(swings) {
  const entries = Object.entries(swings).filter(([, v]) => v > 0);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  const out = {};
  for (const [k, v] of entries) out[k] = (v / total) * 100;
  return out;
}

/** The Saaty fundamental scale: 1–9 and their reciprocals (even values are the "between" judgements). */
export const SAATY_SCALE = [1 / 9, 1 / 8, 1 / 7, 1 / 6, 1 / 5, 1 / 4, 1 / 3, 1 / 2, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Nearest Saaty value to a ratio, measured on the log scale (so 2.4 → 2 and 1/2.4 → 1/2 are symmetric). */
export function nearestSaaty(ratio) {
  if (!Number.isFinite(ratio) || ratio <= 0) return 1;
  let best = 1, bd = Infinity;
  for (const v of SAATY_SCALE) { const d = Math.abs(Math.log(v) - Math.log(ratio)); if (d < bd) { bd = d; best = v; } }
  return best;
}

/** Saaty random index by matrix order n. */
export const RI = { 1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49 };

/**
 * @param {number[][]} A  square reciprocal matrix, A[i][j] = importance of i over j (1..9 or reciprocals)
 * @returns {{ weights: number[], lambdaMax: number, ci: number, cr: number, consistent: boolean }}
 */
export function ahp(A) {
  const n = A.length;
  if (n === 0) return { weights: [], lambdaMax: 0, ci: 0, cr: 0, consistent: true };
  // geometric mean of each row
  const gm = A.map(row => Math.pow(row.reduce((p, x) => p * x, 1), 1 / n));
  const sum = gm.reduce((a, b) => a + b, 0);
  const w = gm.map(x => x / sum);
  // λmax ≈ mean of (A·w)_i / w_i
  let lambda = 0;
  for (let i = 0; i < n; i++) {
    let aw = 0;
    for (let j = 0; j < n; j++) aw += A[i][j] * w[j];
    lambda += aw / w[i];
  }
  lambda /= n;
  const ci = n > 1 ? (lambda - n) / (n - 1) : 0;
  const ri = RI[n] ?? 1.49;
  const cr = ri > 0 ? ci / ri : 0;
  return { weights: w, lambdaMax: lambda, ci, cr, consistent: cr <= 0.10 };
}

/** Build a reciprocal matrix from upper-triangle judgements { "i,j": value }. */
export function reciprocalMatrix(n, judgements) {
  const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : null)));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const v = judgements[`${i},${j}`] ?? 1;
    A[i][j] = v; A[j][i] = 1 / v;
  }
  return A;
}

/**
 * Return {i, j, delta, current, suggested, ideal} of the upper-triangle cell whose replacement by w_i/w_j most
 * reduces CR. `suggested` is `ideal` snapped to the Saaty scale; `delta` is the CR reduction from the snapped value.
 */
export function ahpWorstCell(A) {
  const n = A.length;
  const base = ahp(A);
  let best = null;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const B = A.map(r => r.slice());
    const ideal = base.weights[i] / base.weights[j];
    const suggested = nearestSaaty(ideal);
    B[i][j] = suggested; B[j][i] = 1 / suggested;
    const r = ahp(B);
    const delta = base.cr - r.cr;
    if (!best || delta > best.delta) best = { i, j, delta, current: A[i][j], suggested, ideal };
  }
  return best;
}
