/* BidGate UI — main module. Views: gates · score · economics · capacity · decision · pipeline · calibration · settings */
import { GROUPS, CRITERIA_BY_ID } from '../data/criteria.js';
import { PRESETS, PRESET_LIST, ROUTES } from '../data/presets.js';
import { dealKillersFor, MITIGATIONS } from '../data/dealkillers.js';
import { sensitivity, robustness, weakestLinks, BANDS, isVerdict } from '../engine/scoring.js';
import { markupCurve } from '../engine/pwin.js';
import { fmtMoney } from '../engine/ev.js';
import { simulate } from '../engine/montecarlo.js';
import { assess, effectivePreset, pipelineRecord } from '../engine/assess.js';
import * as S from './state.js';
import * as C from './charts.js';
import { icon } from './icons.js';
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
/** Preset with the Settings weight override applied (this bid's own override, if any, is applied inside assess()). */
export function presetWithOverrides() {
  const p = preset();
  return effectivePreset(p, state.weightsOverride[p.id], null);
}
export const money = (n, compact = true) => fmtMoney(n, preset().locale.locale, preset().locale.currency, compact);
export const pct = (x, d = 0) => (x == null || Number.isNaN(x) ? '–' : (x * 100).toFixed(d) + ' %');
export const num = (x, d = 0) => (x == null || Number.isNaN(x) ? '–' : Number(x).toFixed(d));

/* ───────────────────────────── derived ───────────────────────────── */
export function compute() {
  return assess(presetWithOverrides(), state.bid);
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
  { id: 'gates', label: 'Gates', icon: 'slash' },
  { id: 'score', label: 'Score', icon: 'bar-chart-2' },
  { id: 'economics', label: 'Economics', icon: 'dollar-sign' },
  { id: 'capacity', label: 'Capacity & Materials', icon: 'tool' },
  { id: 'decision', label: 'Decision', icon: 'check-circle' },
  { id: 'pipeline', label: 'Pipeline', icon: 'layers' },
  { id: 'calibration', label: 'Calibration', icon: 'target' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];
function renderNav() {
  $('#nav').innerHTML = VIEWS.map(v => `<button type="button" data-view="${v.id}" ${state.view === v.id ? 'aria-current="page"' : ''}>${icon(v.icon)}${v.label}<span class="badge" id="badge_${v.id}"></span></button>`).join('');
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
/** One sentence on what stands between this bid and a verdict. Shared by the side panel, Decision view and memo. */
export function incompleteWhy(r) {
  const gates = r.unscoredGates.length;
  const more = r.moreNeeded;
  const covered = `${(r.weightedCoverage * 100).toFixed(0)} % scored`;
  if (!more) return `${covered} — score a criterion to begin.`;
  const need = `score ${more} more for a verdict`;
  const gateNote = gates ? ` (${gates} gate criteri${gates === 1 ? 'on' : 'a'} still unscored: ${r.unscoredGates.map(g => g.name).join('; ')})` : '';
  return `${covered} — ${need}${gateNote}. A verdict needs every gate criterion scored and ≥ ${(r.coverageThreshold * 100).toFixed(0)} % of the weighted card.`;
}
export function renderSide() {
  const d = compute();
  const r = d.result;
  const band = d.band;
  const tone = band ? band.tone : 'neutral';
  const title = band ? `${icon(band.svgIcon)}${band.label}` : 'Not yet scored';
  let why = '';
  if (!band) why = 'Score criteria to generate a recommendation. Gates are evaluated first.';
  else if (band.id === 'GATED') why = `${d.allGates.length} gate${d.allGates.length > 1 ? 's' : ''} active — disqualified regardless of score.`;
  else if (band.id === 'INCOMPLETE') why = incompleteWhy(r);
  else if (r.floorHits.length) why = `Capped at CONDITIONAL: ${r.floorHits.map(f => f.name).join('; ')} scored ≤ 2.`;
  else if (band.id === 'GO') why = 'Strong fit. Run the pre-mortem before committing estimating hours.';
  else if (band.id === 'APPROVAL') why = 'Proceed only with a named approver and conditions recorded.';
  else if (band.id === 'CONDITIONAL') why = 'Identify the weakest links and what would flip this before spending on the bid.';
  else why = 'Insufficient alignment. Decline or seek further information.';

  $('#side').innerHTML = `
    <div class="verdict ${tone}" aria-live="polite">
      <div class="eyebrow">Recommendation · ${esc(d.p.label)}${d.b.weightsOverride ? ' · <span title="This bid carries its own group weights (from a share link). Settings › Group weights to review or discard.">bid-level weights</span>' : ''}</div>
      <div class="title">${title}</div>
      <div class="why">${esc(why)}</div>
      <div class="kpis">
        <div class="kpi"><div class="v">${num(r.attractiveness, 0)}</div><div class="l">Attractiveness /100</div></div>
        <div class="kpi"><div class="v">${r.winnability == null ? '–' : num(r.winnability, 0)}</div><div class="l">Winnability /100</div></div>
        <div class="kpi"><div class="v">${pct(d.pw.p)}</div><div class="l">P(win) modelled</div></div>
        <div class="kpi"><div class="v">${d.b.value ? money(d.ev.ev) : '–'}</div><div class="l">Expected value</div></div>
      </div>
      <div class="progress" style="margin-top:10px" title="${r.scoredCount} of ${r.totalCount} criteria scored"><i style="width:${(r.coverage * 100).toFixed(0)}%"></i></div>
      <div class="small muted" style="margin-top:4px">${r.scoredCount}/${r.totalCount} criteria scored · ${(r.weightedCoverage * 100).toFixed(0)} % of weight${d.curse ? ' · <span style="color:var(--warn)">winner\'s-curse zone</span>' : ''}</div>
      ${d.allGates.length ? `<div class="gatelist">${d.allGates.map(g => `<div class="g">${icon('slash')}<span>${esc(g.name)}${g.detail ? ` <span class="muted">— ${esc(g.detail)}</span>` : ''}</span></div>`).join('')}</div>` : ''}
    </div>
    <div class="card">
      <h2>Category profile</h2>
      <div class="chart" style="height:180px"><canvas id="sideRadar" aria-label="Radar chart of category scores"></canvas></div>
      <div class="stack" style="margin-top:8px">
        ${GROUPS.filter(g => r.groupStats[g.id].count > 0).map(g => {
          const gs = r.groupStats[g.id];
          return `<div class="row between small"><span>${icon(g.icon)} ${g.label}</span><span class="mono">${gs.pct == null ? '–' : gs.pct.toFixed(0)}${g.axis === 'attractiveness' && gs.weight ? ` <span class="muted">· w ${(gs.weight * 100).toFixed(0)}%</span>` : ''}</span></div>`;
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
  const existingIdx = state.saved.findIndex(s => s.bid.id === snap.id);
  const existing = existingIdx >= 0 ? state.saved[existingIdx] : null;
  const rec = pipelineRecord(d, snap, state.presetId, existing);
  if (existingIdx >= 0) state.saved[existingIdx] = rec; else state.saved.unshift(rec);
  commit();
  toast(rec.frozen ? `Outcome already recorded (${existing.outcome}) — notes and decision updated; the forecast stays as made` : existing ? 'Bid updated in pipeline' : 'Saved to pipeline');
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
function ctx() { return { state, compute, commit, toast, esc, money, pct, num, preset, presetWithOverrides, setView, saveToPipeline, printMemo, incompleteWhy, C, ROUTES, GROUPS, CRITERIA_BY_ID, MITIGATIONS, sensitivity, robustness, weakestLinks, simulate, markupCurve, S, BANDS, isVerdict }; }

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
      ${dks.map(k => `<div class="row" style="gap:10px;padding:6px 0;border-bottom:1px solid var(--border)"><button type="button" class="switch" role="switch" aria-checked="${d.b.dealKillers.includes(k.id)}" data-dk="${k.id}" aria-label="${esc(k.label)}"></button><span class="small" style="flex:1;${d.b.dealKillers.includes(k.id) ? 'color:var(--bad);font-weight:600' : ''}">${esc(k.label)}</span></div>`).join('')}
    </div>
  </div>
  <div class="card">
    <h2>Gate criteria <span class="pill neutral">score of 1 = gate</span></h2>
    <p style="margin-bottom:10px">These criteria in the scorecard carry a hard gate at 1. An unscored gate criterion is not a pass: the verdict stays INCOMPLETE until every one of them is scored.</p>
    <div class="list">
      ${gateCriteria.map(c => { const s = d.b.scores[c.id]; const hit = s != null && s <= c.gate.at; return `<div class="item"><span>${esc(c.name)}</span><span class="pill ${hit ? 'bad' : s == null ? 'warn' : 'good'}">${hit ? icon('x-circle') + ' gated' : s == null ? icon('circle') + ' unscored' : icon('check') + ' ' + s}</span></div>`; }).join('')}
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
  <div class="callout small" style="margin-bottom:12px">Keyboard: <span class="kbd">Tab</span> moves between criteria, <span class="kbd">←</span>/<span class="kbd">→</span> between scores, <span class="kbd">1</span>–<span class="kbd">5</span> scores directly, <span class="kbd">0</span> clears, <span class="kbd">?</span> shows anchors. Pressing the selected score again clears it. ${expert ? 'Expert mode: notes are requested for any score ≥ 4 — evidence a stranger would accept.' : 'Switch to Expert for evidence notes and source pointers.'}</div>
  ${groups.map(g => {
    const cs = list.filter(c => c.group === g.id);
    const gs = d.result.groupStats[g.id];
    const w = d.p.weights[g.id];
    return `<div class="group card" data-group="${g.id}">
      <div class="group-head" data-toggle="${g.id}">
        <div class="t">${icon(g.icon)}${g.label}${g.axis === 'winnability' ? ' <span class="pill mid">winnability axis</span>' : ''}</div>
        <div class="m"><span id="gpct_${g.id}">${gs.pct == null ? '–' : gs.pct.toFixed(0)}</span>${g.axis === 'attractiveness' ? `<span class="muted">w ${w}%</span>` : ''}<span id="gcnt_${g.id}">${gs.n}/${gs.count}</span><span aria-hidden="true">▾</span></div>
      </div>
      <div class="group-body" id="gbody_${g.id}">
        ${cs.map(c => critHTML(c, d, expert)).join('')}
      </div>
    </div>`;
  }).join('')}`;
}
/**
 * One criterion card. The five score buttons are an ARIA radio group with a roving tabindex: one Tab stop per
 * criterion (the checked score, or 1 when unscored), arrow keys move within the group, Tab leaves it.
 */
function critHTML(c, d, expert) {
  const s = d.b.scores[c.id];
  const gateHit = c.gate && s != null && s <= c.gate.at;
  const floorHit = c.floor && s != null && s <= c.floor.at;
  const tabStop = s ?? 1;
  return `<div class="crit ${gateHit ? 'gate-hit' : ''} ${floorHit ? 'floor-hit' : ''}" data-crit="${c.id}">
    <div class="head">
      <div class="name" id="critname_${c.id}">${esc(c.name)}<span class="tags">${c.gate ? '<span class="tag gate">gate @1</span>' : ''}${c.floor ? '<span class="tag floor">floor @2</span>' : ''}</span></div>
      <button type="button" class="btn ghost sm" data-anchors="${c.id}" tabindex="-1" aria-expanded="${expert}" aria-controls="anch_${c.id}" aria-label="Show anchors for ${esc(c.name)}" title="Show anchors (keyboard: ?)">?</button>
    </div>
    <div class="anchors ${expert ? '' : 'hidden'}" id="anch_${c.id}">
      <div><b>1</b>${esc(c.anchors[1])}</div><div><b>3</b>${esc(c.anchors[3])}</div><div><b>5</b>${esc(c.anchors[5])}</div>
    </div>
    <div class="radio" role="radiogroup" aria-labelledby="critname_${c.id}" aria-describedby="anch_${c.id}">
      ${[1, 2, 3, 4, 5].map(v => `<button type="button" role="radio" class="s${v}" aria-checked="${s === v}" tabindex="${v === tabStop ? 0 : -1}" data-score="${v}" aria-label="${v}${c.anchors[v] ? ' — ' + esc(c.anchors[v]) : ''}">${v}</button>`).join('')}
    </div>
    <div class="note ${expert ? '' : 'hidden'}"><label class="sr-only" for="note_${c.id}">Evidence note for ${esc(c.name)}</label><input id="note_${c.id}" data-note="${c.id}" placeholder="Evidence / note (what did you see, when, from whom)" value="${esc(d.b.notes[c.id] || '')}"></div>
    ${expert ? `<div class="evidence">Source: ${esc(c.evidence)}</div>` : ''}
  </div>`;
}
function bindScore(root) {
  bindBidHeader(root);
  $$('[data-toggle]', root).forEach(h => h.addEventListener('click', () => { $(`#gbody_${h.dataset.toggle}`, root).classList.toggle('hidden'); }));
  $$('[data-anchors]', root).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const a = $(`#anch_${b.dataset.anchors}`, root); a.classList.toggle('hidden'); b.setAttribute('aria-expanded', !a.classList.contains('hidden')); }));
  $$('.crit', root).forEach(card => {
    const id = card.dataset.crit;
    const radios = $$('[data-score]', card);
    radios.forEach(btn => btn.addEventListener('click', () => {
      const v = Number(btn.dataset.score);
      if (state.bid.scores[id] === v) setScore(id, null, card);   // pressing the selected score again clears it (announced)
      else setScore(id, v, card);
    }));
    card.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      const inRadio = e.target.matches('[data-score]');
      if (/^[1-5]$/.test(e.key)) { e.preventDefault(); setScore(id, Number(e.key), card); }
      else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); setScore(id, null, card); }
      else if (inRadio && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) { e.preventDefault(); const cur = Number(e.target.dataset.score); setScore(id, cur >= 5 ? 1 : cur + 1, card); }
      else if (inRadio && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) { e.preventDefault(); const cur = Number(e.target.dataset.score); setScore(id, cur <= 1 ? 5 : cur - 1, card); }
      else if (inRadio && e.key === 'Home') { e.preventDefault(); setScore(id, 1, card); }
      else if (inRadio && e.key === 'End') { e.preventDefault(); setScore(id, 5, card); }
      else if (e.key === 'j') { e.preventDefault(); const n = card.nextElementSibling || card.closest('.group').nextElementSibling?.querySelector('.crit'); focusCrit(n); }
      else if (e.key === 'k') { e.preventDefault(); const p = card.previousElementSibling || card.closest('.group').previousElementSibling?.querySelector('.crit:last-child'); focusCrit(p); }
      else if (e.key === '?') { e.preventDefault(); const a = $(`#anch_${id}`, card); a.classList.toggle('hidden'); $('[data-anchors]', card)?.setAttribute('aria-expanded', !a.classList.contains('hidden')); }
    });
    const note = $('[data-note]', card); if (note) note.addEventListener('input', e => { state.bid.notes[id] = e.target.value; S.save(state); });
  });
}
function focusCrit(card) {
  if (!card) return;
  const tab = $('[data-score][tabindex="0"]', card) || $('[data-score]', card);
  tab?.focus();
  card.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
/** Set (val 1–5) or clear (null) a criterion's score; keep the roving tabindex and focus on the group. */
function setScore(id, val, card) {
  const b = state.bid;
  const c = CRITERIA_BY_ID[id];
  if (val == null) delete b.scores[id]; else b.scores[id] = val;
  const s = b.scores[id];
  const tabStop = s ?? 1;
  const wasInside = card.contains(document.activeElement);
  $$('[data-score]', card).forEach(btn => {
    const v = Number(btn.dataset.score);
    btn.setAttribute('aria-checked', v === s);
    btn.setAttribute('tabindex', v === tabStop ? 0 : -1);
    if (wasInside && v === tabStop) btn.focus({ preventScroll: true });
  });
  card.classList.toggle('gate-hit', !!(c.gate && s != null && s <= c.gate.at));
  card.classList.toggle('floor-hit', !!(c.floor && s != null && s <= c.floor.at));
  const d = compute();
  const gs = d.result.groupStats[c.group];
  const pe = $(`#gpct_${c.group}`); if (pe) pe.textContent = gs.pct == null ? '–' : gs.pct.toFixed(0);
  const ce = $(`#gcnt_${c.group}`); if (ce) ce.textContent = `${gs.n}/${gs.count}`;
  if (state.mode === 'expert' && s >= 4 && !b.notes[id]) { const n = $('[data-note]', card); n?.setAttribute('placeholder', 'A 4 or 5 needs evidence a stranger would accept — what is it?'); }
  if (val == null) toast(`Cleared: ${c.name}`);
  commit();
}

/* ───────────────────────────── VIEW: settings ───────────────────────────── */
function viewSettings(d) {
  const p = preset();
  const ov = state.weightsOverride[p.id] || {};
  const bidOv = state.bid.weightsOverride;
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
    ${bidOv ? `<div class="callout warn small" style="margin-bottom:10px"><b>This bid carries its own weights</b> (it arrived by share link): ${groups.map(g => `${g.short} ${bidOv[g.id] ?? p.weights[g.id]}`).join(' · ')}. They apply to this bid only; the weights below are your saved settings and are unchanged. <button type="button" class="btn sm" id="wDropBid" style="margin-left:6px">Use my weights for this bid</button></div>` : ''}
    <p style="margin-bottom:10px">Direct weights are "Quick mode". The UK Government Analysis Function calls simple importance weighting invalid because it ignores the <i>range</i> of performance — use <b>Swing</b> (rate each group's worst→best swing, biggest = 100) or the <b>AHP</b> wizard (pairwise, with a consistency check) in Expert mode.</p>
    <div class="stack">
      ${groups.map(g => `<div class="row" style="gap:10px"><label for="w_${g.id}" style="flex:1">${icon(g.icon)} ${g.label}</label><input id="w_${g.id}" class="mono" type="number" min="0" max="100" step="1" data-w="${g.id}" value="${ov[g.id] ?? p.weights[g.id]}" style="width:70px;text-align:right;background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:4px 6px"><span class="muted small">%</span><span class="muted small mono" style="width:60px;text-align:right">default ${p.weights[g.id]}</span></div>`).join('')}
    </div>
    <div class="row" style="margin-top:10px;gap:6px">
      <button type="button" class="btn sm" id="wReset">Reset to preset</button>
      <button type="button" class="btn sm" id="wNormalise">Normalise to 100</button>
      ${state.mode === 'expert' ? '<button type="button" class="btn sm" id="wSwing">Swing weighting…</button><button type="button" class="btn sm" id="wAhp">AHP wizard…</button>' : ''}
    </div>
    <div id="wTool" style="margin-top:12px"></div>
  </div>
  <div class="card">
    <h2>Data</h2>
    <div class="row" style="gap:6px;flex-wrap:wrap">
      <button type="button" class="btn" id="exportJson">Export JSON</button>
      <label class="btn" for="importJson" style="cursor:pointer">Import JSON</label><input type="file" id="importJson" accept="application/json" class="hidden">
      <button type="button" class="btn" id="shareUrl">Copy share link (this bid)</button>
      <button type="button" class="btn" id="loadSamples">Load ${sampleBids().length} sample bids</button>
      <button type="button" class="btn danger" id="resetAll">Reset everything</button>
    </div>
    <p class="small" style="margin-top:8px">Everything is stored in this browser only (localStorage). Export before clearing site data. Import replaces your whole pipeline and settings — you are asked to confirm. Share links carry the current bid and your weights for it in the URL fragment, which is never sent to a server; whoever opens one is asked before it replaces their current bid, and your weights apply to that bid only, never to their settings.</p>
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
  const drop = $('#wDropBid', root); if (drop) drop.onclick = () => { delete state.bid.weightsOverride; commit({ rerender: true }); toast('Bid now uses your weights'); };
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
    try {
      const s = S.importJSON(await f.text());
      if (!s) throw new Error('empty file');
      const n = state.saved.length;
      const msg = `Import "${f.name}"? It replaces everything in this browser: your current bid, ${n} saved bid${n === 1 ? '' : 's'} in the pipeline, and your settings. Export first if you want to keep them.`;
      if (!confirm(msg)) { toast('Import cancelled'); e.target.value = ''; return; }
      state = s; commit({ rerender: true }); toast('Imported');
    } catch (err) { toast('Import failed: ' + err.message); }
    e.target.value = '';
  });
  $('#shareUrl', root).onclick = async () => {
    const hash = S.encodeShare(state);
    const url = location.origin + location.pathname + '#share=' + hash;
    try { await navigator.clipboard.writeText(url); toast('Share link copied'); } catch { prompt('Copy this link', url); }
  };
  $('#loadSamples', root).onclick = () => { const n = loadSamples(); toast(`Loaded ${n} sample bids into the pipeline`); };
  $('#resetAll', root).onclick = () => { if (confirm('Delete all bids, settings and history in this browser?')) { state = S.defaultState(); commit({ rerender: true }); } };
}
export function download(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
/** Samples go through the same assess() → pipelineRecord() path as a hand-scored bid, so they carry the same fields, computed the same way. Returns how many were (re)loaded. */
function loadSamples({ rerender = true } = {}) {
  const samples = sampleBids();
  for (const { bid, presetId } of samples) {
    const rec = pipelineRecord(assess(PRESETS[presetId], bid), bid, presetId, null, { sample: true });
    const i = state.saved.findIndex(s => s.id === bid.id);
    if (i >= 0) state.saved[i] = rec; else state.saved.push(rec);
  }
  // also make the first (GO) sample the current bid if the current one is empty
  if (!Object.keys(state.bid.scores).length) { state.presetId = samples[0].presetId; state.bid = JSON.parse(JSON.stringify(samples[0].bid)); }
  if (rerender) commit({ rerender: true }); else S.save(state);
  return samples.length;
}

/* ───────────────────────────── boot ───────────────────────────── */
/** A share link replaces the current bid only after the person says so; the sender's weights ride on that bid alone. */
function openShareLink(hash) {
  let o;
  try { o = S.decodeShare(hash); } catch { toast('Could not read share link'); return; }
  const cur = state.bid;
  const curHasWork = Object.keys(cur.scores || {}).length > 0 || (cur.name || '').trim() !== '';
  const savedAlready = state.saved.some(s => s.bid.id === cur.id);
  if (curHasWork && !savedAlready) {
    const ok = confirm(`Open the shared bid "${o.bid.name || 'Unnamed'}"?\n\nYour current bid "${cur.name || 'Unnamed'}" has not been saved to the pipeline and will be replaced. Cancel to keep working on it (save it first, then open the link again).`);
    if (!ok) { toast('Kept your current bid'); return; }
  }
  state.presetId = o.presetId;
  state.bid = o.bid;
  state.bid.id = 'bid_' + Date.now().toString(36);
  // o.bid.weightsOverride (the sender's weights) stays on this bid; state.weightsOverride is untouched.
  toast(o.weights ? 'Loaded shared bid with the sender\'s weights (this bid only)' : 'Loaded shared bid');
}
function boot() {
  C.fontDefaults();
  // first run: seed samples so the page is never empty
  if (!state.seenIntro) { state.seenIntro = true; loadSamples({ rerender: false }); state.view = 'score'; }
  if (location.hash.startsWith('#share=')) {
    openShareLink(location.hash.slice(7));
    history.replaceState(null, '', location.pathname);
  }

  $('#presetSelect').innerHTML = PRESET_LIST.map(p => `<option value="${p.id}">${esc(p.label)}</option>`).join('');
  $('#presetSelect').addEventListener('change', e => { setPreset(e.target.value); commit({ rerender: true }); });
  $('#modeSimple').onclick = () => { state.mode = 'simple'; commit({ rerender: true }); };
  $('#modeExpert').onclick = () => { state.mode = 'expert'; commit({ rerender: true }); };
  const applyTheme = t => {
    document.documentElement.dataset.theme = t;
    const btn = $('#themeBtn');
    if (btn) { btn.innerHTML = icon(t === 'dark' ? 'moon' : 'sun'); btn.setAttribute('aria-pressed', t === 'dark'); }
  };
  $('#themeBtn').onclick = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('bidgate.theme', next); } catch {}
    render();
  };
  // Light mode is the default (enterprise-software convention) — only switch to dark on an explicit
  // saved preference. The prefers-color-scheme media query in the stylesheet still covers a no-JS load.
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('bidgate.theme'); } catch {}
  applyTheme(savedTheme === 'dark' ? 'dark' : 'light');
  window.addEventListener('beforeprint', () => { $('#memo').innerHTML = renderMemo(compute(), state); });
  render();
}
document.addEventListener('DOMContentLoaded', boot);
