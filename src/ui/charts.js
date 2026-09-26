/* Chart.js helpers. Chart is a global from the cdnjs UMD build. All charts read theme tokens at draw time. */

const charts = new Map();

export function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function destroyAll() {
  for (const c of charts.values()) c.destroy();
  charts.clear();
}

export function destroy(id) {
  const c = charts.get(id);
  if (c) { c.destroy(); charts.delete(id); }
}

function base() {
  const text = token('--muted'), grid = token('--border');
  return {
    responsive: true, maintainAspectRatio: false, animation: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      x: { grid: { color: grid }, ticks: { color: text, font: { size: 10 } } },
      y: { grid: { color: grid }, ticks: { color: text, font: { size: 10 } } },
    },
  };
}

export function make(id, config) {
  destroy(id);
  const el = document.getElementById(id);
  if (!el || typeof Chart === 'undefined') return null;
  el.setAttribute('role', 'img');
  const c = new Chart(el.getContext('2d'), config);
  charts.set(id, c);
  return c;
}

export function fontDefaults() {
  if (typeof Chart === 'undefined') return;
  Chart.defaults.font.family = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.color = token('--muted');
}

/** Horizontal bars: labels + values, colours per bar. */
export function hbar(id, labels, values, colors, { max, fmt = v => v, title } = {}) {
  const o = base();
  o.indexAxis = 'y';
  o.scales.x.max = max;
  o.scales.x.ticks.callback = fmt;
  o.scales.y.grid.display = false;
  o.plugins.tooltip.callbacks = { label: ctx => ` ${fmt(ctx.raw)}` };
  return make(id, { type: 'bar', data: { labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 3, borderSkipped: false }] }, options: o });
}

/** Tornado: rows with lo/hi around a base value. */
export function tornado(id, rows, baseValue) {
  const o = base();
  o.indexAxis = 'y';
  o.scales.x.min = 0; o.scales.x.max = 100;
  o.scales.x.stacked = false; o.scales.y.stacked = true;
  o.scales.y.grid.display = false;
  o.plugins.tooltip.callbacks = { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw[1].toFixed(1)}` };
  const labels = rows.map(r => r.name);
  const lo = rows.map(r => [Math.min(r.lo, baseValue), baseValue]);
  const hi = rows.map(r => [baseValue, Math.max(r.hi, baseValue)]);
  return make(id, {
    type: 'bar',
    data: { labels, datasets: [
      { label: 'set to 1', data: lo, backgroundColor: token('--bad') + 'cc', borderRadius: 2, borderSkipped: false },
      { label: 'set to 5', data: hi, backgroundColor: token('--good') + 'cc', borderRadius: 2, borderSkipped: false },
    ] },
    options: o,
  });
}

/** Radar of group percentages. */
export function radar(id, labels, values) {
  const text = token('--muted'), grid = token('--border'), acc = token('--accent');
  return make(id, {
    type: 'radar',
    data: { labels, datasets: [{ data: values, backgroundColor: acc + '26', borderColor: acc, borderWidth: 2, pointBackgroundColor: acc, pointRadius: 3 }] },
    options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } },
      scales: { r: { min: 0, max: 100, ticks: { stepSize: 25, color: text, backdropColor: 'transparent', font: { size: 9 } }, grid: { color: grid }, angleLines: { color: grid }, pointLabels: { color: text, font: { size: 10 } } } } },
  });
}

/** Histogram from bins [{x0,x1,n}] */
export function histogram(id, bins, { fmt = v => v, p10, p90 } = {}) {
  const o = base();
  o.scales.x.ticks.callback = (v, i) => (i % 4 === 0 ? fmt(bins[i]?.x0 ?? 0) : '');
  o.scales.x.grid.display = false;
  o.plugins.tooltip.callbacks = { title: items => `${fmt(bins[items[0].dataIndex].x0)} – ${fmt(bins[items[0].dataIndex].x1)}`, label: ctx => ` ${ctx.raw} runs` };
  const colors = bins.map(b => {
    const mid = (b.x0 + b.x1) / 2;
    if (mid < 0) return token('--bad') + 'cc';
    if (p10 != null && p90 != null && mid >= p10 && mid <= p90) return token('--accent') + 'cc';
    return token('--accent') + '66';
  });
  return make(id, { type: 'bar', data: { labels: bins.map((_, i) => i), datasets: [{ data: bins.map(b => b.n), backgroundColor: colors, barPercentage: 1, categoryPercentage: 0.95 }] }, options: o });
}

/** Line series: [{label, data:[{x,y}], color}] */
export function lines(id, series, { xFmt = v => v, yFmt = v => v, xTitle, yTitle, yMin, yMax } = {}) {
  const o = base();
  o.scales.x = { type: 'linear', grid: { color: token('--border') }, ticks: { color: token('--muted'), callback: xFmt, font: { size: 10 } }, title: { display: !!xTitle, text: xTitle, color: token('--muted') } };
  o.scales.y.ticks.callback = yFmt; o.scales.y.min = yMin; o.scales.y.max = yMax;
  o.scales.y.title = { display: !!yTitle, text: yTitle, color: token('--muted') };
  o.plugins.legend = { display: series.length > 1, labels: { color: token('--muted'), boxWidth: 10 } };
  o.plugins.tooltip.callbacks = { label: ctx => ` ${ctx.dataset.label}: ${yFmt(ctx.parsed.y)}` };
  return make(id, { type: 'line', data: { datasets: series.map(s => ({ label: s.label, data: s.data, borderColor: s.color, backgroundColor: s.fill ? s.color + '22' : 'transparent', fill: !!s.fill, tension: .25, pointRadius: 0, borderWidth: 2, borderDash: s.dash })) }, options: o });
}

/** Bubble: points [{x,y,r,label,color}] with quadrant lines at 50/50 */
export function bubble(id, points, { xTitle = 'Winnability (P(win) %)', yTitle = 'Attractiveness' } = {}) {
  const o = base();
  o.scales.x = { min: 0, max: 100, grid: { color: token('--border') }, ticks: { color: token('--muted'), font: { size: 10 } }, title: { display: true, text: xTitle, color: token('--muted') } };
  o.scales.y = { min: 0, max: 100, grid: { color: token('--border') }, ticks: { color: token('--muted'), font: { size: 10 } }, title: { display: true, text: yTitle, color: token('--muted') } };
  o.plugins.tooltip.callbacks = { label: ctx => ` ${points[ctx.dataIndex].label}: attr ${ctx.raw.y.toFixed(0)}, P(win) ${ctx.raw.x.toFixed(0)} %` };
  const quad = {
    id: 'quad',
    beforeDraw(chart) {
      const { ctx, chartArea: a, scales } = chart;
      ctx.save();
      ctx.strokeStyle = token('--border2'); ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
      const x50 = scales.x.getPixelForValue(50), y60 = scales.y.getPixelForValue(60);
      ctx.beginPath(); ctx.moveTo(x50, a.top); ctx.lineTo(x50, a.bottom); ctx.moveTo(a.left, y60); ctx.lineTo(a.right, y60); ctx.stroke();
      ctx.fillStyle = token('--muted'); ctx.font = '10px ui-sans-serif, system-ui, sans-serif'; ctx.setLineDash([]);
      ctx.fillText('PURSUE', scales.x.getPixelForValue(78), scales.y.getPixelForValue(96));
      ctx.fillText('ATTRACTIVE BUT LONG SHOT', scales.x.getPixelForValue(4), scales.y.getPixelForValue(96));
      ctx.fillText('WINNABLE BUT POOR FIT', scales.x.getPixelForValue(54), scales.y.getPixelForValue(6));
      ctx.fillText('DECLINE', scales.x.getPixelForValue(4), scales.y.getPixelForValue(6));
      ctx.restore();
    },
  };
  return make(id, { type: 'bubble', data: { datasets: [{ data: points.map(p => ({ x: p.x, y: p.y, r: p.r })), backgroundColor: points.map(p => p.color + 'aa'), borderColor: points.map(p => p.color), borderWidth: 1.5 }] }, options: o, plugins: [quad] });
}

/** Reliability diagram: predicted vs observed with diagonal. */
export function reliability(id, bins) {
  const pts = bins.filter(b => b.n).map(b => ({ x: b.predicted * 100, y: b.observed * 100, r: Math.min(18, 4 + b.n * 1.5), n: b.n }));
  const o = base();
  o.scales.x = { min: 0, max: 100, grid: { color: token('--border') }, ticks: { color: token('--muted'), font: { size: 10 } }, title: { display: true, text: 'Predicted P(win) %', color: token('--muted') } };
  o.scales.y = { min: 0, max: 100, grid: { color: token('--border') }, ticks: { color: token('--muted'), font: { size: 10 } }, title: { display: true, text: 'Observed win rate %', color: token('--muted') } };
  o.plugins.tooltip.callbacks = { label: ctx => ` predicted ${ctx.raw.x.toFixed(0)} %, observed ${ctx.raw.y.toFixed(0)} % (n=${pts[ctx.dataIndex].n})` };
  const diag = { id: 'diag', beforeDraw(chart) { const { ctx, scales } = chart; ctx.save(); ctx.strokeStyle = token('--border2'); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(scales.x.getPixelForValue(0), scales.y.getPixelForValue(0)); ctx.lineTo(scales.x.getPixelForValue(100), scales.y.getPixelForValue(100)); ctx.stroke(); ctx.restore(); } };
  return make(id, { type: 'bubble', data: { datasets: [{ data: pts, backgroundColor: token('--accent') + '99', borderColor: token('--accent') }] }, options: o, plugins: [diag] });
}
