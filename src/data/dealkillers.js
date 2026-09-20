/** Manual deal-killer toggles — non-compensatory, preset-aware. Any ON → NO-GO (gated). */
export function dealKillersFor(preset) {
  const common = [
    { id: 'dk_licence',   label: 'Contractor licence / registration required but not held for this jurisdiction' },
    { id: 'dk_insurance', label: 'Insurance class, limit or additional-insured endorsement we cannot obtain' },
    { id: 'dk_conflict',  label: 'Conflict of interest with an existing GC or client relationship' },
    { id: 'dk_eoi',       label: 'Prequalification / RFQ stage only — no priced bid package issued yet' },
    { id: 'dk_terms',     label: 'Subcontract terms outside policy and the GC refuses to negotiate' },
    { id: 'dk_unlawful',  label: 'Scope requires something we will not do (uncertified installer signing off, unsafe method)' },
  ];
  const specialty = [
    { id: 'dk_certification', label: 'Manufacturer-certified installer status required and we cannot obtain it before award' },
  ];
  const publicWork = [
    { id: 'dk_bond',   label: 'Bid or performance/payment bond required exceeds our surety capacity' },
    { id: 'dk_debar',  label: 'Debarred / not eligible for this agency or this public procurement' },
    { id: 'dk_prevailingwage', label: 'Prevailing-wage / certified-payroll requirement we cannot administer' },
  ];
  let out = [...common];
  if (preset.contexts.includes('specialty')) out = out.concat(specialty);
  if (preset.id === 'specialty_turf') out = out.concat(publicWork);
  return out;
}

/** Mitigation prompts for weak criteria — shown in the Decision view. */
export const MITIGATIONS = {
  cl_funding: 'Ask the GC for a funding letter or owner-financing confirmation before pricing. Do not price a package for a GC whose own contract is not funded.',
  cl_terms: 'Negotiate a shorter pay cycle, retention step-down, or material-on-site billing before award.',
  cl_history: 'Call two other flooring/tile subs who have worked for this GC. Check court records and lien filings.',
  cl_relationship: 'If this is a first job with this GC, weight references from other subs more heavily and start with a smaller package if possible.',
  cl_closeout: 'Get the punch-list and retention-release process in writing before award; ask for retention release tied to your scope, not the whole project.',
  cl_deciders: 'Confirm the field PM has change-order authority before bidding; ask for typical CO turnaround.',
  cl_scopeagreement: 'Ask for a pre-bid walk and RFI period; document scope boundaries (transitions, base, thresholds) in your bid qualifications.',
  cl_litigation: 'Public court-record and lien-filing search. If adverse, require a mediation-first dispute-resolution clause.',
  pr_scope: 'Qualify the take-off explicitly in your bid; request a scope-gap RFI response before award; carry contingency on unresolved items.',
  pr_experience: 'Pair with a crew or foreman who has run this system before; or decline and refer to a sub who has.',
  pr_substrate: 'Require moisture testing before your install date; get a written change-order path if remediation is needed.',
  pr_leadtime: 'Lock material pricing and place the order at award; get a substitution clause approved in advance.',
  pr_unitturn: 'Get a written unit-turn schedule and access-notice commitment from the GC/property manager before pricing labour.',
  pr_certification: 'Confirm certification timeline with the manufacturer before bidding; line up a named third-party testing agency.',
  pr_schedule: 'Ask for a realistic bid period; qualify duration in the bid; push back on LDs flowing to a GC-set duration you did not agree to.',
  ct_form: 'Mark up the special conditions; send a qualifications/departures schedule with the bid.',
  ct_flowdown: 'Ask to review the prime contract; scope flow-down explicitly to what applies to your package.',
  ct_payifpaid: 'Push for pay-when-paid language with a reasonable float, or a cap on how long the GC can withhold before paying regardless.',
  ct_retainage: 'Negotiate a retention step-down and release tied to substantial completion of your scope, not the whole project.',
  ct_backcharge: 'Require back-charges to be in writing with a chance to cure before any pay-app deduction.',
  ct_ld: 'Cap LD flow-down proportional to your contract value, and only for delay you caused and control.',
  ct_consequential: 'Reinstate a mutual consequential-damages waiver; cap liability at your subcontract sum.',
  ct_indemnity: 'Replace broad-form with comparative-fault indemnity; confirm insurance before pricing.',
  ct_lien: 'Refuse advance unconditional lien waivers; confirm your bond-claim rights on public work before bidding.',
  ca_estimating: 'Sequence the bid after a current one closes, or bring in a second estimator before the due date.',
  ca_crew: 'Confirm crew availability before committing to the start date; line up a second crew if the window is tight.',
  ca_backlog: 'If backlog is thin, check for "need for work" bias — score with it zeroed.',
  ca_size: 'Consider a joint venture or subbing a portion, or bid a phase rather than the whole package.',
  ca_arexposure: 'Negotiate deposits / material-on-site billing; extend the credit line; stagger the start against other jobs\' retention release.',
  mi_pricevolatility: 'Lock material pricing at bid; negotiate an escalation clause if the order can\'t be placed immediately.',
  mi_installercert: 'Get the crew certified before mobilisation, or bring in a certified installer of record for this job.',
  mi_qc: 'Put a substrate-acceptance and moisture-test documentation step in the install plan before pricing.',
  mi_subdependency: 'Name a vetted specialty supplier/installer with a written warranty before pricing that scope.',
  mi_callback: 'Mitigate the known failure mode explicitly (moisture barrier, movement joints, manufacturer-spec seaming) and document it.',
  st_fit: 'If it is off-strategy, be honest about why you want it.',
  st_reference: '—',
  st_pipeline: 'Ask the GC or property-management company about their next 12–24 months of packages.',
  st_notbid: 'If declining costs nothing, weight this at zero.',
  co_influence: 'Meet the GC\'s estimator/PM before the bid closes; offer product/finish-schedule input.',
  co_incumbent: 'Find out why the incumbent is being re-bid.',
  co_diff: 'Lead the bid with certification, schedule certainty, or unit-turn track record; do not compete on price alone.',
  co_price: 'Use labour productivity or buying advantage to get under the field without cutting margin.',
};
