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
 */

export function swingWeights(swings) {
  const entries = Object.entries(swings).filter(([, v]) => v > 0);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  const out = {};
  for (const [k, v] of entries) out[k] = (v / total) * 100;
  return out;
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

/** Return {i,j,delta} of the upper-triangle cell whose replacement by w_i/w_j most reduces CR. */
export function ahpWorstCell(A) {
  const n = A.length;
  const base = ahp(A);
  let best = null;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const B = A.map(r => r.slice());
    const ideal = base.weights[i] / base.weights[j];
    B[i][j] = ideal; B[j][i] = 1 / ideal;
    const r = ahp(B);
    const delta = base.cr - r.cr;
    if (!best || delta > best.delta) best = { i, j, delta, current: A[i][j], suggested: ideal };
  }
  return best;
}
