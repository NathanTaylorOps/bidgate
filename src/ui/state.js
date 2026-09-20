/**
 * App state, persistence (localStorage), JSON export/import, URL-hash sharing.
 * Schema-versioned. Nothing leaves the browser.
 */
import { PRESETS, ROUTES, DEFAULT_PRESET_ID } from '../data/presets.js';
import { CRITERIA_BY_ID } from '../data/criteria.js';

// v3: rescoped from the vertically-integrated-custom-builder / AU-regulatory domain to a US flooring / tile /
// specialty-surface subcontractor domain. Criteria ids, group ids and preset ids all changed — see CHANGELOG.md.
export const SCHEMA_VERSION = 3;
const KEY = 'bidgate.v3';

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
      liveJobs: [],
    },
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

/**
 * Bring any bid-shaped object (live bid, saved pipeline record, share-link payload) up to the current shape:
 * defaults merged under it (so a record saved with `capacity: null` or no `decision` cannot crash compute()),
 * nested econ/capacity/decision merged one level deep, stale criterion ids dropped, route validated against
 * ROUTES (falls back to the preset default) and dealKillers coerced to an array of ids.
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
  out.scores = pruneScores(src.scores);
  out.notes = pruneScores(src.notes);
  out.dealKillers = Array.isArray(src.dealKillers) ? src.dealKillers.filter(x => typeof x === 'string') : [];
  out.route = ROUTES.some(r => r.id === out.route) ? out.route : PRESETS[pid].economics.defaultRoute;
  if (!Array.isArray(out.capacity.liveJobs)) out.capacity.liveJobs = [];
  if (!Array.isArray(out.decision.premortem)) out.decision.premortem = ['', '', ''];
  return out;
}

export function migrate(s) {
  if (!s || typeof s !== 'object') return null;
  if (!s.version) s.version = 1;
  if (s.version < 3) {
    // v1/v2 had different criteria, group and preset ids throughout (legacy field names). None of it maps
    // cleanly onto the current flooring/tile subcontractor domain, so a legacy save is migrated conservatively:
    // bid identity/economics fields that still exist are kept, everything id-dependent is dropped rather
    // than carried across incorrectly, and saved pipeline entries from an unrecognised preset are dropped.
    const d = defaultState();
    if (s.bid && typeof s.bid === 'object') {
      const b = s.bid;
      d.bid = {
        ...d.bid,
        name: b.name || '', client: b.client || '', location: b.location || '',
        value: typeof b.value === 'number' ? b.value : null,
        durationMonths: typeof b.durationMonths === 'number' ? b.durationMonths : null,
        competitors: typeof b.competitors === 'number' ? b.competitors : null,
        econ: { ...d.bid.econ, ...(b.econ ? {
          marginLow: b.econ.marginLow ?? d.bid.econ.marginLow, marginMode: b.econ.marginMode ?? d.bid.econ.marginMode, marginHigh: b.econ.marginHigh ?? d.bid.econ.marginHigh,
          bidHours: b.econ.bidHours ?? null, loadedRate: b.econ.loadedRate ?? d.bid.econ.loadedRate, externalBidCost: b.econ.externalBidCost ?? 0,
          wins: b.econ.wins ?? 0, bids: b.econ.bids ?? 0,
        } : {}) },
      };
      // scores/notes: only meaningful if the ids happen to overlap (they won't for a true legacy save,
      // but this keeps a save from THIS domain's earlier schema versions intact).
      d.bid.scores = pruneScores(b.scores);
      d.bid.notes = pruneScores(b.notes);
    }
    if (Array.isArray(s.saved)) {
      d.saved = s.saved
        .filter(rec => rec && PRESETS[rec.presetId])
        .map(rec => ({ ...rec, bid: normaliseBid(rec.bid, rec.presetId) }));
    }
    return d;
  }
  // forward-compat defaults
  if (!PRESETS[s.presetId]) s.presetId = DEFAULT_PRESET_ID;
  s.bid = normaliseBid(s.bid, s.presetId);
  s.saved = Array.isArray(s.saved) ? s.saved : [];
  // Saved records get the same defaults-merge as the live bid so "Load into editor" on a record saved with
  // capacity: null or a missing decision block cannot crash compute().
  s.saved = s.saved
    .filter(rec => rec && PRESETS[rec.presetId])
    .map(rec => ({ ...rec, bid: normaliseBid(rec.bid, rec.presetId) }));
  s.weightsOverride ||= {};
  s.mode ||= 'simple';
  return s;
}

export function exportJSON(state) {
  return JSON.stringify({ schema: 'bidgate', version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), state }, null, 2);
}

export function importJSON(text) {
  const o = JSON.parse(text);
  if (o.schema !== 'bidgate') throw new Error('Not a BidGate file');
  return migrate(o.state);
}

/* ── URL hash sharing (current bid only, base64url-encoded UTF-8 JSON — no compression) ── */
export function encodeShare(state) {
  const payload = { v: SCHEMA_VERSION, presetId: state.presetId, bid: state.bid, weightsOverride: state.weightsOverride };
  return toBase64Url(JSON.stringify(payload));
}
export function decodeShare(hash) {
  const json = fromBase64Url(hash);
  const o = JSON.parse(json);
  if (!o || !o.bid) throw new Error('bad share');
  return o;
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
