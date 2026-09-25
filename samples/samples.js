/**
 * Three synthetic sample bids so the app never opens empty. All figures are invented.
 * Names are fictional. No real client, price or project data. Scenarios are flooring / tile /
 * specialty-surface subcontractor bids to general contractors, matching the current criteria/preset ids.
 */
import { newBid } from '../src/ui/state.js';

function withScores(bid, scores, extra = {}) {
  return { ...bid, ...extra, scores: { ...bid.scores, ...scores } };
}

export function sampleBids() {
  // 1 — GO: repeat property-management-company multi-family flooring & tile package
  const a = newBid('multifamily');
  const go = withScores(a, {
    cl_funding: 5, cl_terms: 4, cl_history: 5, cl_relationship: 5, cl_closeout: 4, cl_deciders: 4, cl_scopeagreement: 5, cl_litigation: 3,
    pr_scope: 4, pr_experience: 5, pr_substrate: 4, pr_leadtime: 4, pr_unitturn: 4, pr_schedule: 4,
    ct_form: 4, ct_flowdown: 4, ct_payifpaid: 3, ct_retainage: 4, ct_backcharge: 4, ct_ld: 4, ct_indemnity: 4, ct_lien: 4,
    ca_estimating: 4, ca_crew: 4, ca_backlog: 4, ca_size: 5, ca_arexposure: 4,
    mi_pricevolatility: 4, mi_installercert: 5, mi_qc: 4, mi_callback: 4,
    st_fit: 5, st_reference: 4, st_pipeline: 5, st_notbid: 4,
    co_influence: 5, co_incumbent: 4, co_diff: 4, co_price: 3,
  }, {
    id: 'sample_go', name: 'Meridian Place Apartments — LVT & tile turns (sample)', client: 'Repeat property-management company', location: 'Home metro',
    route: 'invited', value: 620_000, durationMonths: 6, competitors: 2,
  });
  go.econ = { ...go.econ, marginLow: 16, marginMode: 21, marginHigh: 27, bidHours: 30, wins: 5, bids: 8 };
  go.capacity = { ...go.capacity, cash: 180_000, creditLine: 150_000, workingCapital: 260_000, backlogValue: 900_000, estimatorLoadAfter: 1, crewLoadAfter: 2,
    liveJobs: [{ value: 350_000, durationMonths: 5, startMonth: -2, marginPct: 18 }, { value: 210_000, durationMonths: 4, startMonth: -1 }] };
  go.notes = { cl_funding: 'GC\'s contract with the ownership group is executed; PM confirmed funding letter on file.', co_influence: 'Helped the PM company standardise their LVT spec across three properties.' };
  go.decision = { ...go.decision,
    premortem: ['Unit-turn access slipped two months and the crew sat idle on a fixed labour price.', 'Moisture readings on the slab failed after we had mobilised; remediation fell to us.', 'LVT lead time doubled after award and the substitution was not approved in time.'],
    decisionTaken: 'bid', decidedBy: 'Estimating lead · operations manager', decidedAt: '2026-09-16' };

  // 2 — GATED: commercial TI package, enforceable condition-precedent pay-if-paid and thin scope at bid
  const b = newBid('commercial_ti');
  const gated = withScores(b, {
    cl_funding: 3, cl_terms: 2, cl_history: 2, cl_relationship: 2, cl_closeout: 2, cl_deciders: 3, cl_scopeagreement: 2, cl_litigation: 2,
    pr_scope: 2, pr_experience: 3, pr_substrate: 2, pr_leadtime: 3, pr_unitturn: 3, pr_schedule: 2,
    ct_form: 2, ct_flowdown: 2, ct_payifpaid: 1, ct_retainage: 2, ct_backcharge: 2, ct_ld: 2, ct_consequential: 3, ct_indemnity: 3, ct_lien: 2,
    ca_estimating: 3, ca_crew: 3, ca_backlog: 3, ca_size: 3, ca_arexposure: 2,
    mi_pricevolatility: 2, mi_installercert: 3, mi_qc: 2, mi_callback: 2,
    st_fit: 3, st_reference: 3, st_pipeline: 2, st_notbid: 2,
    co_influence: 2, co_incumbent: 3, co_diff: 2, co_price: 3,
  }, {
    id: 'sample_gated', name: 'Riverside Office Tower — 4th floor TI flooring (sample)', client: 'GC we have not worked with before', location: 'Regional, 45 min',
    route: 'hardbid_private', value: 410_000, durationMonths: 3, competitors: 4,
  });
  gated.econ = { ...gated.econ, marginLow: 9, marginMode: 15, marginHigh: 20, bidHours: 40, wins: 1, bids: 5 };
  gated.capacity = { ...gated.capacity, cash: 180_000, creditLine: 150_000, workingCapital: 260_000, backlogValue: 900_000, estimatorLoadAfter: 1, crewLoadAfter: 2 };
  gated.notes = { ct_payifpaid: 'GC\'s subcontract has an unambiguous condition-precedent pay-if-paid clause with no cap; state courts here enforce it as written.', pr_scope: 'Finish schedule references "flooring per plan" with no room-by-room take-off; three open RFIs unanswered at bid due date.' };

  // 3 — CONDITIONAL: school athletic-facility synthetic turf, certification and testing gaps
  const c = newBid('specialty_turf');
  const cond = withScores(c, {
    cl_funding: 4, cl_terms: 3, cl_history: 3, cl_relationship: 2, cl_closeout: 3, cl_deciders: 3, cl_scopeagreement: 3, cl_litigation: 3,
    pr_scope: 3, pr_experience: 3, pr_substrate: 3, pr_leadtime: 2, pr_certification: 2, pr_schedule: 3,
    ct_form: 3, ct_flowdown: 3, ct_payifpaid: 3, ct_retainage: 3, ct_backcharge: 3, ct_ld: 3, ct_consequential: 3, ct_indemnity: 3, ct_lien: 4,
    ca_estimating: 3, ca_crew: 3, ca_backlog: 3, ca_size: 4, ca_arexposure: 3,
    mi_pricevolatility: 2, mi_installercert: 2, mi_qc: 3, mi_subdependency: 2, mi_callback: 3,
    st_fit: 5, st_reference: 5, st_pipeline: 3, st_notbid: 3,
    co_influence: 3, co_incumbent: 3, co_diff: 4, co_price: 3,
  }, {
    id: 'sample_cond', name: 'Fairview High School Athletic Field — synthetic turf (sample)', client: 'School district — public hard bid', location: 'Home metro',
    route: 'hardbid_public', value: 1_350_000, durationMonths: 4, competitors: 5,
  });
  cond.econ = { ...cond.econ, marginLow: 17, marginMode: 23, marginHigh: 29, bidHours: 55, wins: 2, bids: 4 };
  cond.capacity = { ...cond.capacity, cash: 180_000, creditLine: 150_000, workingCapital: 260_000, backlogValue: 900_000, estimatorLoadAfter: 1, crewLoadAfter: 2 };
  cond.notes = { pr_certification: 'Manufacturer certification pending — training scheduled but not complete before bid due date.', mi_installercert: 'Crew has installed two smaller turf jobs, not yet manufacturer-certified on this exact product.' };

  return [go, gated, cond];
}
