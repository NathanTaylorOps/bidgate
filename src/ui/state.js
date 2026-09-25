/**
 * App state, persistence (localStorage), JSON export/import, URL-hash sharing.
 * Schema-versioned. Nothing leaves the browser.
 */
import { PRESETS, ROUTES, DEFAULT_PRESET_ID } from '../data/presets.js';
import { CRITERIA_BY_ID, GROUPS } from '../data/criteria.js';

const GROUP_IDS = new Set(GROUPS.map(g => g.id));

// Bump SCHEMA_VERSION (and the storage key) whenever the saved-bid shape changes incompatibly; migrate() below
// brings anything older, or anything hand-edited, up to the current shape conservatively.
export const SCHEMA_VERSION = 1;
const KEY = 'bidgate.v1';

export function newBid(presetId = DEFAULT_PRESET_ID) {
  const preset = PRESETS[presetId];
  return {
    id: 'bid_' + Date.now().toString(36),
    name: '', client: '', location: '',
    route: preset.economics.defaultRoute,
    value: null, durationMonths: null, competitors: null,
    scores: {}, notes: {}, dealKillers: [],
    econ: {
      marginLow: preset.economics.marginPct.low, marginMode: preset.economics.marginPct.mode, marginHigh: preset.economics.marginPct.high,
      valueLowPct: -5, valueHighPct: 10,
      bidHours: null, loadedRate: 120, externalBidCost: 0,
      wins: 0, bids: 0,
    },
    capacity: {
      payLagMonths: 1.5, retention: 0.10, frontLoad: 0,
      cash: null, creditLine: null, workingCapital: null, backlogValue: null,
      estimatorLoadAfter: null, crewLoadAfter: null,
      liveJobs: [],           // [{ value, durationMonths, startMonth (≤ 0), marginPct }] — marginPct optional, defaults to this bid's most-likely margin
    },
    // weightsOverride: { groupId: pct } — set only when a bid arrives by share link carrying the sender's weights.
    // Applies to this bid alone; Settings weights are never changed by a share link.
    decision: { premortem: ['', '', ''], decisionTaken: '', overrideReason: '', decidedBy: '', decidedAt: '' },
    createdAt: new Date().toISOString(),
  };
}

export function defaultState() {
  return {
    version: SCHEMA_VERSION,
    presetId: DEFAULT_PRESET_ID,
    mode: 'simple',
    view: 'score',
    weightsOverride: {},
    bid: newBid(DEFAULT_PRESET_ID),
    saved: [],
    seenIntro: false,
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return migrate(s);
  } catch { return null; }
}

export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode etc. */ }
}

/** Keep only score/note entries whose criterion id still exists (drops stale ids instead of crashing). */
function pruneScores(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) if (CRITERIA_BY_ID[k]) out[k] = v;
  return out;
}

/** Keep only weight entries for real attractiveness groups with a finite non-negative number. */
export function pruneWeights(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (GROUP_IDS.has(k) && k !== 'compete' && Number.isFinite(v) && v >= 0) out[k] = v;
  return Object.keys(out).length ? out : null;
}

/**
 * Bring any bid-shaped object (live bid, saved pipeline record, share-link payload) up to the current shape:
 * defaults merged under it (so a record saved with `capacity: null` or no `decision` cannot crash compute()),
 * nested econ/capacity/decision merged one level deep, stale criterion ids dropped, route validated against
 * ROUTES (falls back to the preset default), dealKillers coerced to an array of ids, live jobs coerced to
 * plain numeric records and any bid-level weight override pruned to real groups.
 */
export function normaliseBid(bid, presetId = DEFAULT_PRESET_ID) {
  const pid = PRESETS[presetId] ? presetId : DEFAULT_PRESET_ID;
  const def = newBid(pid);
  const src = bid && typeof bid === 'object' ? bid : {};
  const out = {
    ...def, ...src,
    econ: { ...def.econ, ...(src.econ && typeof src.econ === 'object' ? src.econ : {}) },
    capacity: { ...def.capacity, ...(src.capacity && typeof src.capacity === 'object' ? src.capacity : {}) },
    decision: { ...def.decision, ...(src.decision && typeof src.decision === 'object' ? src.decision : {}) },
  };
  // Drop anything that isn't part of the current bid shape — a legacy field name from an older schema
  // version, or hand-edited JSON — rather than carrying it across silently.
  const allowedKeys = new Set([...Object.keys(def), 'weightsOverride']);
  for (const k of Object.keys(out)) { if (!allowedKeys.has(k)) delete out[k]; }
  out.scores = pruneScores(src.scores);
  out.notes = pruneScores(src.notes);
  out.dealKillers = Array.isArray(src.dealKillers) ? src.dealKillers.filter(x => typeof x === 'string') : [];
  out.route = ROUTES.some(r => r.id === out.route) ? out.route : PRESETS[pid].economics.defaultRoute;
  const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  out.capacity.liveJobs = (Array.isArray(out.capacity.liveJobs) ? out.capacity.liveJobs : [])
    .filter(j => j && typeof j === 'object')
    .map(j => ({ value: num(j.value), durationMonths: num(j.durationMonths) ?? 4, startMonth: num(j.startMonth) ?? 0, ...(num(j.marginPct) != null ? { marginPct: j.marginPct } : {}) }));
  if (!Array.isArray(out.decision.premortem)) out.decision.premortem = ['', '', ''];
  const w = pruneWeights(src.weightsOverride);
  if (w) out.weightsOverride = w; else delete out.weightsOverride;
  return out;
}

/**
 * Bring a stored/imported state up to the current shape. Every field is validated rather than trusted: unknown
 * presets fall back to the default, the live bid and every saved record go through normaliseBid() (so a record
 * saved with `capacity: null` or a missing decision block cannot crash compute()), unknown criterion ids are
 * dropped rather than carried across incorrectly, and saved records from an unrecognised preset are dropped.
 */
export function migrate(s) {
  if (!s || typeof s !== 'object') return null;
  const d = defaultState();
  const out = { ...d, ...s, version: SCHEMA_VERSION };
  if (!PRESETS[out.presetId]) out.presetId = DEFAULT_PRESET_ID;
  out.bid = normaliseBid(out.bid, out.presetId);
  out.saved = (Array.isArray(out.saved) ? out.saved : [])
    .filter(rec => rec && typeof rec === 'object' && PRESETS[rec.presetId])
    .map(rec => ({ ...rec, bid: normaliseBid(rec.bid, rec.presetId) }));
  out.weightsOverride = out.weightsOverride && typeof out.weightsOverride === 'object' ? out.weightsOverride : {};
  for (const k of Object.keys(out.weightsOverride)) { const w = PRESETS[k] ? pruneWeights(out.weightsOverride[k]) : null; if (w) out.weightsOverride[k] = w; else delete out.weightsOverride[k]; }
  out.mode = out.mode === 'expert' ? 'expert' : 'simple';
  return out;
}

export function exportJSON(state) {
  return JSON.stringify({ schema: 'bidgate', version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), state }, null, 2);
}

export function importJSON(text) {
  const o = JSON.parse(text);
  if (o.schema !== 'bidgate') throw new Error('Not a BidGate file');
  return migrate(o.state);
}

/* ── URL hash sharing (current bid only, base64url-encoded UTF-8 JSON — no compression) ──
 * The payload carries the sender's effective weights for the bid's preset as `weights` (Settings override merged
 * with any bid-level override). The recipient applies them to that one bid (bid.weightsOverride), never to their
 * own Settings. */
export function encodeShare(state) {
  const p = PRESETS[state.presetId] || PRESETS[DEFAULT_PRESET_ID];
  const weights = pruneWeights({ ...(state.weightsOverride?.[p.id] || {}), ...(state.bid?.weightsOverride || {}) });
  const payload = { v: SCHEMA_VERSION, presetId: state.presetId, bid: state.bid, ...(weights ? { weights } : {}) };
  return toBase64Url(JSON.stringify(payload));
}
export function decodeShare(hash) {
  const json = fromBase64Url(hash);
  const o = JSON.parse(json);
  if (!o || !o.bid || typeof o.bid !== 'object') throw new Error('bad share');
  const presetId = PRESETS[o.presetId] ? o.presetId : DEFAULT_PRESET_ID;
  const weights = pruneWeights(o.weights) || pruneWeights(o.weightsOverride?.[presetId]) || null;
  const bid = normaliseBid({ ...o.bid, ...(weights ? { weightsOverride: weights } : {}) }, presetId);
  return { v: o.v, presetId, bid, weights };
}

/* base64url (RFC 4648 §5, unpadded) of the UTF-8 bytes. No dependency on btoa/atob so it round-trips non-Latin-1 text. */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export function toBase64Url(input) {
  const bytes = new TextEncoder().encode(input);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return toB64(s);
}
export function fromBase64Url(b64) {
  const s = fromB64(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
function toB64(bin) {
  let out = '', i = 0;
  while (i < bin.length) {
    const a = bin.charCodeAt(i++), b = i < bin.length ? bin.charCodeAt(i++) : NaN, c = i < bin.length ? bin.charCodeAt(i++) : NaN;
    const n = (a << 16) | ((b || 0) << 8) | (c || 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (isNaN(b) ? '' : B64[(n >> 6) & 63]) + (isNaN(c) ? '' : B64[n & 63]);
  }
  return out;
}
function fromB64(str) {
  let out = '', i = 0;
  const idx = ch => B64.indexOf(ch);
  while (i < str.length) {
    const a = idx(str[i++]), b = idx(str[i++]), c = i < str.length ? idx(str[i++]) : -1, d = i < str.length ? idx(str[i++]) : -1;
    const n = (a << 18) | (b << 12) | ((c < 0 ? 0 : c) << 6) | (d < 0 ? 0 : d);
    out += String.fromCharCode((n >> 16) & 255);
    if (c >= 0) out += String.fromCharCode((n >> 8) & 255);
    if (d >= 0) out += String.fromCharCode(n & 255);
  }
  return out;
}
