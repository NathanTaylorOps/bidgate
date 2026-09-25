/**
 * One assessment path for a bid — used by the live editor, the sample loader and the pipeline, so a saved record
 * can never carry a verdict computed differently from the one on screen.
 *
 *  effectivePreset(preset, settingsOverride, bid)   preset weights → Settings overrides → this bid's own weights
 *                                                    (a share link carries the sender's weights on the bid only;
 *                                                    they never touch the recipient's saved settings).
 *  assess(preset, bid)                               gates → score → P(win) → EV → capacity → final band.
 *  pipelineRecord(a, bid, presetId, existing)        the saved-pipeline row. Once an outcome (won / lost / …) has
 *                                                    been recorded, the prediction fields are FROZEN: re-saving the
 *                                                    bid updates notes, names and the decision record only, so
 *                                                    calibration always compares the forecast made at the time
 *                                                    with what happened, never a forecast revised with hindsight.
 *
 * Pure functions. No DOM.
 */

import { ROUTES } from '../data/presets.js';
import { dealKillersFor } from '../data/dealkillers.js';
import { evaluate, BANDS } from './scoring.js';
import { pwin, winnersCurseFlag } from './pwin.js';
import { expectedValue } from './ev.js';
import { peakCash, portfolioPeak, capacityGates } from './capacity.js';

export function effectivePreset(preset, settingsOverride, bid) {
  let p = preset;
  if (settingsOverride && Object.keys(settingsOverride).length) p = { ...p, weights: { ...p.weights, ...settingsOverride } };
  if (bid?.weightsOverride && Object.keys(bid.weightsOverride).length) p = { ...p, weights: { ...p.weights, ...bid.weightsOverride } };
  return p;
}

/** Margin used for a live job's cash curve: its own if entered, else this bid's most-likely margin. */
export const liveJobMargin = (job, bid) => (job.marginPct ?? bid.econ.marginMode ?? 0) / 100;

export function assess(preset, b) {
  const p = effectivePreset(preset, null, b);
  const result = evaluate(p, b.scores, b.dealKillers);
  // Manual deal-killers come back from evaluate() with name = raw id (the engine has no label table);
  // map to the human label once here so every consumer — verdict panel, Decision view, memo, pipeline — reads it.
  const dkLabel = Object.fromEntries(dealKillersFor(p).map(k => [k.id, k.label]));
  result.gateHits = result.gateHits.map(g => g.kind === 'manual' ? { ...g, name: dkLabel[g.id] || g.id } : g);
  const route = ROUTES.find(r => r.id === b.route) || ROUTES[1];
  const pw = pwin({ route, wins: b.econ.wins, bids: b.econ.bids, competitors: b.competitors, winnability: result.winnability });
  const postAwardCost = 0; // no post-award cost line in the current presets; carried explicitly so EV and the Monte Carlo share one identity
  const ev = expectedValue({ value: b.value || 0, marginPct: b.econ.marginMode, p: pw.p, route, preset: p, scopeScore: b.scores.pr_scope, bidHours: b.econ.bidHours, loadedRate: b.econ.loadedRate, externalBidCost: b.econ.externalBidCost, postAwardCost });

  // capacity — this job and the live jobs go through the same simulation
  const cap = b.capacity;
  const facility = (cap.cash || 0) + (cap.creditLine || 0);
  const thisJob = b.value ? { value: b.value, durationMonths: b.durationMonths || 12, startMonth: 0, payLagMonths: cap.payLagMonths, retention: cap.retention, margin: (b.econ.marginMode || 0) / 100, frontLoad: cap.frontLoad } : null;
  const live = (cap.liveJobs || []).filter(j => j && j.value).map(j => ({ ...j, payLagMonths: cap.payLagMonths, retention: cap.retention, margin: liveJobMargin(j, b) }));
  const portBefore = portfolioPeak(live, 24);
  const portAfter = portfolioPeak(thisJob ? [...live, thisJob] : live, 24);
  const thisPeak = thisJob ? peakCash(thisJob) : null;
  const capGates = capacityGates({ preset: p, value: b.value || 0, portfolioPeak: portAfter.peak, facility: facility > 0 ? facility : null, estimatorLoadAfter: cap.estimatorLoadAfter, crewLoadAfter: cap.crewLoadAfter, workingCapital: cap.workingCapital, backlog: cap.backlogValue });

  // final band: capacity gates also gate
  let band = result.band;
  if (capGates.length) band = BANDS.GATED;
  const allGates = [...result.gateHits, ...capGates.map(g => ({ id: g.id, name: g.label, kind: 'capacity', detail: g.detail }))];

  const curse = winnersCurseFlag(b.competitors, b.scores.pr_scope, p.gates.winnersCurseBidders ?? 6);
  return { p, b, result, route, pw, ev, facility, portBefore, portAfter, thisPeak, capGates, allGates, band, curse };
}

/** Fields written at save time from the assessment; never rewritten once the outcome is decided. */
export const PREDICTION_FIELDS = ['attractiveness', 'winnability', 'band', 'bandShown', 'pwin', 'ev', 'value', 'route', 'gates'];

export const isDecided = rec => !!rec && !!rec.outcome && rec.outcome !== 'pending';

/**
 * Build (or refresh) the pipeline record for a bid.
 * @param {object} a         assess() output for the bid
 * @param {object} bid       the bid snapshot to store (already deep-copied by the caller)
 * @param {string} presetId
 * @param {object} [existing] the record currently in the pipeline with the same id, if any
 * @param {object} [opts]    { savedAt, sample }
 */
export function pipelineRecord(a, bid, presetId, existing = null, opts = {}) {
  const savedAt = opts.savedAt || new Date().toISOString();
  if (isDecided(existing)) {
    // Outcome recorded: the forecast is history. Keep every prediction field and the scored snapshot it was
    // made from; take only the narrative fields from the new save.
    return {
      ...existing,
      savedAt,
      decisionTaken: bid.decision?.decisionTaken || existing.decisionTaken || null,
      bid: { ...existing.bid, name: bid.name, client: bid.client, location: bid.location, notes: bid.notes, decision: bid.decision },
      frozen: true,
    };
  }
  const rec = {
    id: bid.id, bid, presetId, savedAt,
    attractiveness: a.result.attractiveness, winnability: a.result.winnability,
    band: a.band?.id || null, bandShown: a.band?.id || null,
    pwin: a.pw.p, ev: a.ev.ev, value: bid.value, route: bid.route,
    gates: a.allGates.map(g => g.name),
    outcome: existing?.outcome || 'pending', actualMargin: existing?.actualMargin ?? null,
    decisionTaken: bid.decision?.decisionTaken || null,
  };
  if (opts.sample) rec.sample = true;
  return rec;
}
