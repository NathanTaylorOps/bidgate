/**
 * Scoring engine — three stages, in order:
 *
 *  Stage 1  GATES (non-compensatory, conjunctive screening).
 *           Any gate criterion scored at its gate level, or any manual deal-killer toggled, → verdict NO-GO (gated).
 *           The compensatory score is still computed and returned (greyed in the UI) so users learn what the gate protects.
 *
 *  Stage 2  COMPENSATORY SCORE per axis.
 *           Attractiveness axis = weighted mean of group means (group weights from preset, normalised over groups that
 *           have at least one scored criterion). Each criterion 1–5 → 0–100. Result 0–100.
 *           Winnability axis = mean of 'compete' criteria → 0–100 (fed to P(win) as the position score).
 *
 *  Stage 3  WEAKEST-LINK FLOOR.
 *           Any criterion with `floor` scored ≤ floor.at caps the verdict at CONDITIONAL.
 *
 * Verdict bands (attractiveness): ≥ 75 GO · 60–74 GO WITH APPROVAL · 40–59 CONDITIONAL · < 40 NO-GO.
 * The 60–74 band is a routed state (Deltek Vantagepoint pattern), not just "amber".
 *
 * COVERAGE. No verdict band is issued while any gate criterion is unscored, or while weighted coverage
 * (see VERDICT_COVERAGE_MIN in criteria.js) is below the threshold: the band is INCOMPLETE and the result
 * says how many more criteria to score. A gate criterion that *is* scored at its gate level still gates —
 * gates never wait for coverage.
 *
 * Pure functions. No DOM.
 */

import { CRITERIA, CRITERIA_BY_ID, GROUPS, VERDICT_COVERAGE_MIN } from '../data/criteria.js';
import { mulberry32, seedFromString } from './montecarlo.js';

export const BANDS = {
  GO:          { id: 'GO',          label: 'GO',                 min: 75, icon: '✔', tone: 'good' },
  APPROVAL:    { id: 'APPROVAL',    label: 'GO WITH APPROVAL',   min: 60, icon: '◐', tone: 'mid' },
  CONDITIONAL: { id: 'CONDITIONAL', label: 'CONDITIONAL',        min: 40, icon: '▲', tone: 'warn' },
  NOGO:        { id: 'NOGO',        label: 'NO-GO',              min: 0,  icon: '✖', tone: 'bad' },
  GATED:       { id: 'GATED',       label: 'NO-GO (GATED)',      min: -1, icon: '⛔', tone: 'bad' },
  INCOMPLETE:  { id: 'INCOMPLETE',  label: 'INCOMPLETE',         min: -2, icon: '◌', tone: 'neutral' },
};

/** True for a band that is an actual verdict (GO … GATED); false for INCOMPLETE or null. */
export const isVerdict = band => !!band && band.id !== 'INCOMPLETE';

export function bandForScore(score) {
  if (score >= BANDS.GO.min) return BANDS.GO;
  if (score >= BANDS.APPROVAL.min) return BANDS.APPROVAL;
  if (score >= BANDS.CONDITIONAL.min) return BANDS.CONDITIONAL;
  return BANDS.NOGO;
}

/** Criteria visible for a preset's contexts. */
export function activeCriteria(preset) {
  const ctx = preset.contexts;
  return CRITERIA.filter(c => c.contexts.some(x => ctx.includes(x)));
}

/** Normalise group weights over groups that are present in the preset AND have ≥1 scored criterion. */
export function effectiveGroupWeights(preset, scores, criteriaList) {
  const present = {};
  for (const c of criteriaList) {
    if (c.axis !== 'attractiveness') continue;
    if (scores[c.id] == null) continue;
    present[c.group] = true;
  }
  const raw = {};
  let total = 0;
  for (const gid of Object.keys(present)) {
    const w = preset.weights[gid] || 0;
    if (w <= 0) continue;
    raw[gid] = w; total += w;
  }
  const norm = {};
  for (const gid of Object.keys(raw)) norm[gid] = raw[gid] / total;
  return { normalised: norm, totalRaw: total };
}

/**
 * Weighted coverage and the shortest path to a verdict.
 * Each attractiveness criterion is worth (its group's share of total attractiveness weight) / (criteria in the group).
 * `moreNeeded` = every unscored gate criterion (mandatory) + the fewest further criteria, largest weight first,
 * that lift coverage to VERDICT_COVERAGE_MIN.
 */
export function coverageGap(preset, scores, criteriaList, threshold = VERDICT_COVERAGE_MIN) {
  const groupCount = {};
  let wtot = 0;
  for (const c of criteriaList) if (c.axis === 'attractiveness') groupCount[c.group] = (groupCount[c.group] || 0) + 1;
  for (const gid of Object.keys(groupCount)) wtot += Math.max(0, preset.weights[gid] || 0);
  const worth = c => (c.axis === 'attractiveness' && wtot > 0 ? Math.max(0, preset.weights[c.group] || 0) / wtot / groupCount[c.group] : 0);

  let covered = 0;
  const unscoredGates = [];
  const unscoredOther = [];
  for (const c of criteriaList) {
    if (scores[c.id] != null) { covered += worth(c); continue; }
    if (c.gate) unscoredGates.push(c); else if (c.axis === 'attractiveness') unscoredOther.push(c);
  }
  let moreNeeded = unscoredGates.length;
  let projected = covered + unscoredGates.reduce((s, c) => s + worth(c), 0);
  unscoredOther.sort((a, b) => worth(b) - worth(a));
  for (const c of unscoredOther) {
    if (projected >= threshold - 1e-9) break;
    projected += worth(c); moreNeeded++;
  }
  return {
    weightedCoverage: covered,
    threshold,
    unscoredGates: unscoredGates.map(c => ({ id: c.id, name: c.name })),
    moreNeeded,
    complete: unscoredGates.length === 0 && covered >= threshold - 1e-9,
  };
}

/**
 * Main entry.
 * @param {object} preset
 * @param {object} scores        { criterionId: 1..5 }
 * @param {string[]} dealKillers ids of manual deal-killer toggles that are ON
 * @param {object} [opts]        { weightsOverride: {groupId: number} }
 */
export function evaluate(preset, scores, dealKillers = [], opts = {}) {
  const p = opts.weightsOverride ? { ...preset, weights: { ...preset.weights, ...opts.weightsOverride } } : preset;
  const list = activeCriteria(p);

  // Stage 1 — gates
  const gateHits = [];
  for (const c of list) {
    const s = scores[c.id];
    if (c.gate && s != null && s <= c.gate.at) gateHits.push({ id: c.id, name: c.name, score: s, kind: 'criterion' });
  }
  for (const dk of dealKillers) gateHits.push({ id: dk, name: dk, kind: 'manual' });

  // Stage 2 — compensatory
  const groupStats = {};
  for (const g of GROUPS) groupStats[g.id] = { sum: 0, n: 0, count: 0, mean: null, pct: null, contribution: 0, weight: 0 };
  let scoredCount = 0;
  for (const c of list) {
    groupStats[c.group].count++;
    const s = scores[c.id];
    if (s == null) continue;
    scoredCount++;
    groupStats[c.group].sum += s;
    groupStats[c.group].n++;
  }
  for (const g of GROUPS) {
    const gs = groupStats[g.id];
    if (gs.n > 0) { gs.mean = gs.sum / gs.n; gs.pct = ((gs.mean - 1) / 4) * 100; }
  }

  const { normalised } = effectiveGroupWeights(p, scores, list);
  let attractiveness = 0;
  for (const gid of Object.keys(normalised)) {
    const gs = groupStats[gid];
    gs.weight = normalised[gid];
    gs.contribution = gs.pct * normalised[gid];
    attractiveness += gs.contribution;
  }
  const anyAttractScored = Object.keys(normalised).length > 0;

  const compete = groupStats.compete;
  const winnability = compete.n > 0 ? compete.pct : null;

  // Stage 3 — floor
  const floorHits = [];
  for (const c of list) {
    const s = scores[c.id];
    if (c.floor && s != null && s <= c.floor.at) floorHits.push({ id: c.id, name: c.name, score: s });
  }

  // Coverage — a verdict needs every gate scored and enough of the weighted card filled in
  const gap = coverageGap(p, scores, list);

  // Verdict
  let band;
  if (gateHits.length) band = BANDS.GATED;
  else if (!anyAttractScored || !gap.complete) band = BANDS.INCOMPLETE;
  else {
    band = bandForScore(attractiveness);
    if (floorHits.length && (band.id === 'GO' || band.id === 'APPROVAL')) band = BANDS.CONDITIONAL;
  }

  const totalCount = list.filter(c => c.axis === 'attractiveness').length + compete.count;

  return {
    attractiveness: anyAttractScored ? attractiveness : null,
    winnability,
    band,
    gateHits,
    floorHits,
    groupStats,
    scoredCount,
    totalCount,
    coverage: totalCount ? scoredCount / totalCount : 0,
    weightedCoverage: gap.weightedCoverage,
    coverageThreshold: gap.threshold,
    unscoredGates: gap.unscoredGates,
    moreNeeded: gap.moreNeeded,
    criteria: list,
  };
}

/**
 * Switching values — the smallest single-criterion change that flips the band, and per-criterion swing (tornado).
 * One-at-a-time: each scored attractiveness criterion set to 1 and 5, recompute attractiveness.
 */
export function sensitivity(preset, scores, dealKillers = []) {
  const base = evaluate(preset, scores, dealKillers);
  if (base.attractiveness == null) return { base, rows: [], flips: [] };
  const rows = [];
  const flips = [];
  for (const c of base.criteria) {
    if (c.axis !== 'attractiveness') continue;
    if (scores[c.id] == null) continue;
    const lo = evaluate(preset, { ...scores, [c.id]: 1 }, dealKillers);
    const hi = evaluate(preset, { ...scores, [c.id]: 5 }, dealKillers);
    const loScore = lo.attractiveness, hiScore = hi.attractiveness;
    rows.push({ id: c.id, name: c.name, group: c.group, current: scores[c.id], lo: loScore, hi: hiScore, swing: hiScore - loScore });

    // Find the minimal step that changes the band (either direction)
    const cur = scores[c.id];
    for (let s = cur - 1; s >= 1; s--) {
      const r = evaluate(preset, { ...scores, [c.id]: s }, dealKillers);
      if (r.band && base.band && r.band.id !== base.band.id) { flips.push({ id: c.id, name: c.name, from: cur, to: s, band: r.band, direction: 'down' }); break; }
    }
    for (let s = cur + 1; s <= 5; s++) {
      const r = evaluate(preset, { ...scores, [c.id]: s }, dealKillers);
      if (r.band && base.band && r.band.id !== base.band.id) { flips.push({ id: c.id, name: c.name, from: cur, to: s, band: r.band, direction: 'up' }); break; }
    }
  }
  rows.sort((a, b) => b.swing - a.swing);
  flips.sort((a, b) => Math.abs(a.to - a.from) - Math.abs(b.to - b.from));
  return { base, rows, flips };
}

/**
 * Weight-perturbation robustness: sample N random weight vectors within ±pct of the preset weights,
 * return the share of samples that land in the same band as the base verdict.
 * Deterministic: the sampler is seeded (mulberry32) so the same bid always reports the same figure —
 * pass `seed` (e.g. derived from the bid id via seedFromString) or your own `rng`.
 */
export function robustness(preset, scores, dealKillers = [], { samples = 500, pct = 0.2, seed = 1, rng = null } = {}) {
  const base = evaluate(preset, scores, dealKillers);
  if (!isVerdict(base.band) || base.band.id === 'GATED') return { base, agreement: null, bands: {} };
  const draw = rng || mulberry32(typeof seed === 'string' ? seedFromString(seed) : seed);
  const bands = {};
  let same = 0;
  const gids = Object.keys(preset.weights).filter(g => g !== 'compete' && preset.weights[g] > 0);
  for (let i = 0; i < samples; i++) {
    const w = {};
    for (const g of gids) w[g] = preset.weights[g] * (1 + (draw() * 2 - 1) * pct);
    const r = evaluate(preset, scores, dealKillers, { weightsOverride: w });
    const id = r.band ? r.band.id : 'NONE';
    bands[id] = (bands[id] || 0) + 1;
    if (id === base.band.id) same++;
  }
  return { base, agreement: same / samples, bands };
}

/** Weakest links: scored criteria ≤ 2, sorted by (weight × deficit). */
export function weakestLinks(result, scores, limit = 5) {
  const out = [];
  for (const c of result.criteria) {
    const s = scores[c.id];
    if (s == null || s > 2) continue;
    const gw = result.groupStats[c.group]?.weight || 0;
    out.push({ id: c.id, name: c.name, group: c.group, score: s, impact: gw * (3 - s), gate: !!c.gate, floor: !!c.floor });
  }
  out.sort((a, b) => b.impact - a.impact);
  return out.slice(0, limit);
}

export { CRITERIA_BY_ID, VERDICT_COVERAGE_MIN };
