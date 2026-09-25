/* Expert weighting tools: swing weighting and AHP pairwise wizard */
import { swingWeights, ahp, reciprocalMatrix, ahpWorstCell, nearestSaaty } from '../engine/weights.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function attractGroups(X) {
  const p = X.preset();
  return X.GROUPS.filter(g => g.axis === 'attractiveness' && p.weights[g.id] > 0);
}

export function swingTool(root, X) {
  const groups = attractGroups(X);
  const p = X.preset();
  const ov = state(X).weightsOverride[p.id] || {};
  const swings = Object.fromEntries(groups.map(g => [g.id, Math.round(((ov[g.id] ?? p.weights[g.id]) / Math.max(...groups.map(x => ov[x.id] ?? p.weights[x.id]))) * 100)]));
  root.innerHTML = `<div class="callout small" style="margin-bottom:8px"><b>Swing weighting.</b> Imagine a bid scoring 1 on every group. For each group, how much would it improve the decision to move <i>that group alone</i> from its worst anchor to its best? Give the biggest swing 100 and rate the others against it. This weights by range of impact, not by vague "importance".</div>
  <div class="stack">${groups.map(g => `<div class="row" style="gap:10px"><span style="flex:1">${g.icon} ${g.label}</span><input type="range" min="0" max="100" data-sw="${g.id}" value="${swings[g.id]}" style="flex:2"><span class="mono small" id="swv_${g.id}" style="width:36px;text-align:right">${swings[g.id]}</span><span class="mono small muted" id="sww_${g.id}" style="width:56px;text-align:right"></span></div>`).join('')}</div>
  <div class="row" style="margin-top:10px;gap:6px"><button class="btn primary sm" id="swApply">Apply as weights</button><button class="btn ghost sm" id="swClose">Close</button></div>`;
  const update = () => {
    const w = swingWeights(Object.fromEntries($$('[data-sw]', root).map(i => [i.dataset.sw, Number(i.value)])));
    for (const g of groups) { $(`#swv_${g.id}`, root).textContent = $(`[data-sw="${g.id}"]`, root).value; $(`#sww_${g.id}`, root).textContent = w[g.id] != null ? '→ ' + w[g.id].toFixed(0) + ' %' : '→ 0 %'; }
    return w;
  };
  $$('[data-sw]', root).forEach(i => i.addEventListener('input', update));
  update();
  $('#swApply', root).onclick = () => { const w = update(); state(X).weightsOverride[p.id] = Object.fromEntries(groups.map(g => [g.id, Math.round(w[g.id] || 0)])); X.commit({ rerender: true }); X.toast('Swing weights applied'); };
  $('#swClose', root).onclick = () => root.innerHTML = '';
}

/** Saaty's fundamental scale, including the even "between" values, so every suggested revision is selectable. */
const SAATY = [
  { v: 9, l: '9 — extremely more' }, { v: 8, l: '8' }, { v: 7, l: '7 — very strongly more' }, { v: 6, l: '6' }, { v: 5, l: '5 — strongly more' }, { v: 4, l: '4' }, { v: 3, l: '3 — moderately more' }, { v: 2, l: '2' },
  { v: 1, l: '1 — equal' },
  { v: 1 / 2, l: '½' }, { v: 1 / 3, l: '⅓ — moderately less' }, { v: 1 / 4, l: '¼' }, { v: 1 / 5, l: '⅕ — strongly less' }, { v: 1 / 6, l: '⅙' }, { v: 1 / 7, l: '⅐ — very strongly less' }, { v: 1 / 8, l: '⅛' }, { v: 1 / 9, l: '⅑ — extremely less' },
];

export function ahpTool(root, X) {
  const groups = attractGroups(X);
  const p = X.preset();
  const n = groups.length;
  const judgements = {};
  // seed from current weights so the wizard starts consistent
  const cur = groups.map(g => (state(X).weightsOverride[p.id]?.[g.id]) ?? p.weights[g.id]);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) judgements[`${i},${j}`] = nearestSaaty(cur[i] / cur[j]);
  const pairs = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j]);
  root.innerHTML = `<div class="callout small" style="margin-bottom:8px"><b>AHP pairwise wizard.</b> ${pairs.length} comparisons on Saaty's 1–9 scale. Row geometric means → weights; consistency ratio (CR) flags incoherent judgements (CR &gt; 0.10). AHP can exhibit rank reversal when alternatives are added — here it only derives group weights, which is where it is safe.</div>
  <div class="tbl-wrap"><table><tbody>${pairs.map(([i, j]) => `<tr><td class="small" style="width:30%">${groups[i].icon} ${groups[i].label}</td><td><select data-pair="${i},${j}" class="btn sm" style="width:100%" aria-label="${groups[i].label} compared with ${groups[j].label}">${SAATY.map(s => `<option value="${s.v}" ${Math.abs(s.v - judgements[`${i},${j}`]) < 1e-6 ? 'selected' : ''}>${s.l}</option>`).join('')}</select></td><td class="small" style="width:30%">${groups[j].icon} ${groups[j].label}</td></tr>`).join('')}</tbody></table></div>
  <div id="ahpOut" style="margin-top:10px"></div>
  <div class="row" style="margin-top:10px;gap:6px"><button class="btn primary sm" id="ahpApply">Apply as weights</button><button class="btn ghost sm" id="ahpClose">Close</button></div>`;
  const compute = () => {
    for (const sel of $$('[data-pair]', root)) judgements[sel.dataset.pair] = Number(sel.value);
    const A = reciprocalMatrix(n, judgements);
    const r = ahp(A);
    const worst = r.consistent ? null : ahpWorstCell(A);
    $('#ahpOut', root).innerHTML = `<div class="row between"><span class="small"><b>CR = ${r.cr.toFixed(3)}</b> <span class="pill ${r.consistent ? 'good' : 'bad'}">${r.consistent ? 'consistent' : 'inconsistent'}</span></span><span class="small muted">λmax ${r.lambdaMax.toFixed(3)} · n ${n}</span></div>
      <div class="stack" style="margin-top:6px">${groups.map((g, i) => `<div class="row between small"><span>${g.icon} ${g.label}</span><span class="mono">${(r.weights[i] * 100).toFixed(1)} %</span></div>`).join('')}</div>
      ${worst ? `<div class="callout warn small" style="margin-top:8px">Most inconsistent judgement: <b>${groups[worst.i].label}</b> vs <b>${groups[worst.j].label}</b> (currently ${fmtSaaty(worst.current)}; your other answers imply ${fmtSaaty(worst.suggested)} on the scale). Revising it reduces CR by ${worst.delta.toFixed(3)}. <button type="button" class="btn sm" id="ahpFix">Apply ${fmtSaaty(worst.suggested)}</button></div>` : ''}`;
    const fix = $('#ahpFix', root); if (fix && worst) fix.onclick = () => { const sel = $(`[data-pair="${worst.i},${worst.j}"]`, root); if (sel) { sel.value = String(worst.suggested); compute(); } };
    return r;
  };
  $$('[data-pair]', root).forEach(s => s.addEventListener('change', compute));
  compute();
  $('#ahpApply', root).onclick = () => { const r = compute(); state(X).weightsOverride[p.id] = Object.fromEntries(groups.map((g, i) => [g.id, Math.round(r.weights[i] * 100)])); X.commit({ rerender: true }); X.toast(`AHP weights applied (CR ${r.cr.toFixed(2)})`); };
  $('#ahpClose', root).onclick = () => root.innerHTML = '';
}

function fmtSaaty(v) { return v >= 1 ? String(Math.round(v * 10) / 10) : '1/' + Math.round((1 / v) * 10) / 10; }
function state(X) { return X.state; }
