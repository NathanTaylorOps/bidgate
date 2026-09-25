/* Economics and Capacity & Materials views */
import { leviesFor } from '../engine/ev.js';
import { priceCurves } from '../engine/pwin.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function field(id, label, value, { type = 'number', step = 'any', min, max, hint, placeholder, mono = true } = {}) {
  return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" ${step ? `step="${step}"` : ''} ${min != null ? `min="${min}"` : ''} ${max != null ? `max="${max}"` : ''} value="${value ?? ''}" placeholder="${placeholder ?? ''}" class="${mono ? 'mono' : ''}">${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
}
function bindNum(root, id, setter, after) {
  const el = $('#' + id, root); if (!el) return;
  el.addEventListener('input', e => { const v = e.target.value; setter(v === '' ? null : Number(v)); after?.(); });
}

/* ═══════════════════════════ ECONOMICS ═══════════════════════════ */
export function renderEconomics(main, d, X) {
  const { state, esc, money, pct, num, commit, C, ROUTES } = X;
  const b = state.bid, e = b.econ, p = d.p;
  const isHard = b.route?.startsWith('hardbid');
  const value = b.value || 0;
  const levies = leviesFor(p, value);
  const beta = { low: e.marginLow, mode: e.marginMode, high: e.marginHigh };
  const mc = value ? X.simulate({
    value: { min: value * (1 + (e.valueLowPct || 0) / 100), mode: value, max: value * (1 + (e.valueHighPct || 0) / 100) },
    marginPct: { min: beta.low, mode: beta.mode, max: beta.high },
    pwin: { mean: d.pw.p, kappa: d.pw.kappa },
    bidCost: d.ev.bidCost, postAwardCost: d.ev.postAwardCost, levyRate: levies.reduce((s, l) => s + l.amount, 0) / (value || 1), iterations: 4000, seed: 7,
  }) : null;

  main.innerHTML = `
  <div class="card">
    <h2>Opportunity economics</h2>
    <div class="cols">
      ${field('ecValue', `Subcontract value (${p.locale.currency})`, b.value, { placeholder: '2400000', step: 1000 })}
      <div class="field"><label for="ecRoute">Procurement route</label><select id="ecRoute">${ROUTES.map(r => `<option value="${r.id}" ${b.route === r.id ? 'selected' : ''}>${r.label}</option>`).join('')}</select><span class="hint">base win rate ${pct(d.route.baseWin)} · typical bidders ${d.route.typicalBidders} · bid cost ${pct(d.route.bidCostPct, 1)} of value</span></div>
      ${field('ecCompetitors', 'Expected competitors', b.competitors, { min: 0, max: 30, placeholder: d.route.typicalBidders })}
      ${field('ecDuration', 'Duration (months)', b.durationMonths, { min: 1, max: 60, placeholder: 4 })}
    </div>
    <h3 style="margin-top:14px">Margin — three-point estimate (% of value)</h3>
    <div class="cols">
      ${field('ecMLow', 'Low (P10-ish)', e.marginLow, { step: 0.5 })}
      ${field('ecMMode', 'Most likely', e.marginMode, { step: 0.5 })}
      ${field('ecMHigh', 'High (P90-ish)', e.marginHigh, { step: 0.5 })}
      ${field('ecVLow', 'Value low (%)', e.valueLowPct, { step: 1, hint: 'scope may shrink' })}
      ${field('ecVHigh', 'Value high (%)', e.valueHighPct, { step: 1, hint: 'variations, growth' })}
    </div>
    <h3 style="margin-top:14px">Cost to bid</h3>
    <div class="cols">
      ${field('ecHours', 'Estimating hours', e.bidHours, { min: 0, placeholder: 'blank → route %' })}
      ${field('ecRate', 'Loaded rate / hr', e.loadedRate, { min: 0 })}
      ${field('ecExt', 'External bid costs', e.externalBidCost, { min: 0, hint: 'take-off service, bond premium, printing' })}
    </div>
    <h3 style="margin-top:14px">Your history on this route</h3>
    <div class="cols">
      ${field('ecBids', 'Bids submitted', e.bids, { min: 0, step: 1 })}
      ${field('ecWins', 'Bids won', e.wins, { min: 0, step: 1, hint: 'shrunk toward route base with α = 10 pseudo-bids' })}
    </div>
  </div>

  <div class="cols-2">
    <div class="card" style="margin:0">
      <h2>Win probability</h2>
      <div class="bignum">${pct(d.pw.p)}</div>
      <div class="list" style="margin-top:8px">
        <div class="item"><span>Route base (${esc(d.route.label)})</span><span class="mono">${pct(d.route.baseWin)}</span></div>
        <div class="item"><span>After your history (${e.wins}/${e.bids})</span><span class="mono">${pct(d.pw.p0)}</span></div>
        <div class="item"><span>After competitors (${b.competitors ?? d.route.typicalBidders} vs typical ${d.route.typicalBidders})</span><span class="mono">${pct(d.pw.p1)}</span></div>
        <div class="item"><span>After competitive position (${d.result.winnability == null ? 'unscored' : num(d.result.winnability, 0) + '/100'})</span><span class="mono"><b>${pct(d.pw.p)}</b></span></div>
      </div>
      ${d.curse ? '<div class="callout warn small" style="margin-top:8px"><b>Winner\'s-curse zone.</b> ≥ 6 bidders with unclear scope: the low bidder is usually the one who missed something. Raise contingency; do not cut markup.</div>' : ''}
      <p class="small" style="margin-top:8px">Empirical-Bayes shrinkage toward the route base, 1/(n+1) competitor scaling, logit shift of β = 0.5 per point of competitive position. Refit β from your own record only once 60 decided outcomes are logged.</p>
    </div>
    <div class="card" style="margin:0">
      <h2>Expected value</h2>
      <div class="bignum" style="color:${d.ev.ev >= 0 ? 'var(--good)' : 'var(--bad)'}">${value ? money(d.ev.ev) : '–'}</div>
      <div class="list" style="margin-top:8px">
        <div class="item"><span>Gross profit at ${e.marginMode} %</span><span class="mono">${money(d.ev.grossProfit)}</span></div>
        ${levies.map(l => `<div class="item"><span>− ${esc(l.label)} <span class="muted small">${esc(l.note || '')}</span></span><span class="mono">−${money(l.amount)}</span></div>`).join('')}
        <div class="item"><span>× P(win)</span><span class="mono">${pct(d.pw.p)}</span></div>
        <div class="item"><span>− Cost to bid ${d.ev.hours ? `(${num(d.ev.hours, 0)} h)` : '(route %)'}</span><span class="mono">−${money(d.ev.bidCost)}</span></div>
        <div class="item"><span>EV per estimating hour</span><span class="mono">${d.ev.evPerHour != null ? money(d.ev.evPerHour, false) : '–'}</span></div>
        <div class="item"><span>Break-even P(win)</span><span class="mono">${pct(d.ev.breakEvenP)}</span></div>
        <div class="item"><span>Pursuit cost / gross profit</span><span class="mono" style="${d.ev.pursuitRatio > 0.10 ? 'color:var(--bad)' : ''}">${pct(d.ev.pursuitRatio, 1)}${d.ev.pursuitRatio > 0.10 ? ' ⚠ > 10 %' : ''}</span></div>
        <div class="item"><span>Risk-adjusted EV (σ from scope clarity)</span><span class="mono">${value ? money(d.ev.riskAdjEv) : '–'}</span></div>
      </div>
    </div>
  </div>

  ${mc ? `<div class="card">
    <h2>Monte Carlo · ${mc.n.toLocaleString()} runs <span class="pill neutral">beta-PERT</span></h2>
    <div class="cols" style="margin-bottom:10px">
      <div class="kpi"><div class="v" style="color:${mc.pLoss > 0.1 ? 'var(--bad)' : 'var(--good)'}">${pct(mc.pLoss)}</div><div class="l">P(margin &lt; 0)</div></div>
      <div class="kpi"><div class="v">${pct(mc.pEvNeg)}</div><div class="l">P(EV &lt; 0)</div></div>
      <div class="kpi"><div class="v">${num(mc.margin.p10, 1)} / ${num(mc.margin.p50, 1)} / ${num(mc.margin.p90, 1)} %</div><div class="l">Margin P10 / P50 / P90</div></div>
      <div class="kpi"><div class="v">${money(mc.ev.p10)} · ${money(mc.ev.p90)}</div><div class="l">EV P10 · P90</div></div>
    </div>
    <div class="chart" style="height:170px"><canvas id="mcHist" aria-label="Histogram of simulated expected value"></canvas></div>
    <p class="small" style="margin-top:6px">Value and margin sampled from beta-PERT distributions (mean = (min + 4·mode + max)/6). P(win) sampled from Beta(κp, κ(1 − p)) around the modelled ${pct(d.pw.p)} with κ = ${d.pw.kappa} (10 pseudo-bids + ${e.bids || 0} logged on this route) — the spread narrows as your record grows. Shaded band = P10–P90. Red = losses. Never present a point estimate where a range exists.</p>
  </div>` : ''}

  ${isHard && value ? `<div class="card">
    <h2>Hard-bid price curve <span class="pill neutral">Friedman · Gates</span></h2>
    <div class="chart" style="height:200px"><canvas id="markupChart" aria-label="Expected profit versus markup"></canvas></div>
    <p class="small" style="margin-top:6px" id="markupNote"></p>
  </div>` : ''}`;

  // charts
  if (mc) C.histogram('mcHist', mc.histogram, { fmt: v => money(v), p10: mc.ev.p10, p90: mc.ev.p90 });
  if (isHard && value) {
    const n = b.competitors ?? d.route.typicalBidders;
    const cost = value * (1 - e.marginMode / 100);
    const curve = X.markupCurve({ cost, n, fieldMarkup: e.marginMode / 100 });
    C.lines('markupChart', [
      { label: 'Friedman EP', color: C.token('--bad'), data: curve.rows.map(r => ({ x: r.m * 100, y: r.epF })) },
      { label: 'Gates EP', color: C.token('--accent'), data: curve.rows.map(r => ({ x: r.m * 100, y: r.epG })) },
    ], { xFmt: v => v + ' %', yFmt: v => money(v), xTitle: 'Your markup over cost', yTitle: 'Expected profit' });
    $('#markupNote', main).innerHTML = `Against ${n} competitors with bid CV 6 %: Gates optimum ≈ <b>${(curve.bestG.m * 100).toFixed(1)} %</b> markup (EP ${money(curve.bestG.epG)}); Friedman (independence, pessimistic) ≈ <b>${(curve.bestF.m * 100).toFixed(1)} %</b>. At the field average your P(lowest) is ${pct(priceCurves(0, n).gates)}; 3 % above it, ${pct(priceCurves(0.03, n).gates)}. Heuristic: markup scales with (n₁/n₂)^0.7.`;
  }

  // bind
  const rerender = () => { commit(); renderEconomics(main, X.compute(), X); };
  const soft = () => commit();
  bindNum(main, 'ecValue', v => b.value = v, rerender);
  bindNum(main, 'ecCompetitors', v => b.competitors = v, rerender);
  bindNum(main, 'ecDuration', v => b.durationMonths = v, soft);
  bindNum(main, 'ecMLow', v => e.marginLow = v ?? 0, rerender);
  bindNum(main, 'ecMMode', v => e.marginMode = v ?? 0, rerender);
  bindNum(main, 'ecMHigh', v => e.marginHigh = v ?? 0, rerender);
  bindNum(main, 'ecVLow', v => e.valueLowPct = v ?? 0, rerender);
  bindNum(main, 'ecVHigh', v => e.valueHighPct = v ?? 0, rerender);
  bindNum(main, 'ecHours', v => e.bidHours = v, rerender);
  bindNum(main, 'ecRate', v => e.loadedRate = v ?? 0, rerender);
  bindNum(main, 'ecExt', v => e.externalBidCost = v ?? 0, rerender);
  bindNum(main, 'ecBids', v => e.bids = v ?? 0, rerender);
  bindNum(main, 'ecWins', v => e.wins = v ?? 0, rerender);
  $('#ecRoute', main).addEventListener('change', ev => { b.route = ev.target.value; rerender(); });
  // Preserve focus across rerender for numeric inputs: restore by id
  restoreFocus(main);
}

let lastFocusId = null;
document.addEventListener('focusin', e => { if (e.target?.id) lastFocusId = e.target.id; });
function restoreFocus(root) {
  if (!lastFocusId) return;
  const el = $('#' + lastFocusId, root);
  if (el && document.activeElement !== el) { const v = el.value; el.focus({ preventScroll: true }); try { el.setSelectionRange?.(v.length, v.length); } catch {} }
}

/* ═══════════════════════════ CAPACITY & MATERIALS ═══════════════════════════ */
export function renderCapacity(main, d, X) {
  const { state, esc, money, pct, num, commit, C } = X;
  const b = state.bid, cap = b.capacity, p = d.p;
  const materialsRows = d.result.criteria.filter(c => c.group === 'materials');
  const facilityPct = d.facility ? d.portAfter.peak / d.facility : null;

  main.innerHTML = `
  <div class="card">
    <h2>Cash &amp; payment profile</h2>
    <div class="cols">
      ${field('cpLag', 'Pay lag (months)', cap.payLagMonths, { step: 0.25, hint: 'pay app → cash; 1.0 = net 30' })}
      ${field('cpRet', 'Retention (fraction)', cap.retention, { step: 0.005, hint: p.locale.retentionNorm })}
      ${field('cpFront', 'Deposit / mobilisation (fraction of value)', cap.frontLoad, { step: 0.01 })}
      ${field('cpCash', 'Cash on hand', cap.cash, { step: 1000 })}
      ${field('cpLine', 'Undrawn credit line', cap.creditLine, { step: 1000 })}
      ${field('cpWC', 'Analysed working capital', cap.workingCapital, { step: 1000, hint: '≥ 5 % of backlog + bid (gate)' })}
      ${field('cpBacklog', 'Backlog value (remaining)', cap.backlogValue, { step: 1000 })}
    </div>
  </div>

  <div class="cols-2">
    <div class="card" style="margin:0">
      <h2>This job — peak retention / AR exposure</h2>
      <div class="bignum">${d.thisPeak ? money(d.thisPeak.peak) : '–'}</div>
      ${d.thisPeak ? `<div class="small muted">≈ ${pct(d.thisPeak.pct, 0)} of value at month ${d.thisPeak.peakMonth} · range ${money(d.thisPeak.low)} – ${money(d.thisPeak.high)}</div>
      <p class="small" style="margin-top:8px">Read off the same month-by-month S-curve as the portfolio chart: cost spent minus cash received, so it can never exceed the portfolio peak that includes it and is capped at cost (value × (1 − margin)). Lag ${cap.payLagMonths} mo over ${b.durationMonths || 12} mo, retention ${pct(cap.retention, 1)}, margin ${b.econ.marginMode} %, front-load ${pct(cap.frontLoad, 0)}. No peer-reviewed constant exists for a specialty sub's cash curve — treat the ±25 % as a range and validate against your own draw history.</p>` : '<p class="small">Enter contract value and duration.</p>'}
    </div>
    <div class="card" style="margin:0">
      <h2>Portfolio peak vs facility</h2>
      <div class="bignum" style="color:${facilityPct == null ? '' : facilityPct > 1 ? 'var(--bad)' : facilityPct > 0.9 ? 'var(--warn)' : 'var(--good)'}">${d.facility ? pct(facilityPct, 0) : '–'}</div>
      <div class="small muted">Before: ${money(d.portBefore.peak)} · After: ${money(d.portAfter.peak)} · Facility: ${d.facility ? money(d.facility) : 'not set'}</div>
      <div class="chart" style="height:160px;margin-top:8px"><canvas id="cashChart" aria-label="Portfolio cash position by month"></canvas></div>
    </div>
  </div>

  <div class="card">
    <h2>Live jobs (for overlap) <button type="button" class="btn sm" id="addJob">+ add</button></h2>
    ${cap.liveJobs.length ? `<div class="tbl-wrap"><table><thead><tr><th>Value</th><th>Duration (mo)</th><th>Started (months ago)</th><th>Margin %</th><th></th></tr></thead><tbody>
      ${cap.liveJobs.map((j, i) => `<tr><td><input class="mono" type="number" step="1000" id="lj_${i}_value" data-job="${i}" data-k="value" value="${j.value ?? ''}" style="width:130px" aria-label="Live job ${i + 1} value"></td><td><input class="mono" type="number" id="lj_${i}_durationMonths" data-job="${i}" data-k="durationMonths" value="${j.durationMonths ?? ''}" style="width:70px" aria-label="Live job ${i + 1} duration in months"></td><td><input class="mono" type="number" id="lj_${i}_startMonth" data-job="${i}" data-k="startMonth" value="${j.startMonth == null ? '' : -j.startMonth}" style="width:70px" aria-label="Live job ${i + 1} started months ago"></td><td><input class="mono" type="number" step="0.5" id="lj_${i}_marginPct" data-job="${i}" data-k="marginPct" value="${j.marginPct ?? ''}" placeholder="${b.econ.marginMode}" style="width:70px" aria-label="Live job ${i + 1} margin percent"></td><td><button type="button" class="btn ghost sm" data-deljob="${i}" aria-label="Remove live job ${i + 1}">✕</button></td></tr>`).join('')}
    </tbody></table></div><p class="small muted" style="margin-top:6px">Margin is per job — blank uses this bid's most-likely margin (${b.econ.marginMode} %).</p>` : '<div class="empty">No live jobs entered. Add your current jobs to see retention / AR overlap.</div>'}
  </div>

  <div class="card">
    <h2>Estimating &amp; crew capacity</h2>
    <div class="cols">
      ${field('cpEst', 'Estimator concurrent load after award', cap.estimatorLoadAfter, { step: 1, hint: `max ${p.gates.maxEstimatorLoad}` })}
      ${field('cpCrew', 'Installation-crew concurrent load after award', cap.crewLoadAfter, { step: 1, hint: `max ${p.gates.maxCrewLoad}` })}
    </div>
  </div>

  <div class="card">
    <h2>Materials &amp; installation <span class="pill neutral">from the Score tab</span></h2>
    ${materialsRows.length ? `<div class="list">${materialsRows.map(c => { const s = d.b.scores[c.id]; return `<div class="item"><span>${esc(c.name)}</span><span class="pill ${s == null ? 'neutral' : s <= 2 ? 'bad' : s === 3 ? 'mid' : 'good'}">${s == null ? 'unscored' : s}</span></div>`; }).join('')}</div>
    <p class="small" style="margin-top:8px">These score under the Materials &amp; Installation group on the Score tab (price/lead-time volatility, installer certification, QC/moisture documentation, specialist-sub dependency, warranty/callback exposure by failure mode). They carry weight ${d.p.weights.materials}% of attractiveness for this preset — this panel is a read-only summary so the risk is visible alongside cash and staffing.</p>` : '<p class="small">No materials/installation criteria are active for this preset.</p>'}
  </div>`;

  // charts
  const months = d.portAfter.series.map(s => s.month);
  C.lines('cashChart', [
    { label: 'Before', color: C.token('--muted'), data: d.portBefore.series.map(s => ({ x: s.month, y: s.cash })), dash: [4, 4] },
    { label: 'With this job', color: C.token('--accent'), data: d.portAfter.series.map(s => ({ x: s.month, y: s.cash })), fill: true },
    ...(d.facility ? [{ label: 'Facility', color: C.token('--bad'), data: months.map(m => ({ x: m, y: -d.facility })), dash: [2, 3] }] : []),
  ], { xFmt: v => 'M' + v, yFmt: v => money(v), yTitle: 'Cumulative retention / AR exposure' });

  // bind
  const rerender = () => { commit(); renderCapacity(main, X.compute(), X); };
  bindNum(main, 'cpLag', v => cap.payLagMonths = v ?? 1.5, rerender);
  bindNum(main, 'cpRet', v => cap.retention = v ?? 0, rerender);
  bindNum(main, 'cpFront', v => cap.frontLoad = v ?? 0, rerender);
  bindNum(main, 'cpCash', v => cap.cash = v, rerender);
  bindNum(main, 'cpLine', v => cap.creditLine = v, rerender);
  bindNum(main, 'cpWC', v => cap.workingCapital = v, rerender);
  bindNum(main, 'cpBacklog', v => cap.backlogValue = v, rerender);
  bindNum(main, 'cpEst', v => cap.estimatorLoadAfter = v, rerender);
  bindNum(main, 'cpCrew', v => cap.crewLoadAfter = v, rerender);
  $('#addJob', main).onclick = () => { cap.liveJobs.push({ value: null, durationMonths: 4, startMonth: 0, marginPct: b.econ.marginMode }); rerender(); };
  $$('[data-deljob]', main).forEach(bt => bt.onclick = () => { cap.liveJobs.splice(Number(bt.dataset.deljob), 1); rerender(); });
  $$('[data-job]', main).forEach(inp => inp.addEventListener('input', e => {
    const j = cap.liveJobs[Number(inp.dataset.job)]; const k = inp.dataset.k; const v = e.target.value === '' ? null : Number(e.target.value);
    if (k === 'startMonth') j.startMonth = v == null ? 0 : -v;
    else if (k === 'marginPct') { if (v == null) delete j.marginPct; else j.marginPct = v; }
    else j[k] = v;
    rerender();
  }));
  restoreFocus(main);
}
