/**
 * Capacity & cash module for a flooring / tile / specialty-surface subcontractor.
 *
 *  peakCash(job)      Peak negative cash for one job (first-principles S-curve approximation):
 *                       PeakCash ≈ V × [ (L/D) × 1.6 + r × (1 − g) − f ]
 *                       V value, D duration (months), L pay lag (months), r retention fraction,
 *                       g gross margin fraction, f front-loading fraction (deposit / mobilisation as fraction of V).
 *                       1.6 ≈ peak-to-average burn ratio of a standard S-curve.
 *                     No peer-reviewed constant exists; present as a range (±25 %).
 *
 *  portfolioPeak()    Overlap per-job S-curves month by month; return max cumulative negative cash.
 *                     For a specialty subcontractor this is a lightweight retention/AR-exposure check,
 *                     not the elaborate portfolio-peak-cash model a general contractor needs — kept
 *                     simple deliberately (see docs/METHODOLOGY.md §Capacity).
 *
 *  capacityGates()    Hard capacity gates: portfolio cash/retention exposure > 100 % of cash + credit line,
 *                     no estimator and no crew assignable, working capital thin relative to backlog + bid.
 */

export const PEAK_RATIO = 1.6;

export function peakCash({ value, durationMonths, payLagMonths = 1.5, retention = 0.10, margin = 0.20, frontLoad = 0 }) {
  if (!value || !durationMonths) return { peak: 0, low: 0, high: 0, pct: 0 };
  const pct = (payLagMonths / durationMonths) * PEAK_RATIO + retention * (1 - margin) - frontLoad;
  const peak = Math.max(0, value * pct);
  return { peak, low: peak * 0.75, high: peak * 1.25, pct: Math.max(0, pct) };
}

/** Standard S-curve cumulative fraction (logistic, Kenley–Wilson style) */
export function sCurve(t) { // t in [0,1]
  const a = -0.1, b = 1.7;           // NZ $5–10M parameters (CIB)
  const z = a + b * Math.log(t / (1 - t + 1e-9) + 1e-9);
  const v = 1 / (1 + Math.exp(-z));
  return Math.min(1, Math.max(0, v));
}

/**
 * Month-by-month portfolio negative cash / retention-and-AR exposure across concurrent jobs.
 * jobs: [{ value, durationMonths, startMonth (0 = now), payLagMonths, retention, margin, frontLoad }]
 * Returns { series: [{month, cash}], peak, peakMonth }
 */
export function portfolioPeak(jobs, horizonMonths = 24) {
  const series = [];
  let peak = 0, peakMonth = 0;
  for (let m = 0; m <= horizonMonths; m++) {
    let cash = 0;
    for (const j of jobs) {
      const D = j.durationMonths || 1;
      const t = (m - (j.startMonth || 0)) / D;
      if (t <= 0) continue;
      const tc = Math.min(1, t);
      const spent = j.value * (1 - (j.margin || 0)) * sCurve(tc);
      const tb = Math.max(0, Math.min(1, (m - (j.startMonth || 0) - (j.payLagMonths ?? 1.5)) / D));
      const billed = j.value * sCurve(tb) * (1 - (j.retention ?? 0.1));
      const front = (j.frontLoad || 0) * j.value;
      const retentionBack = t >= 1 + ((j.payLagMonths ?? 1.5) / D) ? j.value * (j.retention ?? 0.1) : 0;
      cash += billed + front + retentionBack - spent;
    }
    series.push({ month: m, cash });
    if (cash < peak) { peak = cash; peakMonth = m; }
  }
  return { series, peak: -peak, peakMonth };
}

/**
 * Hard gates from the capacity module.
 * @returns [{ id, label, detail }]
 */
export function capacityGates(a) {
  const hits = [];
  const g = a.preset.gates || {};
  if (a.portfolioPeak != null && a.facility != null && a.facility > 0 && a.portfolioPeak > a.facility) {
    hits.push({ id: 'cash', label: 'Retention / AR exposure across concurrent jobs exceeds cash + credit line', detail: `${Math.round(a.portfolioPeak)} > ${Math.round(a.facility)}` });
  }
  if (a.estimatorLoadAfter != null && a.estimatorLoadAfter > (g.maxEstimatorLoad ?? 1) && a.crewLoadAfter != null && a.crewLoadAfter > (g.maxCrewLoad ?? 2)) {
    hits.push({ id: 'staff', label: 'No estimator and no installation crew assignable within maximum load', detail: `Estimator ${a.estimatorLoadAfter}/${g.maxEstimatorLoad ?? 1}, crew ${a.crewLoadAfter}/${g.maxCrewLoad ?? 2}` });
  }
  if (a.workingCapital != null && a.backlog != null && a.value) {
    const ratio = a.workingCapital / (a.backlog + a.value);
    if (ratio < 0.05) hits.push({ id: 'wc', label: 'Working capital < 5 % of backlog + bid', detail: `${(ratio * 100).toFixed(1)} %` });
  }
  return hits;
}
