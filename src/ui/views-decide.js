/* Decision, Pipeline, Calibration views and the printable memo */
import { brier, reliability, hitRates, criterionSeparation, murphy, overrideRate, OUTCOMES } from '../engine/calibration.js';
import { PRESETS } from '../data/presets.js';
import { GROUPS as GROUPS_FOR_MEMO } from '../data/criteria.js';
import { MITIGATIONS as MITIGATIONS_FOR_MEMO } from '../data/dealkillers.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const DEVILS = [
  'What do other subs say about this GC\'s payment habits?',
  'If we lose money on this, which line item will it be?',
  'Who on our team does not want this job, and why?',
  'What would we need to believe for the competitor to be a better fit?',
  'Which score did we round up because we want the work?',
  'What happens to our crew schedule if this starts two months late?',
  'Is the margin here or in the change orders we hope for?',
  'If the GC pays 45 days late on every pay application, do we survive month six?',
  'What is the one thing on the finish schedule nobody has priced?',
  'Are we bidding this because backlog is thin?',
  'Who on the GC\'s team signs the change orders, and how fast?',
  'What did the last job like this actually make?',
];

/* ═══════════════════════════ DECISION ═══════════════════════════ */
export function renderDecision(main, d, X) {
  const { state, esc, money, pct, num, commit, C, MITIGATIONS, isVerdict } = X;
  const b = state.bid, dec = b.decision;
  const sens = X.sensitivity(d.p, b.scores, b.dealKillers);
  const rob = X.robustness(d.p, b.scores, b.dealKillers, { samples: 400, seed: b.id });   // seeded by bid id: same bid, same figure, every render
  const weak = X.weakestLinks(d.result, b.scores, 6);
  const band = d.band;
  const verdict = isVerdict(band);
  const flipsUp = sens.flips.filter(f => f.direction === 'up').slice(0, 3);
  const flipsDown = sens.flips.filter(f => f.direction === 'down').slice(0, 3);
  const isGo = verdict && (band.id === 'GO' || band.id === 'APPROVAL');
  const devil = DEVILS.filter((_, i) => (i + (b.name?.length || 0)) % 3 === 0).slice(0, 3);

  main.innerHTML = `
  <div class="verdict ${band ? band.tone : 'neutral'}" style="margin-bottom:12px">
    <div class="eyebrow">Decision · ${esc(b.name || 'Unnamed bid')}</div>
    <div class="title">${band ? `<span aria-hidden="true">${band.icon}</span>${band.label}` : 'Not yet scored'}</div>
    <div class="why">Attractiveness ${num(d.result.attractiveness, 0)} · Winnability ${d.result.winnability == null ? '–' : num(d.result.winnability, 0)} · P(win) ${pct(d.pw.p)} · EV ${b.value ? money(d.ev.ev) : '–'} · ${d.result.scoredCount}/${d.result.totalCount} scored</div>
    ${d.allGates.length ? `<div class="gatelist">${d.allGates.map(g => `<div class="g"><span aria-hidden="true">⛔</span><span>${esc(g.name)}${g.detail ? ` — ${esc(g.detail)}` : ''}</span></div>`).join('')}</div>` : ''}
    ${band && band.id === 'INCOMPLETE' ? `<div class="small" style="margin-top:6px">◌ ${esc(X.incompleteWhy(d.result))}</div>` : ''}
    ${verdict && d.result.floorHits.length ? `<div class="small" style="margin-top:6px;color:var(--warn)">▲ Weakest-link floor: ${d.result.floorHits.map(f => esc(f.name)).join('; ')} ≤ 2 → capped at CONDITIONAL.</div>` : ''}
  </div>

  <div class="cols-2">
    <div class="card" style="margin:0">
      <h2>What would flip this</h2>
      ${verdict && band.id !== 'GATED' && d.result.attractiveness != null ? `
        ${flipsUp.length ? `<div class="small" style="margin-bottom:6px"><b>Up:</b></div><div class="list">${flipsUp.map(f => `<div class="item"><span>${esc(f.name)} ${f.from} → ${f.to}</span><span class="pill ${f.band.tone}">${f.band.label}</span></div>`).join('')}</div>` : '<p class="small">No single criterion change moves this up a band.</p>'}
        ${flipsDown.length ? `<div class="small" style="margin:10px 0 6px"><b>Down:</b></div><div class="list">${flipsDown.map(f => `<div class="item"><span>${esc(f.name)} ${f.from} → ${f.to}</span><span class="pill ${f.band.tone}">${f.band.label}</span></div>`).join('')}</div>` : '<p class="small">No single criterion change moves this down a band.</p>'}
        <div class="callout small" style="margin-top:10px">Weight robustness: verdict holds in <b>${pct(rob.agreement, 0)}</b> of 400 seeded random weightings within ±20 % of the preset. ${rob.agreement < 0.7 ? 'Fragile — the verdict depends on how you weight, not just how you scored.' : 'Stable.'}</div>`
      : band && band.id === 'GATED' ? '<p class="small">Gated. Clear the gate(s) first; the scored verdict underneath is shown in the side panel.</p>'
      : band && band.id === 'INCOMPLETE' ? `<p class="small">No verdict yet — ${esc(X.incompleteWhy(d.result))}</p>` : '<p class="small">Score the criteria first.</p>'}
    </div>
    <div class="card" style="margin:0">
      <h2>Weakest links &amp; mitigations</h2>
      ${weak.length ? `<div class="stack">${weak.map(w => `<div><div class="row between"><span class="small" style="font-weight:600">${esc(w.name)} <span class="mono muted">= ${w.score}</span>${w.gate ? ' <span class="pill bad">gate</span>' : ''}${w.floor ? ' <span class="pill warn">floor</span>' : ''}</span></div><div class="small muted">${esc(MITIGATIONS[w.id] || '')}</div></div>`).join('')}</div>` : '<p class="small">Nothing scored ≤ 2.</p>'}
    </div>
  </div>

  <div class="card">
    <h2>Sensitivity — one-at-a-time tornado</h2>
    <div class="chart" style="height:${Math.max(160, Math.min(520, 22 * sens.rows.length + 40))}px"><canvas id="tornado" aria-label="Tornado chart of criterion sensitivity"></canvas></div>
    <p class="small" style="margin-top:6px">Each bar: attractiveness if that criterion were set to 1 (left, red) or 5 (right, green), holding everything else. Longest bars are where an hour of due diligence changes the answer.</p>
  </div>

  ${isGo ? `<div class="card">
    <h2>Pre-mortem <span class="pill mid">required on GO</span></h2>
    <p style="margin-bottom:8px">It is 18 months from now and this job lost money. Write three reasons. (Prospective hindsight surfaces ≈ 30 % more causes — Mitchell, Russo &amp; Pennington 1989.)</p>
    <div class="stack">${[0, 1, 2].map(i => `<div class="field"><input data-pm="${i}" value="${esc(dec.premortem[i] || '')}" placeholder="Reason ${i + 1}"></div>`).join('')}</div>
    <div class="callout small" style="margin-top:10px"><b>Devil's advocate:</b><ul style="margin:4px 0 0 16px">${devil.map(q => `<li>${esc(q)}</li>`).join('')}</ul></div>
  </div>` : ''}

  <div class="card">
    <h2>Record the decision</h2>
    <div class="cols">
      <div class="field"><label for="decTaken">Decision taken</label><select id="decTaken"><option value="">—</option><option value="bid" ${dec.decisionTaken === 'bid' ? 'selected' : ''}>Bid</option><option value="bid_conditional" ${dec.decisionTaken === 'bid_conditional' ? 'selected' : ''}>Bid with conditions</option><option value="courtesy" ${dec.decisionTaken === 'courtesy' ? 'selected' : ''}>Courtesy bid (relationship)</option><option value="decline" ${dec.decisionTaken === 'decline' ? 'selected' : ''}>Decline</option><option value="defer" ${dec.decisionTaken === 'defer' ? 'selected' : ''}>Defer — need information</option></select></div>
      <div class="field"><label for="decBy">Decided by</label><input id="decBy" value="${esc(dec.decidedBy)}" placeholder="Names"></div>
      <div class="field"><label for="decAt">Date</label><input id="decAt" type="date" value="${esc(dec.decidedAt)}"></div>
    </div>
    ${dec.decisionTaken && verdict && ((dec.decisionTaken.startsWith('bid') || dec.decisionTaken === 'courtesy') !== isGo) ? `<div class="field" style="margin-top:10px"><label for="decOverride" style="color:var(--warn)">Override reason (required — the decision disagrees with the tool)</label><textarea id="decOverride" placeholder="Why are you overriding? This is logged and shows up in Calibration as your override rate.">${esc(dec.overrideReason)}</textarea></div>` : ''}
    ${dec.decisionTaken && band && band.id === 'INCOMPLETE' ? `<div class="callout warn small" style="margin-top:10px">Recording a decision on an INCOMPLETE scorecard: the memo and pipeline will show no verdict to compare it with.</div>` : ''}
    <div class="row" style="margin-top:12px;gap:6px">
      <button type="button" class="btn primary" id="decSave">Save to pipeline</button>
      <button type="button" class="btn" id="decPrint">Print decision memo</button>
    </div>
    <p class="small" style="margin-top:8px">The memo prints on one page: verdict, gates, economics and cash, the scorecard by group, evidence notes, weakest links, pre-mortem, decision and signatures.</p>
  </div>`;

  if (sens.rows.length) C.tornado('tornado', sens.rows.slice(0, 22), d.result.attractiveness);

  $$('[data-pm]', main).forEach(inp => inp.addEventListener('input', e => { dec.premortem[Number(inp.dataset.pm)] = e.target.value; commit(); }));
  $('#decTaken', main).addEventListener('change', e => { dec.decisionTaken = e.target.value; commit(); renderDecision(main, X.compute(), X); });
  $('#decBy', main).addEventListener('input', e => { dec.decidedBy = e.target.value; commit(); });
  $('#decAt', main).addEventListener('input', e => { dec.decidedAt = e.target.value; commit(); });
  const ov = $('#decOverride', main); if (ov) ov.addEventListener('input', e => { dec.overrideReason = e.target.value; commit(); });
  $('#decSave', main).onclick = X.saveToPipeline;
  $('#decPrint', main).onclick = X.printMemo;
}

/* ═══════════════════════════ PIPELINE ═══════════════════════════ */
export function renderPipeline(main, d, X) {
  const { state, esc, money, pct, num, commit, C, BANDS, toast } = X;
  const saved = state.saved;
  const bandOf = id => Object.values(BANDS).find(b => b.id === id);
  const tone = id => bandOf(id)?.tone || 'neutral';

  main.innerHTML = `
  <div class="card">
    <h2>Pipeline — attractiveness × winnability <span class="pill neutral">bubble = value</span></h2>
    ${saved.length ? `<div class="chart" style="height:320px"><canvas id="bubble" aria-label="Pipeline bubble chart"></canvas></div>
    <p class="small" style="margin-top:6px">GE/McKinsey-style 2×2. The score conflates two questions — should we want it, and can we win it — so they are plotted separately. Pursue top-right; decline bottom-left; top-left is where relationship-building belongs, not estimating hours.</p>` : '<div class="empty">No saved bids. Score a bid and press Save, or load the samples from Settings.</div>'}
  </div>
  <div class="card">
    <h2>Saved bids <span class="row" style="gap:6px"><button type="button" class="btn sm" id="plCsv">Export CSV</button><button type="button" class="btn sm" id="plCompare" ${saved.length < 2 ? 'disabled' : ''}>Compare selected</button></span></h2>
    ${saved.length ? `<div class="tbl-wrap"><table><thead><tr><th></th><th>Bid</th><th>Preset</th><th class="num">Value</th><th class="num">Attr.</th><th class="num">Win.</th><th class="num">P(win)</th><th class="num">EV</th><th>Verdict</th><th>Outcome</th><th class="num">Actual margin %</th><th></th></tr></thead><tbody>
      ${saved.map(s => `<tr>
        <td><input type="checkbox" data-sel="${s.id}" aria-label="select ${esc(s.bid.name)}"></td>
        <td><b>${esc(s.bid.name || 'Unnamed')}</b>${s.sample ? ' <span class="pill neutral">sample</span>' : ''}${s.outcome && s.outcome !== 'pending' ? ' <span class="pill neutral" title="Outcome recorded: the forecast fields on this row no longer change when the bid is re-saved">forecast frozen</span>' : ''}<div class="small muted">${esc(s.bid.client || '')} · ${new Date(s.savedAt).toLocaleDateString()}</div></td>
        <td class="small">${esc(PRESETS[s.presetId]?.label || s.presetId)}</td>
        <td class="num">${s.value ? money(s.value) : '–'}</td>
        <td class="num">${num(s.attractiveness, 0)}</td>
        <td class="num">${s.winnability == null ? '–' : num(s.winnability, 0)}</td>
        <td class="num">${pct(s.pwin)}</td>
        <td class="num">${s.value ? money(s.ev) : '–'}</td>
        <td><span class="pill ${tone(s.band)}">${bandOf(s.band)?.label || '–'}</span></td>
        <td><select data-outcome="${s.id}" class="btn sm" aria-label="Outcome for ${esc(s.bid.name || 'Unnamed')}">${OUTCOMES.map(o => `<option value="${o}" ${s.outcome === o ? 'selected' : ''}>${o}</option>`).join('')}</select></td>
        <td class="num"><input type="number" step="0.1" data-margin="${s.id}" value="${s.actualMargin ?? ''}" style="width:64px;text-align:right" class="mono" ${s.outcome === 'won' ? '' : 'disabled'} aria-label="Actual margin for ${esc(s.bid.name || 'Unnamed')}"></td>
        <td><div class="row" style="gap:2px;flex-wrap:nowrap"><button type="button" class="btn ghost sm" data-load="${s.id}" title="Load into editor" aria-label="Load ${esc(s.bid.name || 'Unnamed')} into editor">↩</button><button type="button" class="btn ghost sm" data-del="${s.id}" title="Delete" aria-label="Delete ${esc(s.bid.name || 'Unnamed')}">✕</button></div></td>
      </tr>`).join('')}
    </tbody></table></div>` : ''}
  </div>
  <div id="compareCard"></div>`;

  if (saved.length) {
    const colorFor = id => C.token(`--${tone(id) === 'neutral' ? 'muted' : tone(id)}`);
    const maxV = Math.max(...saved.map(s => s.value || 0), 1);
    C.bubble('bubble', saved.map(s => ({ x: (s.pwin || 0) * 100, y: s.attractiveness || 0, r: 6 + 22 * Math.sqrt((s.value || 0) / maxV), label: s.bid.name || 'Unnamed', color: colorFor(s.band) })));
  }
  $$('[data-outcome]', main).forEach(sel => sel.addEventListener('change', e => { const s = saved.find(x => x.id === sel.dataset.outcome); s.outcome = e.target.value; commit(); renderPipeline(main, d, X); }));
  $$('[data-margin]', main).forEach(inp => inp.addEventListener('input', e => { const s = saved.find(x => x.id === inp.dataset.margin); s.actualMargin = e.target.value === '' ? null : Number(e.target.value); commit(); }));
  $$('[data-load]', main).forEach(bt => bt.onclick = () => { const s = saved.find(x => x.id === bt.dataset.load); state.presetId = s.presetId; state.bid = JSON.parse(JSON.stringify(s.bid)); commit(); X.setView('score'); toast('Loaded into editor'); });
  $$('[data-del]', main).forEach(bt => bt.onclick = () => { if (confirm('Delete this saved bid?')) { state.saved = saved.filter(x => x.id !== bt.dataset.del); commit(); renderPipeline(main, d, X); } });
  $('#plCsv', main).onclick = () => {
    const rows = [['name', 'client', 'preset', 'route', 'value', 'attractiveness', 'winnability', 'pwin', 'ev', 'band', 'gates', 'outcome', 'actualMargin', 'decisionTaken', 'savedAt']];
    for (const s of saved) rows.push([s.bid.name, s.bid.client, s.presetId, s.route, s.value, num(s.attractiveness, 1), s.winnability == null ? '' : num(s.winnability, 1), s.pwin == null ? '' : (s.pwin).toFixed(3), s.ev == null ? '' : Math.round(s.ev), s.band, (s.gates || []).join('; '), s.outcome, s.actualMargin ?? '', s.decisionTaken ?? '', s.savedAt]);
    const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    import('./app.js').then(m => m.download('bidgate-pipeline.csv', csv, 'text/csv'));
  };
  $('#plCompare', main).onclick = () => {
    const ids = $$('[data-sel]:checked', main).map(c => c.dataset.sel).slice(0, 4);
    if (ids.length < 2) { toast('Select 2–4 bids'); return; }
    const recs = ids.map(id => saved.find(s => s.id === id));
    const critIds = Array.from(new Set(recs.flatMap(r => Object.keys(r.bid.scores))));
    const cell = v => v == null ? '<td class="num muted">–</td>' : `<td class="num" style="background:var(--s${v});color:${v === 3 ? '#fff' : v === 2 || v === 4 ? '#111' : '#fff'};font-weight:600">${v}</td>`;
    $('#compareCard').innerHTML = `<div class="card"><h2>Side-by-side · criteria heat map</h2><div class="tbl-wrap"><table><thead><tr><th>Criterion</th>${recs.map(r => `<th class="num">${esc(r.bid.name)}</th>`).join('')}</tr></thead><tbody>
      <tr><td><b>Attractiveness</b></td>${recs.map(r => `<td class="num"><b>${num(r.attractiveness, 0)}</b></td>`).join('')}</tr>
      <tr><td><b>P(win)</b></td>${recs.map(r => `<td class="num"><b>${pct(r.pwin)}</b></td>`).join('')}</tr>
      <tr><td><b>EV</b></td>${recs.map(r => `<td class="num"><b>${r.value ? money(r.ev) : '–'}</b></td>`).join('')}</tr>
      ${critIds.map(id => `<tr><td class="small">${esc(X.CRITERIA_BY_ID[id]?.name || id)}</td>${recs.map(r => cell(r.bid.scores[id])).join('')}</tr>`).join('')}
    </tbody></table></div></div>`;
    $('#compareCard').scrollIntoView({ behavior: 'smooth' });
  };
}

/* ═══════════════════════════ CALIBRATION ═══════════════════════════ */
export function renderCalibration(main, d, X) {
  const { state, esc, money, pct, num, C, ROUTES, CRITERIA_BY_ID } = X;
  const recs = state.saved.map(s => ({ ...s, scores: s.bid.scores }));
  const decided = recs.filter(r => r.outcome === 'won' || r.outcome === 'lost');
  const bs = brier(recs);
  const mur = murphy(recs);
  const rel = reliability(recs);
  const byRoute = hitRates(recs, r => ROUTES.find(x => x.id === r.route)?.label || r.route);
  const byBand = hitRates(recs, r => r.bandShown || r.band || '–');
  const sep = criterionSeparation(recs).slice(0, 10);
  const ovr = overrideRate(recs);
  const wonMargins = recs.filter(r => r.outcome === 'won' && r.actualMargin != null);
  const fade = wonMargins.length ? wonMargins.reduce((s, r) => s + (r.actualMargin - (r.bid.econ?.marginMode ?? 0)), 0) / wonMargins.length : null;

  main.innerHTML = `
  <div class="card">
    <h2>Calibration — does the tool predict what actually happens?</h2>
    <div class="cols">
      <div class="kpi"><div class="v">${decided.length}</div><div class="l">Decided outcomes (won/lost)</div></div>
      <div class="kpi"><div class="v" style="color:${bs == null ? '' : bs < 0.2 ? 'var(--good)' : bs < 0.25 ? 'var(--warn)' : 'var(--bad)'}">${bs == null ? '–' : bs.toFixed(3)}</div><div class="l">Brier score (0.25 = always 50 %)</div></div>
      <div class="kpi"><div class="v">${mur ? pct(mur.baseRate, 0) : '–'}</div><div class="l">Actual win rate</div></div>
      <div class="kpi"><div class="v">${ovr ? pct(ovr.rate, 0) : '–'}</div><div class="l">Human override rate</div></div>
      <div class="kpi"><div class="v" style="color:${fade == null ? '' : fade < -2 ? 'var(--bad)' : 'var(--good)'}">${fade == null ? '–' : (fade > 0 ? '+' : '') + fade.toFixed(1) + ' pts'}</div><div class="l">Avg margin fade (actual − bid)</div></div>
    </div>
    ${decided.length < 60 ? `<div class="callout small" style="margin-top:10px">You have ${decided.length} decided outcome${decided.length === 1 ? '' : 's'}. Record won / lost on the Pipeline tab as bids resolve. Once an outcome is recorded the forecast on that row is frozen, so this page always compares what was predicted with what happened. Below 60 outcomes, do not fit a model — look at the separation table and reason.</div>` : ''}
  </div>
  <div class="cols-2">
    <div class="card" style="margin:0">
      <h2>Reliability diagram <span class="pill neutral">5 bins</span></h2>
      ${decided.length ? '<div class="chart" style="height:240px"><canvas id="relChart" aria-label="Reliability diagram"></canvas></div>' : '<div class="empty">Needs decided outcomes.</div>'}
      ${mur ? `<div class="small muted" style="margin-top:6px">Murphy decomposition on these ${mur.bins} bin${mur.bins === 1 ? '' : 's'}: reliability ${mur.reliability.toFixed(3)} − resolution ${mur.resolution.toFixed(3)} + uncertainty ${mur.uncertainty.toFixed(3)} + within-bin ${mur.withinBin.toFixed(3)} = Brier ${mur.brier.toFixed(3)}. Points above the diagonal = under-confident; below = over-confident.</div>` : ''}
    </div>
    <div class="card" style="margin:0">
      <h2>Hit rate by route &amp; by verdict</h2>
      <div class="tbl-wrap"><table><thead><tr><th>Segment</th><th class="num">Bids</th><th class="num">By count</th><th class="num">By value</th></tr></thead><tbody>
        ${[...byRoute, ...byBand].map(g => `<tr><td class="small">${esc(String(g.key))}</td><td class="num">${g.bids}</td><td class="num">${pct(g.hitRateCount, 0)}</td><td class="num">${pct(g.hitRateValue, 0)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">No decided outcomes.</td></tr>'}
      </tbody></table></div>
      <p class="small" style="margin-top:6px">Report both. A firm can win 40 % of bids by count and 15 % by value — that is a different business.</p>
    </div>
  </div>
  <div class="card">
    <h2>Which criteria separate wins from losses <span class="pill neutral">explore, not optimise</span></h2>
    ${sep.length ? `<div class="tbl-wrap"><table><thead><tr><th>Criterion</th><th class="num">Won mean</th><th class="num">Lost mean</th><th class="num">Separation</th><th class="num">n</th></tr></thead><tbody>
      ${sep.map(s => `<tr><td class="small">${esc(CRITERIA_BY_ID[s.id]?.name || s.id)}</td><td class="num">${num(s.wonMean, 2)}</td><td class="num">${num(s.lostMean, 2)}</td><td class="num" style="color:${s.separation > 0 ? 'var(--good)' : s.separation < 0 ? 'var(--bad)' : ''}">${s.separation == null ? '–' : (s.separation > 0 ? '+' : '') + s.separation.toFixed(2)}</td><td class="num">${s.nWon + s.nLost}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="small" style="margin-top:6px">Positive separation: you win when this scores high. Negative: you win the ones that scored low here — either the criterion is mis-anchored or you are winning work you should not. Lowe &amp; Parvar (2004) and Leśniak (2021) show 6–8 firm-specific variables carry the signal; at ≥ 60 outcomes a logistic fit becomes defensible. Not before.</p>` : '<div class="empty">Needs decided outcomes with scores.</div>'}
  </div>`;

  if (decided.length) C.reliability('relChart', rel);
}

/* ═══════════════════════════ PRINT MEMO ═══════════════════════════ */
/**
 * One page (A4 or Letter): verdict, gates, economics & cash, weakest links, scorecard by group, evidence notes,
 * pre-mortem, decision and signatures. No charts — nothing that fails in greyscale or offline. Long evidence
 * notes are cut at NOTE_CHARS so the page count cannot creep; the full note is in the app.
 */
const NOTE_CHARS = 150;
export function renderMemo(d, state) {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const b = state.bid, dec = b.decision, r = d.result;
  const money = n => n == null ? '–' : new Intl.NumberFormat(d.p.locale.locale, { style: 'currency', currency: d.p.locale.currency, maximumFractionDigits: 0 }).format(n);
  const pct = x => x == null ? '–' : (x * 100).toFixed(0) + ' %';
  const cut = s => (s.length > NOTE_CHARS ? s.slice(0, NOTE_CHARS - 1).trimEnd() + '…' : s);
  const band = d.band;
  const verdict = band && band.id !== 'INCOMPLETE';
  const groups = GROUPS_FOR_MEMO.filter(g => r.groupStats[g.id].count > 0);
  const weak = r.criteria.filter(c => b.scores[c.id] != null && b.scores[c.id] <= 2).sort((x, y) => b.scores[x.id] - b.scores[y.id]).slice(0, 5);
  const notes = r.criteria.filter(c => b.notes[c.id] && b.notes[c.id].trim()).slice(0, 8);
  const decisionLabel = { bid: 'Bid', bid_conditional: 'Bid with conditions', courtesy: 'Courtesy bid', decline: 'Decline', defer: 'Defer — need information' }[dec.decisionTaken] || '—';
  return `
  <div class="mhead"><h1>Go / No-Go Decision Memo</h1><div class="mprep">${esc(d.p.label)} · prepared ${new Date().toLocaleDateString(d.p.locale.locale)}</div></div>
  <div class="meta">
    <div><b>Project</b> ${esc(b.name || 'Unnamed')}</div><div><b>GC / source</b> ${esc(b.client || '–')}</div>
    <div><b>Value</b> ${money(b.value)} · ${b.durationMonths || '–'} mo</div><div><b>Route</b> ${esc(d.route.label)} · ${b.competitors ?? d.route.typicalBidders} competitors</div>
  </div>
  <div class="band ${band ? band.tone : ''}">${band ? band.icon + ' ' + band.label : 'NOT SCORED'} <span class="bandkpi">attractiveness ${r.attractiveness == null ? '–' : r.attractiveness.toFixed(0)}/100 · winnability ${r.winnability == null ? '–' : r.winnability.toFixed(0)}/100 · P(win) ${pct(d.pw.p)} · EV ${money(d.ev.ev)} · ${r.scoredCount}/${r.totalCount} scored</span></div>
  ${band && band.id === 'INCOMPLETE' ? `<p class="note">No verdict: ${(r.weightedCoverage * 100).toFixed(0)} % of the weighted card scored — ${r.moreNeeded} more criteri${r.moreNeeded === 1 ? 'on' : 'a'} needed${r.unscoredGates.length ? ` (gates unscored: ${r.unscoredGates.map(g => esc(g.name)).join('; ')})` : ''}.</p>` : ''}
  ${d.allGates.length ? `<p class="gates"><b>Gates triggered:</b> ${d.allGates.map(g => esc(g.name) + (g.detail ? ' (' + esc(g.detail) + ')' : '')).join(' · ')}</p>` : ''}
  ${verdict && r.floorHits.length ? `<p class="note"><b>Weakest-link floor:</b> ${r.floorHits.map(f => esc(f.name)).join('; ')} scored ≤ 2 → capped at CONDITIONAL.</p>` : ''}
  <div class="two">
    <div>
      <h2>Economics &amp; cash</h2>
      <table><tbody>
        <tr><td>Gross profit at ${b.econ.marginMode} % (${b.econ.marginLow}–${b.econ.marginHigh} %)</td><td class="num">${money(d.ev.grossProfit)}</td></tr>
        ${d.ev.levies.map(l => `<tr><td>− ${esc(l.label)}</td><td class="num">${money(-l.amount)}</td></tr>`).join('')}
        <tr><td>P(win): route ${pct(d.route.baseWin)} → record ${pct(d.pw.p0)} → competitors ${pct(d.pw.p1)} → position</td><td class="num">${pct(d.pw.p)}</td></tr>
        <tr><td>Cost to bid${d.ev.hours ? ` (${Math.round(d.ev.hours)} h)` : ''}</td><td class="num">${money(d.ev.bidCost)}</td></tr>
        <tr><td>Expected value · risk-adjusted</td><td class="num">${money(d.ev.ev)} · ${money(d.ev.riskAdjEv)}</td></tr>
        <tr><td>Break-even P(win) · pursuit cost / gross profit</td><td class="num">${pct(d.ev.breakEvenP)} · ${pct(d.ev.pursuitRatio)}</td></tr>
        ${d.thisPeak ? `<tr><td>Peak retention / AR exposure: this job · portfolio after award</td><td class="num">${money(d.thisPeak.peak)} · ${money(d.portAfter.peak)}${d.facility ? ` of ${money(d.facility)}` : ''}</td></tr>` : ''}
      </tbody></table>
    </div>
    <div>
      <h2>Weakest links</h2>
      ${weak.length ? `<ul class="tight">${weak.map(c => `<li><b>${esc(c.name)}</b> = ${b.scores[c.id]}${c.gate ? ' [gate]' : c.floor ? ' [floor]' : ''} — ${esc(cut(MITIGATIONS_FOR_MEMO[c.id] || ''))}</li>`).join('')}</ul>` : '<p class="note">Nothing scored ≤ 2.</p>'}
      ${dec.premortem.some(x => x) ? `<h2>Pre-mortem — why this lost money</h2><ol class="tight">${dec.premortem.filter(x => x).map(x => `<li>${esc(cut(x))}</li>`).join('')}</ol>` : ''}
    </div>
  </div>
  <h2>Scorecard <span class="h2note">1–5 against the anchors · [G] gate at 1 · [F] floor at 2 · w = group weight</span></h2>
  <div class="scoregrid">
    ${groups.map(g => { const gs = r.groupStats[g.id]; const cs = r.criteria.filter(c => c.group === g.id); return `<div class="sg"><div class="sgh"><span>${esc(g.label)}</span><span>${gs.pct == null ? '–' : gs.pct.toFixed(0)}${g.axis === 'attractiveness' ? ` · w ${d.p.weights[g.id]} %` : ' · winnability'}</span></div>${cs.map(c => { const s = b.scores[c.id]; return `<div class="sc${s == null ? ' un' : s <= 2 ? ' lo' : ''}"><span>${esc(c.name)}${c.gate ? ' [G]' : ''}${c.floor ? ' [F]' : ''}</span><span class="v">${s ?? '·'}</span></div>`; }).join('')}</div>`; }).join('')}
  </div>
  ${notes.length ? `<h2>Evidence notes</h2><ul class="tight notes">${notes.map(c => `<li><b>${esc(c.name)}</b> (${b.scores[c.id] ?? '–'}): ${esc(cut(b.notes[c.id]))}</li>`).join('')}</ul>` : ''}
  <h2>Decision</h2>
  <p><b>Decision taken:</b> ${esc(decisionLabel)} &nbsp;·&nbsp; <b>By:</b> ${esc(dec.decidedBy || '—')} &nbsp;·&nbsp; <b>Date:</b> ${esc(dec.decidedAt || '—')}${dec.overrideReason ? ` &nbsp;·&nbsp; <b>Override reason:</b> ${esc(cut(dec.overrideReason))}` : ''}</p>
  <div class="sig"><div>Estimating</div><div>Operations</div><div>Owner / Director</div></div>
  <p class="foot">Generated by BidGate. Gates are non-compensatory; a verdict needs every gate criterion scored and ≥ ${(r.coverageThreshold * 100).toFixed(0)} % of the weighted card. Weights: ${Object.entries(d.p.weights).filter(([k, v]) => k !== 'compete' && v > 0).map(([k, v]) => `${k} ${v}`).join(', ')}. All thresholds are configurable, dated defaults — see METHODOLOGY.md.</p>`;
}
