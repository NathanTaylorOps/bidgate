import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CRITERIA, GROUPS, CRITERIA_BY_ID } from '../src/data/criteria.js';
import { PRESETS, ROUTES } from '../src/data/presets.js';
import { evaluate, sensitivity, robustness, weakestLinks, bandForScore, activeCriteria, BANDS } from '../src/engine/scoring.js';
import { ahp, reciprocalMatrix, swingWeights, ahpWorstCell } from '../src/engine/weights.js';
import { pwin, priceCurves, baseRate, competitorAdjust, markupScale, winnersCurseFlag, normCdf } from '../src/engine/pwin.js';
import { expectedValue, leviesFor } from '../src/engine/ev.js';
import { peakCash, portfolioPeak, capacityGates } from '../src/engine/capacity.js';
import { simulate, pertParams, mulberry32, samplePert } from '../src/engine/montecarlo.js';
import { brier, reliability, hitRates, criterionSeparation, murphy } from '../src/engine/calibration.js';
import { dealKillersFor, MITIGATIONS } from '../src/data/dealkillers.js';
import { assess } from '../src/engine/assess.js';
import { sampleBids } from '../samples/samples.js';
import { migrate, normaliseBid, encodeShare, decodeShare, newBid, SCHEMA_VERSION } from '../src/ui/state.js';

const P = PRESETS.multifamily;

function allScores(preset, value) {
  const s = {};
  for (const c of activeCriteria(preset)) s[c.id] = value;
  return s;
}

/* ───────── data integrity ───────── */
test('criteria library: unique ids, valid groups, anchors at 1/3/5, valid axis', () => {
  const ids = new Set();
  const groupIds = new Set(GROUPS.map(g => g.id));
  for (const c of CRITERIA) {
    assert.ok(!ids.has(c.id), `duplicate id ${c.id}`); ids.add(c.id);
    assert.ok(groupIds.has(c.group), `bad group ${c.group} on ${c.id}`);
    assert.ok(c.anchors[1] && c.anchors[3] && c.anchors[5], `missing anchors on ${c.id}`);
    assert.ok(['attractiveness', 'winnability'].includes(c.axis));
    assert.ok(Array.isArray(c.contexts) && c.contexts.length > 0);
  }
  assert.equal(CRITERIA.length, 42, `expected exactly 42 criteria (README, METHODOLOGY §3), got ${CRITERIA.length}`);
});

test('every criterion has a mitigation and every mitigation points at a real criterion', () => {
  const ids = new Set(CRITERIA.map(c => c.id));
  for (const k of Object.keys(MITIGATIONS)) assert.ok(ids.has(k), `MITIGATIONS.${k} is not a criterion id`);
  for (const id of ids) assert.ok(id in MITIGATIONS, `criterion ${id} has no mitigation prompt`);
});

test('deal-killers are preset-aware: certification and public-work toggles only on the specialty preset', () => {
  const turf = dealKillersFor(PRESETS.specialty_turf).map(k => k.id);
  assert.ok(turf.includes('dk_certification'));
  assert.ok(turf.includes('dk_bond'));
  const mf = dealKillersFor(PRESETS.multifamily).map(k => k.id);
  assert.ok(!mf.includes('dk_certification'));
  assert.ok(!mf.includes('dk_bond'));
  // the common set is present everywhere and every toggle carries a human label (the UI maps id → label)
  for (const p of Object.values(PRESETS)) {
    const dks = dealKillersFor(p);
    assert.ok(dks.some(k => k.id === 'dk_terms'));
    for (const k of dks) assert.ok(typeof k.label === 'string' && k.label.length > 10, `${k.id} needs a label`);
  }
});

/* ───────── samples ───────── */
test('the six sample bids evaluate to their intended verdict bands under their presets, fully scored', () => {
  const expected = {
    sample_go: 'GO',
    sample_gated: 'GATED',
    sample_cond: 'CONDITIONAL',
    sample_small_remodel: 'CONDITIONAL',
    sample_large_ti_approval: 'APPROVAL',
    sample_turf_nogo: 'NOGO',
  };
  const samples = sampleBids();
  assert.equal(samples.length, 6);
  const seenIds = new Set();
  for (const { bid, presetId } of samples) {
    assert.ok(PRESETS[presetId], `${bid.id} references an unknown preset ${presetId}`);
    assert.ok(!seenIds.has(bid.id), `duplicate sample id ${bid.id}`); seenIds.add(bid.id);
    assert.ok(bid.id in expected, `${bid.id} has no expected band in this test — add one`);
    const r = evaluate(PRESETS[presetId], bid.scores, bid.dealKillers);
    assert.equal(r.band.id, expected[bid.id], `${bid.id} expected ${expected[bid.id]}, got ${r.band.id}`);
    assert.equal(r.coverage, 1, `${bid.id} should score every active criterion (${r.scoredCount}/${r.totalCount})`);
  }
});

test('the six sample bids land on the same band through the full assess() pipeline (capacity gates included) as they do from the scoring engine alone', () => {
  // This is the check that actually matches what the pipeline table and side panel show: a sample can score
  // CONDITIONAL on criteria alone and still end up GATED once its cash/credit facility can't cover the peak
  // retention/AR exposure of a bid this size — a capacity gate the plain evaluate() test above can't see.
  const expected = {
    sample_go: 'GO',
    sample_gated: 'GATED',
    sample_cond: 'CONDITIONAL',
    sample_small_remodel: 'CONDITIONAL',
    sample_large_ti_approval: 'APPROVAL',
    sample_turf_nogo: 'NOGO',
  };
  for (const { bid, presetId } of sampleBids()) {
    const a = assess(PRESETS[presetId], bid);
    assert.equal(a.band.id, expected[bid.id], `${bid.id} expected ${expected[bid.id]} from assess(), got ${a.band.id} (capacity gates: ${a.capGates.map(g => g.id).join(', ') || 'none'})`);
  }
});

test('presets: attractiveness weights sum to 100', () => {
  for (const p of Object.values(PRESETS)) {
    const sum = Object.entries(p.weights).filter(([k]) => k !== 'compete').reduce((a, [, v]) => a + v, 0);
    assert.equal(sum, 100, `${p.id} weights sum ${sum}`);
  }
});

test('presets are USD-only and carry no regulatory-preset fields', () => {
  for (const p of Object.values(PRESETS)) {
    assert.equal(p.locale.currency, 'USD');
    assert.deepEqual(p.levies, []);
    assert.ok(!('mfrCategories' in p.gates));
    assert.ok(!('pqcThreshold' in p.gates));
    assert.ok(!('qleaveRate' in p.gates));
  }
});

/* ───────── scoring ───────── */
test('all 5s → GO at 100; all 1s → gated', () => {
  const r5 = evaluate(P, allScores(P, 5));
  assert.equal(Math.round(r5.attractiveness), 100);
  assert.equal(r5.band.id, 'GO');
  const r1 = evaluate(P, allScores(P, 1));
  assert.equal(r1.band.id, 'GATED');
  assert.ok(r1.gateHits.length > 0);
  assert.equal(Math.round(r1.attractiveness), 0);
});

test('a single gate criterion at 1 forces GATED regardless of everything else (non-compensatory)', () => {
  const s = allScores(P, 5);
  s.cl_funding = 1;
  const r = evaluate(P, s);
  assert.equal(r.band.id, 'GATED');
  assert.ok(r.attractiveness > 90, 'compensatory score still computed and high');
  assert.equal(r.gateHits[0].id, 'cl_funding');
});

test('manual deal-killer toggles gate the verdict', () => {
  const r = evaluate(P, allScores(P, 5), ['dk_licence']);
  assert.equal(r.band.id, 'GATED');
  assert.equal(r.gateHits[0].kind, 'manual');
});

test('weakest-link floor caps GO at CONDITIONAL', () => {
  const s = allScores(P, 5);
  s.pr_scope = 2;              // floor criterion, not a gate
  const r = evaluate(P, s);
  assert.equal(r.band.id, 'CONDITIONAL');
  assert.ok(r.attractiveness > 85);
  assert.equal(r.floorHits[0].id, 'pr_scope');
});

test('bands: 75 GO, 60 APPROVAL, 40 CONDITIONAL, 39 NO-GO', () => {
  assert.equal(bandForScore(75).id, 'GO');
  assert.equal(bandForScore(74.9).id, 'APPROVAL');
  assert.equal(bandForScore(60).id, 'APPROVAL');
  assert.equal(bandForScore(59.9).id, 'CONDITIONAL');
  assert.equal(bandForScore(40).id, 'CONDITIONAL');
  assert.equal(bandForScore(39.9).id, 'NOGO');
});

test('partial scoring normalises weights over scored groups only', () => {
  const r = evaluate(P, { cl_funding: 5, cl_terms: 5 });
  assert.equal(Math.round(r.attractiveness), 100);
  assert.equal(r.groupStats.client.weight, 1);
});

test('winnability axis is separate from attractiveness', () => {
  const s = allScores(P, 5);
  for (const c of activeCriteria(P)) if (c.axis === 'winnability') s[c.id] = 1;
  const r = evaluate(P, s);
  assert.equal(Math.round(r.attractiveness), 100);
  assert.equal(Math.round(r.winnability), 0);
});

test('preset contexts filter criteria (specialty-only criteria absent from multifamily/commercial presets)', () => {
  const mf = activeCriteria(PRESETS.multifamily);
  assert.ok(!mf.some(c => c.id === 'pr_certification'), 'turf-certification criterion should not appear for multifamily');
  const turf = activeCriteria(PRESETS.specialty_turf);
  assert.ok(turf.some(c => c.id === 'pr_certification'));
  assert.ok(turf.some(c => c.group === 'materials'));
});

test('sensitivity: tornado rows sorted by swing, flips found', () => {
  const s = allScores(P, 4);
  const { rows, flips, base } = sensitivity(P, s);
  assert.equal(base.band.id, 'GO');
  assert.ok(rows.length > 10);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].swing >= rows[i].swing);
  assert.ok(flips.length > 0, 'at least one single-criterion change flips the band');
  const f = flips[0];
  assert.ok(f.to < f.from);
});

test('robustness: all-5s is 100 % robust; deterministic with seeded rng', () => {
  const rng = mulberry32(1);
  const r = robustness(P, allScores(P, 5), [], { samples: 200, rng });
  assert.equal(r.agreement, 1);
});

test('weakestLinks lists ≤2 scores ordered by impact', () => {
  const s = allScores(P, 4);
  s.cl_terms = 2; s.st_fit = 1;
  const r = evaluate(P, s);
  const w = weakestLinks(r, s);
  assert.equal(w.length, 2);
  assert.ok(w[0].impact >= w[1].impact);
});

/* ───────── weights ───────── */
test('swing weights normalise to 100', () => {
  const w = swingWeights({ a: 100, b: 50, c: 50 });
  assert.equal(Math.round(w.a + w.b + w.c), 100);
  assert.equal(w.a, 50);
});

test('AHP: Saaty textbook 3×3 example reproduces CR within 0.01', () => {
  // Saaty (1980) example: A = [[1,3,5],[1/3,1,3],[1/5,1/3,1]] → w ≈ .637,.258,.105 ; CR ≈ 0.033
  const A = [[1, 3, 5], [1 / 3, 1, 3], [1 / 5, 1 / 3, 1]];
  const r = ahp(A);
  assert.ok(Math.abs(r.weights[0] - 0.637) < 0.01, `w0=${r.weights[0]}`);
  assert.ok(Math.abs(r.weights[1] - 0.258) < 0.01);
  assert.ok(Math.abs(r.weights[2] - 0.105) < 0.01);
  assert.ok(Math.abs(r.cr - 0.033) < 0.01, `cr=${r.cr}`);
  assert.ok(r.consistent);
});

test('AHP: perfectly consistent matrix → CR 0; inconsistent → CR > 0.1 and worst cell identified', () => {
  const good = reciprocalMatrix(3, { '0,1': 2, '0,2': 4, '1,2': 2 });
  assert.ok(ahp(good).cr < 1e-9);
  const bad = reciprocalMatrix(3, { '0,1': 9, '1,2': 9, '0,2': 1 / 9 });
  const r = ahp(bad);
  assert.ok(r.cr > 0.1);
  const worst = ahpWorstCell(bad);
  assert.ok(worst.delta > 0);
});

/* ───────── pwin ───────── */
test('base rate shrinkage: no history → route default; 10 wins of 10 with α=10 → 0.575 at μ=.15', () => {
  assert.equal(baseRate({ wins: 0, bids: 0, mu: 0.15 }), 0.15);
  const p = baseRate({ wins: 10, bids: 10, mu: 0.15 });
  assert.ok(Math.abs(p - (10 + 1.5) / 20) < 1e-9);
});

test('base rate: wins > bids (data-entry error) is clamped so p ≤ 1; negatives treated as zero', () => {
  const p = baseRate({ wins: 12, bids: 10, mu: 0.15 });
  assert.ok(p <= 1 && p > 0, `p=${p}`);
  assert.equal(p, baseRate({ wins: 10, bids: 10, mu: 0.15 }), 'clamps to wins = bids');
  assert.equal(baseRate({ wins: -3, bids: -1, mu: 0.15 }), 0.15);
  assert.equal(baseRate({ wins: -3, bids: 4, mu: 0.15 }), baseRate({ wins: 0, bids: 4, mu: 0.15 }));
});

test('more competitors lowers P(win); fewer raises it; clipped', () => {
  assert.ok(competitorAdjust(0.2, 8, 4) < 0.2);
  assert.ok(competitorAdjust(0.2, 1, 4) > 0.2);
  assert.equal(competitorAdjust(0.99, 0, 4), 0.95);
});

test('pwin pipeline: winnability shifts on logit scale', () => {
  const route = ROUTES.find(r => r.id === 'hardbid_private');
  const lo = pwin({ route, wins: 0, bids: 0, competitors: 4, winnability: 0 });
  const mid = pwin({ route, wins: 0, bids: 0, competitors: 4, winnability: 50 });
  const hi = pwin({ route, wins: 0, bids: 0, competitors: 4, winnability: 100 });
  assert.ok(lo.p < mid.p && mid.p < hi.p);
  assert.ok(Math.abs(mid.p - 0.2) < 1e-9, 'at typical n and neutral position p = route base');
});

test('Friedman is more pessimistic than Gates; P(lowest) falls with n; normCdf sane', () => {
  assert.ok(Math.abs(normCdf(0) - 0.5) < 1e-6);
  assert.ok(Math.abs(normCdf(1.96) - 0.975) < 1e-3);
  const a = priceCurves(0, 4);
  const b = priceCurves(0, 8);
  assert.ok(a.friedman <= a.gates + 1e-12);
  assert.ok(b.friedman < a.friedman);
  // at field average against 4 others ≈ 20 % (1/(n+1)) under Gates
  assert.ok(Math.abs(a.gates - 0.2) < 1e-6);
  // 3 % above field at cv 6 %, n=4 → Gates ≈ 10 %; Friedman (independence) much lower
  const above = priceCurves(0.03, 4);
  assert.ok(above.gates > 0.08 && above.gates < 0.12, `got ${above.gates}`);
  assert.ok(above.friedman < above.gates);
});

test('markup heuristic: 3→6 bidders cuts markup ≈ 38 %', () => {
  const m = markupScale(0.10, 3, 6);
  assert.ok(Math.abs(m / 0.10 - Math.pow(0.5, 0.7)) < 1e-9);
  assert.ok(m < 0.065 && m > 0.06);
});

test('winner\'s curse flag', () => {
  assert.ok(winnersCurseFlag(6, 2));
  assert.ok(!winnersCurseFlag(5, 2));
  assert.ok(!winnersCurseFlag(6, 3));
});

/* ───────── EV ───────── */
test('EV arithmetic; empty levies array degrades gracefully in the US-only presets', () => {
  const route = ROUTES.find(r => r.id === 'negotiated');
  const r = expectedValue({ value: 2_000_000, marginPct: 18, p: 0.5, route, preset: P, scopeScore: 3 });
  assert.equal(r.grossProfit, 360_000);
  assert.equal(r.bidCost, 8_000); // 0.4 %
  assert.equal(r.ev, 0.5 * 360_000 - 8_000);
  assert.ok(Math.abs(r.breakEvenP - 8_000 / 360_000) < 1e-12);
  assert.ok(r.riskAdjEv < r.ev);

  for (const p of Object.values(PRESETS)) {
    const lev = leviesFor(p, 1_000_000);
    assert.deepEqual(lev, []);
  }
});

test('explicit hours beat route % for bid cost; EV per hour computed', () => {
  const route = ROUTES.find(r => r.id === 'hardbid_private');
  const r = expectedValue({ value: 1_000_000, marginPct: 10, p: 0.25, route, preset: P, bidHours: 80, loadedRate: 120 });
  assert.equal(r.bidCost, 9_600);
  assert.ok(Math.abs(r.evPerHour - (0.25 * 100_000 - 9_600) / 80) < 1e-9);
});

/* ───────── capacity ───────── */
test('peak cash example: $2M, 12 mo, 1.5 mo lag, 10 % retention, 20 % margin', () => {
  const r = peakCash({ value: 2_000_000, durationMonths: 12, payLagMonths: 1.5, retention: 0.10, margin: 0.20 });
  assert.ok(r.pct > 0 && r.pct < 0.35, `pct=${r.pct}`);
  const fast = peakCash({ value: 2_000_000, durationMonths: 12, payLagMonths: 1, retention: 0.05, margin: 0.20 });
  assert.ok(fast.peak < r.peak);
});

test('portfolio peak: two overlapping jobs need more cash than one', () => {
  const one = portfolioPeak([{ value: 1_000_000, durationMonths: 10, startMonth: 0 }]);
  const two = portfolioPeak([{ value: 1_000_000, durationMonths: 10, startMonth: 0 }, { value: 1_000_000, durationMonths: 10, startMonth: 1 }]);
  assert.ok(two.peak > one.peak);
  assert.ok(one.peak > 0);
});

test('capacity gates: retention/AR exposure over facility, and staffing gate', () => {
  const cash = capacityGates({ preset: P, value: 500_000, portfolioPeak: 200_000, facility: 100_000 });
  assert.ok(cash.some(h => h.id === 'cash'));
  const staff = capacityGates({ preset: P, value: 500_000, estimatorLoadAfter: 2, crewLoadAfter: 3 });
  assert.ok(staff.some(h => h.id === 'staff'));
  const ok = capacityGates({ preset: P, value: 500_000, portfolioPeak: 50_000, facility: 100_000, estimatorLoadAfter: 0, crewLoadAfter: 1, workingCapital: 100_000, backlog: 200_000 });
  assert.equal(ok.length, 0);
});

test('capacity gates: thin working capital vs backlog + bid', () => {
  const hits = capacityGates({ preset: P, value: 1_000_000, workingCapital: 20_000, backlog: 500_000 });
  assert.ok(hits.some(h => h.id === 'wc'));
});

/* ───────── Monte Carlo ───────── */
test('PERT mean matches (min+4mode+max)/6 within 1 % over 50k draws', () => {
  const rng = mulberry32(7);
  const n = 50_000;
  let s = 0;
  for (let i = 0; i < n; i++) s += samplePert(10, 18, 24, rng);
  const mean = s / n;
  const expected = pertParams(10, 18, 24).mean;
  assert.ok(Math.abs(mean - expected) / expected < 0.01, `mean ${mean} vs ${expected}`);
});

test('simulate: deterministic with seed, quantiles ordered, P(loss) sane', () => {
  const a = { value: { min: 1.8e6, mode: 2e6, max: 2.2e6 }, marginPct: { min: -2, mode: 12, max: 20 }, pwin: { min: 0.3, mode: 0.5, max: 0.7 }, bidCost: 10_000, iterations: 4000, seed: 3 };
  const r1 = simulate(a), r2 = simulate(a);
  assert.deepEqual(r1.ev, r2.ev);
  assert.ok(r1.margin.p10 < r1.margin.p50 && r1.margin.p50 < r1.margin.p90);
  assert.ok(r1.pLoss > 0 && r1.pLoss < 0.2);
  assert.ok(r1.histogram.reduce((s, b) => s + b.n, 0) === 4000);
});

test('beta-PERT tolerates mis-ordered three-points (mode < min): no NaN, mean inside the sorted range', () => {
  // mode below the low, as a user typing Low/Most-likely/High out of order would produce
  const pp = pertParams(18, 10, 24);
  assert.ok(Number.isFinite(pp.alpha) && Number.isFinite(pp.beta) && Number.isFinite(pp.mean));
  assert.ok(pp.alpha >= 1 && pp.beta >= 1, 'Beta shape parameters must stay ≥ 1');
  assert.ok(pp.mean > 10 && pp.mean < 24, `mean ${pp.mean} outside [10, 24]`);
  assert.deepEqual(pp, pertParams(10, 18, 24), 'same result as the correctly ordered input');

  const rng = mulberry32(9);
  for (let i = 0; i < 1000; i++) {
    const x = samplePert(18, 10, 24, rng);
    assert.ok(Number.isFinite(x) && x >= 10 && x <= 24, `sample ${x} out of range`);
  }

  const r = simulate({
    value: { min: 2e6, mode: 1.8e6, max: 2.2e6 },        // mode < min
    marginPct: { min: 18, mode: 10, max: 24 },           // mode < min
    pwin: { min: 0.5, mode: 0.3, max: 0.7 },             // mode < min
    bidCost: 1000, iterations: 2000, seed: 5,
  });
  for (const v of [r.margin.mean, r.margin.p10, r.margin.p50, r.margin.p90, r.ev.mean, r.ev.p10, r.ev.p90, r.pLoss, r.pEvNeg]) assert.ok(Number.isFinite(v), 'NaN leaked out of simulate()');
  assert.ok(r.margin.mean > 10 && r.margin.mean < 24, `margin mean ${r.margin.mean} outside sorted [10, 24]`);
  assert.ok(r.margin.p10 <= r.margin.p50 && r.margin.p50 <= r.margin.p90);
  assert.equal(r.pLoss, 0, 'no loss possible when every margin point is positive');
});

/* ───────── state / persistence ───────── */
test('migrate(): a minimal v2 (legacy-domain) state comes back as v3 without throwing, stale ids and unknown presets dropped', () => {
  const v2 = { version: 2, presetId: 'vi_custom', bid: { scores: { sp_util: 3, cl_funding: 5 }, shops: [] }, saved: [{ id: 'x', presetId: 'qld_residential', bid: { scores: {} } }] };
  const s = migrate(JSON.parse(JSON.stringify(v2)));
  assert.equal(s.version, SCHEMA_VERSION);
  assert.ok(PRESETS[s.presetId], 'unknown legacy preset falls back to a current one');
  assert.deepEqual(s.bid.scores, { cl_funding: 5 }, 'unknown criterion sp_util dropped, surviving id kept');
  assert.equal(s.saved.length, 0, 'saved record from an unrecognised preset is dropped');
  assert.ok(Array.isArray(s.bid.capacity.liveJobs), 'compute()-style access to capacity.liveJobs must be safe');
  assert.ok(Array.isArray(s.bid.dealKillers));
  assert.ok(ROUTES.some(r => r.id === s.bid.route));
  assert.ok(!('shops' in s.bid), 'legacy field names are not carried across');
  // and the migrated state evaluates without error
  const r = evaluate(PRESETS[s.presetId], s.bid.scores, s.bid.dealKillers);
  assert.equal(r.scoredCount, 1);
});

test('migrate(): v3 saved records get the same defaults-merge as the live bid; route and dealKillers are validated', () => {
  const v3 = {
    version: 3, presetId: 'commercial_ti',
    bid: { scores: {}, route: 'bogus_route', dealKillers: 'not-an-array', capacity: null },
    saved: [
      { id: 'y', presetId: 'specialty_turf', bid: { scores: { pr_scope: 3, zz_unknown: 5 }, capacity: null } },      // no decision block, null capacity
      { id: 'z', presetId: 'not_a_preset', bid: { scores: {} } },
    ],
  };
  const s = migrate(JSON.parse(JSON.stringify(v3)));
  assert.equal(s.bid.route, PRESETS.commercial_ti.economics.defaultRoute, 'invalid route falls back to the preset default');
  assert.deepEqual(s.bid.dealKillers, [], 'non-array dealKillers coerced to []');
  assert.deepEqual(s.bid.capacity.liveJobs, []);
  assert.equal(s.saved.length, 1, 'unknown-preset record dropped');
  const rec = s.saved[0];
  assert.ok(Array.isArray(rec.bid.capacity.liveJobs), 'saved record with capacity: null is usable in the editor');
  assert.ok(Array.isArray(rec.bid.decision.premortem) && rec.bid.decision.premortem.length === 3);
  assert.equal(rec.bid.route, PRESETS.specialty_turf.economics.defaultRoute);
  assert.deepEqual(rec.bid.scores, { pr_scope: 3 });
  assert.equal(typeof rec.bid.econ.marginMode, 'number');
});

test('normaliseBid() keeps a valid route and known deal-killers, and does not invent scores', () => {
  const b = { ...newBid('multifamily'), route: 'negotiated', dealKillers: ['dk_terms', 42, null], scores: { cl_funding: 4 } };
  const n = normaliseBid(b, 'multifamily');
  assert.equal(n.route, 'negotiated');
  assert.deepEqual(n.dealKillers, ['dk_terms']);
  assert.deepEqual(n.scores, { cl_funding: 4 });
  assert.equal(n.id, b.id, 'identity preserved');
});

test('encodeShare / decodeShare round-trip a bid, including non-ASCII text, as a URL-safe fragment', () => {
  const bid = { ...newBid('multifamily'), name: 'Round-trip — “quotes” & ünïcode · 2×2', client: 'GC / source', scores: { cl_funding: 5, co_price: 2 }, dealKillers: ['dk_terms'] };
  const state = { presetId: 'multifamily', bid, weightsOverride: { multifamily: { client: 30 } } };
  const hash = encodeShare(state);
  assert.match(hash, /^[A-Za-z0-9_-]+$/, 'fragment must be base64url with no padding or reserved characters');
  const o = decodeShare(hash);
  assert.equal(o.v, SCHEMA_VERSION);
  assert.equal(o.presetId, 'multifamily');
  // The sender's effective weights travel with the bid alone — never into the recipient's own Settings.
  assert.deepEqual(o.bid, { ...bid, weightsOverride: { client: 30 } });
  assert.deepEqual(o.weights, { client: 30 });
  assert.throws(() => decodeShare(encodeShare({ presetId: 'multifamily', bid: null, weightsOverride: {} })), /bad share/);
});

/* ───────── calibration ───────── */
test('Brier: always 0.5 → 0.25; perfect → 0', () => {
  const half = [{ outcome: 'won', pwin: 0.5 }, { outcome: 'lost', pwin: 0.5 }];
  assert.equal(brier(half), 0.25);
  const perfect = [{ outcome: 'won', pwin: 1 }, { outcome: 'lost', pwin: 0 }];
  assert.equal(brier(perfect), 0);
  assert.equal(brier([{ outcome: 'pending', pwin: 0.5 }]), null);
});

test('reliability bins and Murphy decomposition reconstruct Brier', () => {
  const recs = [];
  const rng = mulberry32(11);
  for (let i = 0; i < 60; i++) {
    const p = Math.round(rng() * 10) / 10;
    recs.push({ outcome: rng() < p ? 'won' : 'lost', pwin: p });
  }
  const bins = reliability(recs);
  assert.equal(bins.length, 5);
  const m = murphy(recs);
  assert.ok(Math.abs(m.brier - brier(recs)) < 1e-9);
});

test('hit rates by count and by dollar; criterion separation', () => {
  const recs = [
    { outcome: 'won', route: 'invited', value: 1_000_000, scores: { cl_funding: 5 } },
    { outcome: 'lost', route: 'invited', value: 3_000_000, scores: { cl_funding: 2 } },
    { outcome: 'lost', route: 'hardbid_public', value: 500_000, scores: { cl_funding: 3 } },
  ];
  const hr = hitRates(recs);
  const inv = hr.find(g => g.key === 'invited');
  assert.equal(inv.hitRateCount, 0.5);
  assert.equal(inv.hitRateValue, 0.25);
  const sep = criterionSeparation(recs);
  assert.equal(sep[0].id, 'cl_funding');
  assert.equal(sep[0].separation, 5 - 2.5);
});
