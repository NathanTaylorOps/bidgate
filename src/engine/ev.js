/**
 * Expected value & economics.
 *
 *  grossProfit  = value × margin
 *  levies       = Σ preset levies above their thresholds (none in the current US-only presets; the mechanism
 *                 is kept generic so a locale-specific levy could be added later without engine changes) — deducted from gross profit
 *  bidCost      = estimating hours × loaded rate + external costs   (default: route bidCostPct × value)
 *  EV           = p · (grossProfit − levies − postAwardCost) − bidCost
 *  EV per hour  = EV / estimating hours
 *  break-even p = bidCost / (grossProfit − levies)
 *  pursuit ratio= bidCost / grossProfit   (PSMJ: > 10 % of expected fee is a no-go signal)
 *  risk-adj EV  = p · ((margin − z·σ) × value − levies) − bidCost, σ from scope clarity (1: 6 pts, 3: 3 pts, 5: 1 pt)
 */

export function leviesFor(preset, value) {
  const out = [];
  for (const l of preset.levies || []) {
    const threshold = preset.gates?.[l.thresholdKey] ?? 0;
    if (value >= threshold) out.push({ id: l.id, label: l.label, amount: value * l.rate, note: l.note });
  }
  return out;
}

export function sigmaFromScope(scopeScore) {
  const map = { 1: 0.06, 2: 0.045, 3: 0.03, 4: 0.02, 5: 0.01 };
  return map[scopeScore] ?? 0.03;
}

/**
 * @param {object} a { value, marginPct, p, bidHours, loadedRate, externalBidCost, route, preset, scopeScore, postAwardCost }
 */
export function expectedValue(a) {
  const value = a.value || 0;
  const margin = (a.marginPct || 0) / 100;
  const grossProfit = value * margin;
  const levies = leviesFor(a.preset, value);
  const levyTotal = levies.reduce((s, l) => s + l.amount, 0);

  let bidCost;
  if (a.bidHours != null && a.loadedRate != null && (a.bidHours > 0 || a.externalBidCost > 0)) {
    bidCost = a.bidHours * a.loadedRate + (a.externalBidCost || 0);
  } else {
    bidCost = value * (a.route?.bidCostPct ?? 0.01) + (a.externalBidCost || 0);
  }

  const net = grossProfit - levyTotal - (a.postAwardCost || 0);
  const p = a.p ?? 0;
  const ev = p * net - bidCost;
  const hours = a.bidHours || (a.loadedRate ? bidCost / a.loadedRate : null);
  const evPerHour = hours ? ev / hours : null;
  const breakEvenP = net > 0 ? bidCost / net : null;
  const pursuitRatio = grossProfit > 0 ? bidCost / grossProfit : null;

  const sigma = sigmaFromScope(a.scopeScore);
  const z = 1.0;
  const riskAdjEv = p * ((margin - z * sigma) * value - levyTotal - (a.postAwardCost || 0)) - bidCost;

  return { value, grossProfit, levies, levyTotal, bidCost, net, ev, evPerHour, breakEvenP, pursuitRatio, sigma, riskAdjEv, hours };
}

export function fmtMoney(n, locale = 'en-US', currency = 'USD', compact = true) {
  if (n == null || Number.isNaN(n)) return '–';
  const abs = Math.abs(n);
  if (compact && abs >= 1e6) return (n < 0 ? '−' : '') + new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(abs / 1e6) + 'M';
  if (compact && abs >= 1e4) return (n < 0 ? '−' : '') + new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(abs / 1e3) + 'K';
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}
