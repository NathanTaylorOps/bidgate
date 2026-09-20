/* BidGate UI — main module. Views: gates · score · economics · capacity · decision · pipeline · calibration · settings */
import { GROUPS, CRITERIA_BY_ID } from '../data/criteria.js';
import { PRESETS, PRESET_LIST, ROUTES } from '../data/presets.js';
import { dealKillersFor, MITIGATIONS } from '../data/dealkillers.js';
import { evaluate, sensitivity, robustness, weakestLinks, activeCriteria, BANDS } from '../engine/scoring.js';
import { pwin, winnersCurseFlag, markupCurve } from '../engine/pwin.js';
import { expectedValue, fmtMoney } from '../engine/ev.js';
import { peakCash, portfolioPeak, capacityGates } from '../engine/capacity.js';
import { simulate } from '../engine/montecarlo.js';
import * as S from './state.js';
import * as C from './charts.js';
import { sampleBids } from '../../samples/samples.js';
import { renderEconomics, renderCapacity } from './views-econ.js';
import { renderDecision, renderPipeline, renderCalibration, renderMemo } from './views-decide.js';

/* ───────────────────────────── state ───────────────────────────── */
export let state = S.load() || S.defaultState();
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function preset() { return PRESETS[state.presetId]; }
/** Switch preset: keep scores, default the route if unset, and drop any manual deal-killer the new preset does not offer. */
function setPreset(id) {
  if (!PRESETS[id]) return;
  state.presetId = id;
  const p = preset();
  state.bid.route = state.bid.route || p.economics.defaultRoute;
  const valid = new Set(dealKillersFor(p).map(k => k.id));
  state.bid.dealKillers = (state.bid.dealKillers || []).filter(x => valid.has(x));
}
export function presetWithOverrides() {
  const p = preset();
  const ov = state.weightsOverride[p.id];
  return ov ? { ...p, weights: { ...p.weights, ...ov } } : p;
}
export const money = (n, compact = true) => fmtMoney(n, preset().locale.locale, preset().locale.currency, compact);
export const pct = (x, d = 0) => (x == null || Number.isNaN(x) ? '–' : (x * 100).toFixed(d) + ' %');
export const num = (x, d = 0) => (x == null || Number.isNaN(x) ? '–' : Number(x).toFixed(d));

/* ───────────────────────────── derived ───────────────────────────── */
export function compute() {
  const p = presetWithOverrides();
  const b = state.bid;
  const result = evaluate(p, b.scores, b.dealKillers);
  // Manual deal-killers come back from evaluate() with name = raw id (the engine has no label table);
  // map to the human label once here so the verdict panel, Decision view, memo and pipeline `gates` all read it.
  const dkLabel = Object.fromEntries(dealKillersFor(p).map(k => [k.id, k.label]));
  result.gateHits = result.gateHits.map(g => g.kind === 'manual' ? { ...g, name: dkLabel[g.id] || g.id } : g);
  const route = ROUTES.find(r => r.id === b.route) || ROUTES[1];
  const pw = pwin({ route, wins: b.econ.wins, bids: b.econ.bids, competitors: b.competitors, winnability: result.winnability });
  const ev = expectedValue({ value: b.value || 0, marginPct: b.econ.marginMode, p: pw.p, route, preset: p, scopeScore: b.scores.pr_scope, bidHours: b.econ.bidHours, loadedRate: b.econ.loadedRate, externalBidCost: b.econ.externalBidCost });

  // capacity
  const cap = b.capacity;
  const facility = (cap.cash || 0) + (cap.creditLine || 0);
  const thisJob = b.value ? { value: b.value, durationMonths: b.durationMonths || 12, startMonth: 0, payLagMonths: cap.payLagMonths, retention: cap.retention, margin: b.econ.marginMode / 100, frontLoad: cap.frontLoad } : null;
  const live = (cap.liveJobs || []).map(j => ({ ...j, payLagMonths: cap.payLagMonths, retention: cap.retention, margin: b.econ.marginMode / 100 }));
  const portBefore = portfolioPeak(live, 24);
  const portAfter = portfolioPeak(thisJob ? [...live, thisJob] : live, 24);
  const thisPeak = thisJob ? peakCash({ value: b.value, durationMonths: b.durationMonths || 12, payLagMonths: cap.payLagMonths, retention: cap.retention, margin: b.econ.marginMode / 100, frontLoad: cap.frontLoad }) : null;
  const capGates = capacityGates({ preset: p, value: b.value || 0, portfolioPeak: portAfter.peak, facility: facility > 0 ? facility : null, estimatorLoadAfter: cap.estimatorLoadAfter, crewLoadAfter: cap.crewLoadAfter, workingCapital: cap.workingCapital, backlog: cap.backlogValue });

  // final band: capacity gates also gate
  let band = result.band;
  if (capGates.length) band = BANDS.GATED;
  const allGates = [...result.gateHits, ...capGates.map(g => ({ id: g.id, name: g.label, kind: 'capacity', detail: g.detail }))];

  const curse = winnersCurseFlag(b.competitors, b.scores.pr_scope, p.gates.winnersCurseBidders ?? 6);
  return { p, b, result, route, pw, ev, facility, portBefore, portAfter, thisPeak, capGates, allGates, band, curse };
}

/* ───────────────────────────── persistence & utils ───────────────────────────── */
export function commit(opts = {}) {
  S.save(state);
  if (!opts.skipSide) renderSide();
  if (opts.rerender) render();
  updateNavBadges();
}
export function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}
export function setView(v) { state.view = v; S.save(state); render(); }

/* ───────────────────────────── nav ───────────────────────────── */
const VIEWS = [
  { id: 'gates', label: 'Gates', icon: '⛔' },
  { id: 'score', label: 'Score', icon: '▤' },
  { id: 'economics', label: 'Economics', icon: '∑' },
  { id: 'capacity', label: 'Capacity & Materials', icon: '⚒' },
  { id: 'decision', label: 'Decision', icon: '✔' },
  { id: 'pipeline', label: 'Pipeline', icon: '◫' },
  { id: 'calibration', label: 'Calibration', icon: '◎' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];
function renderNav() {
  $('#nav').innerHTML = VIEWS.map(v => `<button role="tab" data-view="${v.id}" aria-selected="${state.view === v.id}"><span aria-hidden="true">${v.icon}</span>${v.label}<span class="badge" id="badge_${v.id}"></span></button>`).join('');
  $$('#nav button').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
  updateNavBadges();
}
function updateNavBadges() {
  const d = compute();
  const set = (id, txt, cls = '') => { const el = $(`#badge_${id}`); if (!el) return; el.textContent = txt; el.className = 'badge ' + cls; el.style.display = txt ? '' : 'none'; };
  set('gates', d.allGates.length ? `${d.allGates.length}` : '', d.allGates.length ? 'bad' : '');
  set('score', `${d.result.scoredCount}/${d.result.totalCount}`);
  set('pipeline', state.saved.length ? `${state.saved.length}` : '');
  const pending = state.saved.filter(s => !s.outcome || s.outcome === 'pending').length;
  set('calibration', pending ? `${pending} open` : '');
}

/* ───────────────────────────── side panel ───────────────────────────── */
export function renderSide() {
  const d = compute();
  const r = d.result;
  const band = d.band;
  const tone = band ? band.tone : 'neutral';
  const title = band ? `<span aria-hidden="true">${band.icon}</span>${band.label}` : 'Not yet scored';
  let why = '';
  if (!band) why = 'Score criteria to generate a recommendation. Gates are evaluated first.';
  else if (band.id === 'GATED') why = `${d.allGates.length} gate${d.allGates.length > 1 ? 's' : ''} active — disqualified regardless of score.`;
  else if (r.floorHits.length) why = `Capped at CONDITIONAL: ${r.floorHits.map(f => f.name).join('; ')} scored ≤ 2.`;
  else if (band.id === 'GO') why = 'Strong fit. Run the pre-mortem before committing estimating hours.';
  else if (band.id === 'APPROVAL') why = 'Proceed only with a named approver and conditions recorded.';
  else if (band.id === 'CONDITIONAL') why = 'Identify the weakest links and what would flip this before spending on the bid.';
  else why = 'Insufficient alignment. Decline or seek further information.';

  $('#side').innerHTML = `
    <div class="verdict ${tone}" aria-live="polite">
      <div class="eyebrow">Recommendation · ${esc(d.p.label)}</div>
      <div class="title">${title}</div>
      <div class="why">${why}</div>
      <div class="kpis">
        <div class="kpi"><div class="v">${num(r.attractiveness, 0)}</div><div class="l">Attractiveness /100</div></div>
        <div class="kpi"><div class="v">${r.winnability == null ? '–' : num(r.winnability, 0)}</div><div class="l">Winnability /100</div></div>
        <div class="kpi"><div class="v">${pct(d.pw.p)}</div><div class="l">P(win) modelled</div></div>
        <div class="kpi"><div class="v">${d.b.value ? money(d.ev.ev) : '–'}</div><div class="l">Expected value</div></div>
      </div>
      <div class="progress" style="margin-top:10px" title="${r.scoredCount} of ${r.totalCount} criteria scored"><i style="width:${(r.coverage * 100).toFixed(0)}%"></i></div>
      <div class="small muted" style="margin-top:4px">${r.scoredCount}/${r.totalCount} criteria scored${d.curse ? ' · <span style="color:var(--warn)">winner\'s-curse zone</span>' : ''}</div>
      ${d.allGates.length ? `<div class="gatelist">${d.allGates.map(g => `<div class="g"><span aria-hidden="true">⛔</span><span>${esc(g.name)}${g.detail ? ` <span class="muted">— ${esc(g.detail)}</span>` : ''}</span></div>`).join('')}</div>` : ''}
    </div>
    <div class="card">
      <h2>Category profile</h2>
      <div class="chart" style="height:180px"><canvas id="sideRadar" aria-label="Radar chart of category scores"></canvas></div>
      <div class="stack" style="margin-top:8px">
        ${GROUPS.filter(g => r.groupStats[g.id].count > 0).map(g => {
          const gs = r.groupStats[g.id];
          return `<div class="row between small"><span>${g.icon} ${g.label}</span><span class="mono">${gs.pct == null ? '–' : gs.pct.toFixed(0)}${g.axis === 'attractiveness' && gs.weight ? ` <span class="muted">· w ${(gs.weight * 100).toFixed(0)}%</span>` : ''}</span></div>`;
        }).join('')}
      </div>
    </div>
    <div class="row" style="gap:6px">
      <button class="btn primary" id="sideSave">Save to pipeline</button>
      <button class="btn" id="sidePrint">Print memo</button>
      <button class="btn ghost" id="sideNew">New bid</button>
    </div>`;
  const labels = GROUPS.filter(g => r.groupStats[g.id].count > 0).map(g => g.short);
  const values = GROUPS.filter(g => r.groupStats[g.id].count > 0).map(g => r.groupStats[g.id].pct ?? 0);
  C.radar('sideRadar', labels, values);
  $('#sideSave').onclick = saveToPipeline;
  $('#sidePrint').onclick = printMemo;
  $('#sideNew').onclick = () => { if (confirm('Start a new bid? The current one stays in the pipeline only if you saved it.')) { state.bid = S.newBid(state.presetId); commit({ rerender: true }); } };
}

export function saveToPipeline() {
  const d = compute();
  const snap = JSON.parse(JSON.stringify(state.bid));
  snap.name ||= 'Unnamed bid';
  const existing = state.saved.findIndex(s => s.bid.id === snap.id);
  const rec = {
    id: snap.id, bid: snap, presetId: state.presetId, savedAt: new Date().toISOString(),
    attractiveness: d.result.attractiveness, winnability: d.result.winnability, band: d.band?.id || null, pwin: d.pw.p, ev: d.ev.ev, value: snap.value, route: snap.route,
    gates: d.allGates.map(g => g.name), outcome: existing >= 0 ? state.saved[existing].outcome : 'pending', actualMargin: existing >= 0 ? state.saved[existing].actualMargin : null,
    bandShown: d.band?.id || null, decisionTaken: snap.decision.decisionTaken || null,
  };
  if (existing >= 0) state.saved[existing] = rec; else state.saved.unshift(rec);
  commit();
  toast(existing >= 0 ? 'Bid updated in pipeline' : 'Saved to pipeline');
}

export function printMemo() {
  $('#memo').innerHTML = renderMemo(compute(), state);
  window.print();
}

/* ───────────────────────────── main render ───────────────────────────── */
export function render() {
  C.destroyAll();
  renderNav();
  const main = $('#main');
  const d = compute();
  switch (state.view) {
    case 'gates': main.innerHTML = viewGates(d); bindGates(main); break;
    case 'score': main.innerHTML = viewScore(d); bindScore(main); break;
    case 'economics': renderEconomics(main, d, ctx()); break;
    case 'capacity': renderCapacity(main, d, ctx()); break;
    case 'decision': renderDecision(main, d, ctx()); break;
    case 'pipeline': renderPipeline(main, d, ctx()); break;
    case 'calibration': renderCalibration(main, d, ctx()); break;
    case 'settings': main.innerHTML = viewSettings(d); bindSettings(main); break;
    default: state.view = 'score'; render(); return;
  }
  renderSide();
  $('#presetSelect').value = state.presetId;
  $('#modeSimple').setAttribute('aria-pressed', state.mode === 'simple');
  $('#modeExpert').setAttribute('aria-pressed', state.mode === 'expert');
}
function ctx() { return { state, compute, commit, toast, esc, money, pct, num, preset, presetWithOverrides, setView, saveToPipeline, printMemo, C, ROUTES, GROUPS, CRITERIA_BY_ID, MITIGATIONS, sensitivity, robustness, weakestLinks, simulate, markupCurve, S, BANDS }; }

/* ───────────────────────────── VIEW: header block (shared) ───────────────────────────── */
function bidHeader(d) {
  const b = d.b;
  return `<div class="card">
    <div class="cols">
      <div class="field"><label for="bidName">Project / bid package</label><input id="bidName" value="${esc(b.name)}" placeholder="e.g., Meridian Place Apartments — LVT &amp; tile turns"></div>
      <div class="field"><label for="bidClient">GC / source</label><input id="bidClient" value="${esc(b.client)}" placeholder="Who, and how they found you"></div>
      <div class="field"><label for="bidValue">Subcontract value (${d.p.locale.currency})</label><input id="bidValue" type="number" min="0" step="1000" value="${b.value ?? ''}" placeholder="620000"></div>
      <div class="field"><label for="bidRoute">Procurement route</label><select id="bidRoute">${ROUTES.map(r => `<option value="${r.id}" ${b.route === r.id ? 'selected' : ''}>${r.label}</option>`).join('')}</select></div>
      <div class="field"><label for="bidCompetitors">Expected competitors</label><input id="bidCompetitors" type="number" min="0" max="30" value="${b.competitors ?? ''}" placeholder="${d.route.typicalBidders}"></div>
      <div class="field"><label for="bidDuration">Duration (months)</label><input id="bidDuration" type="number" min="1" max="60" value="${b.durationMonths ?? ''}" placeholder="4"></div>
    </div>
  </div>`;
}
function bindBidHeader(root) {
  const b = state.bid;
  const on = (id, fn) => { const el = $(id, root); if (el) el.addEventListener('input', e => { fn(e.target.value); commit(); }); };
  on('#bidName', v => b.name = v);
  on('#bidClient', v => b.client = v);
  on('#bidValue', v => b.value = v === '' ? null : Number(v));
  on('#bidCompetitors', v => b.competitors = v === '' ? null : Number(v));
  on('#bidDuration', v => b.durationMonths = v === '' ? null : Number(v));
  const r = $('#bidRoute', root); if (r) r.addEventListener('change', e => { b.route = e.target.value; commit(); });
}

/* ───────────────────────────── VIEW: gates ───────────────────────────── */
function viewGates(d) {
  const dks = dealKillersFor(d.p);
  const gateCriteria = d.result.criteria.filter(c => c.gate);
  return `${bidHeader(d)}
  <div class="card">
    <h2>Stage 1 · Manual deal-killers <span class="pill neutral">non-compensatory</span></h2>
    <p style="margin-bottom:10px">Any switch ON forces <b>NO-GO (gated)</b> regardless of the score below. These are the things no margin can buy back.</p>
    <div class="stack">
      ${dks.map(k => `<div class="row" style="gap:10px;padding:6px 0;border-bottom:1px solid var(--border)"><button class="switch" role="switch" aria-checked="${d.b.dealKillers.includes(k.id)}" data-dk="${k.id}" aria-label="${esc(k.label)}"></button><span class="small" style="flex:1;${d.b.dealKillers.includes(k.id) ? 'color:var(--bad);font-weight:600' : ''}">${esc(k.label)}</span></div>`).join('')}
    </div>
  </div>
  <div class="card">
    <h2>Gate criteria <span class="pill neutral">score of 1 = gate</span></h2>
    <p style="margin-bottom:10px">These criteria in the scorecard carry a hard gate at 1. Their current state:</p>
    <div class="list">
      ${gateCriteria.map(c => { const s = d.b.scores[c.id]; const hit = s != null && s <= c.gate.at; return `<div class="item"><span>${esc(c.name)}</span><span class="pill ${hit ? 'bad' : s == null ? 'neutral' : 'good'}">${hit ? '⛔ gated' : s == null ? 'unscored' : '✔ ' + s}</span></div>`; }).join('')}
    </div>
  </div>
  <div class="card">
    <h2>Capacity gates</h2>
    ${d.capGates.length ? `<div class="stack">${d.capGates.map(g => `<div class="callout bad"><b>${esc(g.label)}</b><div class="small">${esc(g.detail || '')}</div></div>`).join('')}</div>` : `<p>None triggered from the Capacity &amp; Materials inputs. Retention/AR exposure, portfolio cash and staffing gates are evaluated from the Capacity tab inputs.</p>`}
    ${d.p.gates.sourceNote ? `<div class="small muted" style="margin-top:8px">Thresholds valid from ${d.p.gates.valid_from}: ${esc(d.p.gates.sourceNote)}</div>` : ''}
  </div>`;
}
function bindGates(root) {
  bindBidHeader(root);
  $$('[data-dk]', root).forEach(sw => sw.addEventListener('click', () => {
    const id = sw.dataset.dk; const b = state.bid;
    b.dealKillers = b.dealKillers.includes(id) ? b.dealKillers.filter(x => x !== id) : [...b.dealKillers, id];
    commit({ rerender: true });
  }));
}

/* ───────────────────────────── VIEW: score ───────────────────────────── */
function viewScore(d) {
  const list = d.result.criteria;
  const expert = state.mode === 'expert';
  const groups = GROUPS.filter(g => list.some(c => c.group === g.id));
  return `${bidHeader(d)}
  <div class="callout small" style="margin-bottom:12px">Keyboard: focus a criterion and press <span class="kbd">1</span>–<span class="kbd">5</span>; <span class="kbd">↓</span>/<span class="kbd">↑</span> to move; <span class="kbd">?</span> shows anchors. ${expert ? 'Expert mode: notes are requested for any score ≥ 4 — evidence a stranger would accept.' : 'Switch to Expert for evidence notes and source pointers.'}</div>
  ${groups.map(g => {
    const cs = list.filter(c => c.group === g.id);
    const gs = d.result.groupStats[g.id];
    const w = d.p.weights[g.id];
    return `<div class="group card" data-group="${g.id}">
      <div class="group-head" data-toggle="${g.id}">
        <div class="t"><span aria-hidden="true">${g.icon}</span>${g.label}${g.axis === 'winnability' ? ' <span class="pill mid">winnability axis</span>' : ''}</div>
        <div class="m"><span id="gpct_${g.id}">${gs.pct == null ? '–' : gs.pct.toFixed(0)}</span>${g.axis === 'attractiveness' ? `<span class="muted">w ${w}%</span>` : ''}<span id="gcnt_${g.id}">${gs.n}/${gs.count}</span><span aria-hidden="true">▾</span></div>
      </div>
      <div class="group-body" id="gbody_${g.id}">
        ${cs.map(c => critHTML(c, d, expert)).join('')}
      </div>
    </div>`;
  }).join('')}`;
}
function critHTML(c, d, expert) {
  const s = d.b.scores[c.id];
  const gateHit = c.gate && s != null && s <= c.gate.at;
  const floorHit = c.floor && s != null && s <= c.floor.at;
  return `<div class="crit ${gateHit ? 'gate-hit' : ''} ${floorHit ? 'floor-hit' : ''}" data-crit="${c.id}" tabindex="0" aria-label="${esc(c.name)}">
    <div class="head">
      <div class="name">${esc(c.name)}<span class="tags">${c.gate ? '<span class="tag gate">gate @1</span>' : ''}${c.floor ? '<span class="tag floor">floor @2</span>' : ''}</span></div>
      <button class="btn ghost sm" data-anchors="${c.id}" aria-expanded="${expert}" title="Show anchors">?</button>
    </div>
    <div class="anchors ${expert ? '' : 'hidden'}" id="anch_${c.id}">
      <div><b>1</b>${esc(c.anchors[1])}</div><div><b>3</b>${esc(c.anchors[3])}</div><div><b>5</b>${esc(c.anchors[5])}</div>
    </div>
    <div class="radio" role="radiogroup" aria-label="Score ${esc(c.name)}">
      ${[1, 2, 3, 4, 5].map(v => `<button role="radio" class="s${v}" aria-checked="${s === v}" data-score="${v}" aria-label="${v}">${v}</button>`).join('')}
    </div>
    <div class="note ${expert ? '' : 'hidden'}"><input data-note="${c.id}" placeholder="Evidence / note (what did you see, when, from whom)" value="${esc(d.b.notes[c.id] || '')}"></div>
    ${expert ? `<div class="evidence">Source: ${esc(c.evidence)}</div>` : ''}
  </div>`;
}
function bindScore(root) {
  bindBidHeader(root);
  $$('[data-toggle]', root).forEach(h => h.addEventListener('click', () => { $(`#gbody_${h.dataset.toggle}`, root).classList.toggle('hidden'); }));
  $$('[data-anchors]', root).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const a = $(`#anch_${b.dataset.anchors}`, root); a.classList.toggle('hidden'); b.setAttribute('aria-expanded', !a.classList.contains('hidden')); }));
  $$('.crit', root).forEach(card => {
    const id = card.dataset.crit;
    $$('[data-score]', card).forEach(btn => btn.addEventListener('click', () => setScore(id, Number(btn.dataset.score), card)));
    card.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      if (/^[1-5]$/.test(e.key)) { e.preventDefault(); setScore(id, Number(e.key), card); }
      else if (e.key === '0' || e.key === 'Backspace') { e.preventDefault(); setScore(id, null, card); }
      else if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); const n = card.nextElementSibling || card.closest('.group').nextElementSibling?.querySelector('.crit'); n?.focus(); n?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); const p = card.previousElementSibling || card.closest('.group').previousElementSibling?.querySelector('.crit:last-child'); p?.focus(); p?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      else if (e.key === '?') { e.preventDefault(); $(`#anch_${id}`, card).classList.toggle('hidden'); }
    });
    const note = $('[data-note]', card); if (note) note.addEventListener('input', e => { state.bid.notes[id] = e.target.value; S.save(state); });
  });
}
function setScore(id, val, card) {
  const b = state.bid;
  if (val == null || b.scores[id] === val) delete b.scores[id]; else b.scores[id] = val;
  // in-place update
  $$('[data-score]', card).forEach(btn => btn.setAttribute('aria-checked', Number(btn.dataset.score) === b.scores[id]));
  const c = CRITERIA_BY_ID[id]; const s = b.scores[id];
  card.classList.toggle('gate-hit', !!(c.gate && s != null && s <= c.gate.at));
  card.classList.toggle('floor-hit', !!(c.floor && s != null && s <= c.floor.at));
  const d = compute();
  const gs = d.result.groupStats[c.group];
  const pe = $(`#gpct_${c.group}`); if (pe) pe.textContent = gs.pct == null ? '–' : gs.pct.toFixed(0);
  const ce = $(`#gcnt_${c.group}`); if (ce) ce.textContent = `${gs.n}/${gs.count}`;
  if (state.mode === 'expert' && s >= 4 && !b.notes[id]) { const n = $('[data-note]', card); n?.setAttribute('placeholder', 'A 4 or 5 needs evidence a stranger would accept — what is it?'); }
  commit();
}

/* ───────────────────────────── VIEW: settings ───────────────────────────── */
function viewSettings(d) {
  const p = preset();
  const ov = state.weightsOverride[p.id] || {};
  const groups = GROUPS.filter(g => g.axis === 'attractiveness' && p.weights[g.id] > 0);
  const total = groups.reduce((s, g) => s + (ov[g.id] ?? p.weights[g.id]), 0);
  return `<div class="card">
    <h2>Preset</h2>
    <div class="stack">
      ${PRESET_LIST.map(x => `<label class="row" style="gap:10px;align-items:flex-start;padding:8px;border:1px solid ${x.id === p.id ? 'var(--accent)' : 'var(--border)'};border-radius:var(--r);cursor:pointer"><input type="radio" name="preset" value="${x.id}" ${x.id === p.id ? 'checked' : ''} style="margin-top:4px"><div><div style="font-weight:600">${esc(x.label)}</div><div class="small muted">${esc(x.tagline)}</div><div class="small muted mono">${x.locale.currency} · ${x.locale.areaUnit} · margin ${x.economics.marginPct.low}–${x.economics.marginPct.high} % · ${x.contexts.join(', ')}</div></div></label>`).join('')}
    </div>
  </div>
  <div class="card">
    <h2>Group weights <span class="mono ${Math.abs(total - 100) < 0.5 ? 'muted' : ''}" style="${Math.abs(total - 100) < 0.5 ? '' : 'color:var(--bad)'}">Σ ${total.toFixed(0)} %</span></h2>
    <p style="margin-bottom:10px">Direct weights are "Quick mode". The UK Government Analysis Function calls simple importance weighting invalid because it ignores the <i>range</i> of performance — use <b>Swing</b> (rate each group's worst→best swing, biggest = 100) or the <b>AHP</b> wizard (pairwise, with a consistency check) in Expert mode.</p>
    <div class="stack">
      ${groups.map(g => `<div class="row" style="gap:10px"><span style="flex:1">${g.icon} ${g.label}</span><input class="mono" type="number" min="0" max="100" step="1" data-w="${g.id}" value="${ov[g.id] ?? p.weights[g.id]}" style="width:70px;text-align:right;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:4px 6px"><span class="muted small">%</span><span class="muted small mono" style="width:60px;text-align:right">default ${p.weights[g.id]}</span></div>`).join('')}
    </div>
    <div class="row" style="margin-top:10px;gap:6px">
      <button class="btn sm" id="wReset">Reset to preset</button>
      <button class="btn sm" id="wNormalise">Normalise to 100</button>
      ${state.mode === 'expert' ? '<button class="btn sm" id="wSwing">Swing weighting…</button><button class="btn sm" id="wAhp">AHP wizard…</button>' : ''}
    </div>
    <div id="wTool" style="margin-top:12px"></div>
  </div>
  <div class="card">
    <h2>Data</h2>
    <div class="row" style="gap:6px;flex-wrap:wrap">
      <button class="btn" id="exportJson">Export JSON</button>
      <label class="btn" for="importJson" style="cursor:pointer">Import JSON</label><input type="file" id="importJson" accept="application/json" class="hidden">
      <button class="btn" id="shareUrl">Copy share link (this bid)</button>
      <button class="btn" id="loadSamples">Load 3 sample bids</button>
      <button class="btn danger" id="resetAll">Reset everything</button>
    </div>
    <p class="small" style="margin-top:8px">Everything is stored in this browser only (localStorage). Export before clearing site data. Share links carry the current bid in the URL fragment — the fragment is never sent to a server.</p>
  </div>
  <div class="card">
    <h2>About this preset's constants</h2>
    <div class="tbl-wrap"><table><tbody>
      ${Object.entries(p.gates).filter(([k]) => !['sourceNote', 'valid_from'].includes(k)).map(([k, v]) => `<tr><td class="mono small">${esc(k)}</td><td class="num small">${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="small muted" style="margin-top:6px">valid_from ${p.gates.valid_from}${p.gates.sourceNote ? ' — ' + esc(p.gates.sourceNote) : ''}</div>
  </div>`;
}
function bindSettings(root) {
  $$('input[name=preset]', root).forEach(r => r.addEventListener('change', () => {
    setPreset(r.value);
    commit({ rerender: true }); toast(`Preset: ${preset().label}`);
  }));
  $$('[data-w]', root).forEach(inp => inp.addEventListener('input', () => {
    const p = preset(); state.weightsOverride[p.id] ||= {};
    state.weightsOverride[p.id][inp.dataset.w] = Number(inp.value) || 0;
    commit();
    const total = $$('[data-w]', root).reduce((s, i) => s + (Number(i.value) || 0), 0);
    const h = $('.card:nth-of-type(2) h2 .mono', root); if (h) { h.textContent = `Σ ${total.toFixed(0)} %`; h.style.color = Math.abs(total - 100) < 0.5 ? '' : 'var(--bad)'; }
  }));
  $('#wReset', root).onclick = () => { delete state.weightsOverride[preset().id]; commit({ rerender: true }); };
  $('#wNormalise', root).onclick = () => {
    const p = preset(); const ov = state.weightsOverride[p.id] || {};
    const groups = GROUPS.filter(g => g.axis === 'attractiveness' && p.weights[g.id] > 0);
    const total = groups.reduce((s, g) => s + (ov[g.id] ?? p.weights[g.id]), 0) || 1;
    state.weightsOverride[p.id] = Object.fromEntries(groups.map(g => [g.id, Math.round(((ov[g.id] ?? p.weights[g.id]) / total) * 100)]));
    commit({ rerender: true });
  };
  const sw = $('#wSwing', root); if (sw) sw.onclick = () => import('./views-weights.js').then(m => m.swingTool($('#wTool', root), ctx()));
  const ah = $('#wAhp', root); if (ah) ah.onclick = () => import('./views-weights.js').then(m => m.ahpTool($('#wTool', root), ctx()));

  $('#exportJson', root).onclick = () => download('bidgate-export.json', S.exportJSON(state), 'application/json');
  $('#importJson', root).addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const s = S.importJSON(await f.text()); if (s) { state = s; commit({ rerender: true }); toast('Imported'); } } catch (err) { toast('Import failed: ' + err.message); }
  });
  $('#shareUrl', root).onclick = async () => {
    const hash = S.encodeShare(state);
    const url = location.origin + location.pathname + '#share=' + hash;
    try { await navigator.clipboard.writeText(url); toast('Share link copied'); } catch { prompt('Copy this link', url); }
  };
  $('#loadSamples', root).onclick = () => { loadSamples(); toast('Loaded 3 sample bids into the pipeline'); };
  $('#resetAll', root).onclick = () => { if (confirm('Delete all bids, settings and history in this browser?')) { state = S.defaultState(); commit({ rerender: true }); } };
}
export function download(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
function loadSamples() {
  const samples = sampleBids();
  for (const bid of samples) {
    const presetId = bid.id === 'sample_gated' ? 'commercial_ti' : bid.id === 'sample_cond' ? 'specialty_turf' : 'multifamily';
    const p = PRESETS[presetId];
    const r = evaluate(p, bid.scores, bid.dealKillers);
    const route = ROUTES.find(x => x.id === bid.route);
    const pw = pwin({ route, wins: bid.econ.wins, bids: bid.econ.bids, competitors: bid.competitors, winnability: r.winnability });
    const ev = expectedValue({ value: bid.value, marginPct: bid.econ.marginMode, p: pw.p, route, preset: p, scopeScore: bid.scores.pr_scope, bidHours: bid.econ.bidHours, loadedRate: bid.econ.loadedRate });
    const rec = { id: bid.id, bid, presetId, savedAt: new Date().toISOString(), attractiveness: r.attractiveness, winnability: r.winnability, band: r.band?.id, pwin: pw.p, ev: ev.ev, value: bid.value, route: bid.route, gates: r.gateHits.map(g => g.name), outcome: 'pending', actualMargin: null, bandShown: r.band?.id, decisionTaken: null, sample: true };
    const i = state.saved.findIndex(s => s.id === bid.id);
    if (i >= 0) state.saved[i] = rec; else state.saved.push(rec);
  }
  // also make the GO sample the current bid if the current one is empty
  if (!Object.keys(state.bid.scores).length) { state.presetId = 'multifamily'; state.bid = JSON.parse(JSON.stringify(samples[0])); }
  commit({ rerender: true });
}

/* ───────────────────────────── boot ───────────────────────────── */
function boot() {
  C.fontDefaults();
  // share link?
  if (location.hash.startsWith('#share=')) {
    try {
      const o = S.decodeShare(location.hash.slice(7));
      state.presetId = PRESETS[o.presetId] ? o.presetId : state.presetId;
      state.bid = S.migrate({ ...S.defaultState(), bid: o.bid }).bid;
      state.bid.id = 'bid_' + Date.now().toString(36);
      if (o.weightsOverride) state.weightsOverride = { ...state.weightsOverride, ...o.weightsOverride };
      history.replaceState(null, '', location.pathname);
      toast('Loaded shared bid');
    } catch { toast('Could not read share link'); }
  }
  // first run: seed samples so the page is never empty
  if (!state.seenIntro) { state.seenIntro = true; loadSamples(); state.view = 'score'; }

  $('#presetSelect').innerHTML = PRESET_LIST.map(p => `<option value="${p.id}">${esc(p.label)}</option>`).join('');
  $('#presetSelect').addEventListener('change', e => { setPreset(e.target.value); commit({ rerender: true }); });
  $('#modeSimple').onclick = () => { state.mode = 'simple'; commit({ rerender: true }); };
  $('#modeExpert').onclick = () => { state.mode = 'expert'; commit({ rerender: true }); };
  $('#themeBtn').onclick = () => {
    const root = document.documentElement; const cur = root.dataset.theme;
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    if (!cur) root.dataset.theme = dark ? 'light' : 'dark'; else if (cur === 'dark') root.dataset.theme = 'light'; else delete root.dataset.theme;
    try { localStorage.setItem('bidgate.theme', root.dataset.theme || ''); } catch {}
    render();
  };
  try { const t = localStorage.getItem('bidgate.theme'); if (t) document.documentElement.dataset.theme = t; } catch {}
  window.addEventListener('beforeprint', () => { $('#memo').innerHTML = renderMemo(compute(), state); });
  render();
}
document.addEventListener('DOMContentLoaded', boot);
