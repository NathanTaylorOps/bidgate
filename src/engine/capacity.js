/**
 * Capacity & cash module for a flooring / tile / specialty-surface subcontractor.
 *
 *  portfolioPeak()    Month-by-month retention / AR exposure across concurrent jobs. Each job follows a logistic
 *                     S-curve (Kenley–Wilson form): cost is spent as work proceeds, billing follows after the pay
 *                     lag and net of retention, retention is returned at completion + lag. A job's exposure in a
 *                     month is max(0, spent − received): once a job has been paid more than it cost, its profit
 *                     is cash on hand (the `cash` input), not a credit line for another job, so it is not netted
 *                     against other jobs' exposure. Portfolio exposure = Σ per-job exposure; peak = its maximum.
 *
 *  peakCash(job)      Peak exposure for ONE job, read off the same simulation (portfolioPeak([job])). Because the
 *                     portfolio figure is a sum of non-negative terms, a job's own peak can never exceed the peak
 *                     of any portfolio that includes it, and it is bounded by V × (1 − g): the most a job can be
 *                     out of pocket is its cost. No peer-reviewed constant exists for a specialty sub's cash curve;
 *                     the ±25 % range is a judgement call, validate against your own draw history.
 *
 *  capacityGates()    Hard capacity gates: portfolio exposure > 100 % of cash + credit line,
 *                     no estimator and no crew assignable, working capital thin relative to backlog + bid.
 */

export const DEFAULT_PAY_LAG = 1.5;
export const DEFAULT_RETENTION = 0.10;

/** Standard S-curve cumulative fraction (logistic, Kenley–Wilson style) */
export function sCurve(t) { // t in [0,1]
  const a = -0.1, b = 1.7;           // NZ $5–10M parameters (CIB)
  const z = a + b * Math.log(t / (1 - t + 1e-9) + 1e-9);
  const v = 1 / (1 + Math.exp(-z));
  return Math.min(1, Math.max(0, v));
}

/** Exposure (≥ 0) of one job at month m: cost spent to date minus cash received to date, floored at zero. */
function jobExposure(j, m) {
  const D = j.durationMonths || 1;
  const start = j.startMonth || 0;
  const lag = j.payLagMonths ?? DEFAULT_PAY_LAG;
  const ret = j.retention ?? DEFAULT_RETENTION;
  const t = (m - start) / D;
  if (t <= 0) return 0;
  const tc = Math.min(1, t);
  const spent = j.value * (1 - (j.margin || 0)) * sCurve(tc);
  const tb = Math.max(0, Math.min(1, (m - start - lag) / D));
  const billed = j.value * sCurve(tb) * (1 - ret);
  const front = (j.frontLoad || 0) * j.value;
  const retentionBack = t >= 1 + lag / D ? j.value * ret : 0;
  return Math.max(0, spent - (billed + front + retentionBack));
}

/**
 * Month-by-month portfolio retention / AR exposure across concurrent jobs.
 * jobs: [{ value, durationMonths, startMonth (0 = now, negative = already running), payLagMonths, retention, margin, frontLoad }]
 * Returns { series: [{month, cash}], peak, peakMonth } — `cash` is −exposure so it plots as a cash position (≤ 0).
 */
export function portfolioPeak(jobs, horizonMonths = 24) {
  const series = [];
  let peak = 0, peakMonth = 0;
  for (let m = 0; m <= horizonMonths; m++) {
    let exposure = 0;
    for (const j of jobs) if (j && j.value) exposure += jobExposure(j, m);
    series.push({ month: m, cash: -exposure });
    if (exposure > peak) { peak = exposure; peakMonth = m; }
  }
  return { series, peak, peakMonth };
}

/**
 * Peak exposure for one job — the same simulation as the portfolio, so the two numbers agree by construction.
 * Horizon covers the job plus the pay lag and retention release.
 */
export function peakCash({ value, durationMonths, payLagMonths = DEFAULT_PAY_LAG, retention = DEFAULT_RETENTION, margin = 0.20, frontLoad = 0 }) {
  if (!value || !durationMonths) return { peak: 0, low: 0, high: 0, pct: 0, peakMonth: 0 };
  const job = { value, durationMonths, startMonth: 0, payLagMonths, retention, margin, frontLoad };
  const horizon = Math.ceil(durationMonths + payLagMonths) + 2;
  const { peak, peakMonth } = portfolioPeak([job], horizon);
  return { peak, low: peak * 0.75, high: peak * 1.25, pct: peak / value, peakMonth };
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
