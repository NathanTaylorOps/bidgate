/**
 * BidGate criteria library.
 *
 * BidGate scores a bid from the position of a US flooring / tile / specialty-surface
 * SUBCONTRACTOR bidding a discipline package (US$100K–$4M) to a general contractor —
 * not a general contractor running the whole job. "Client" below means the GC (and,
 * one level up, sometimes the GC's owner/developer).
 *
 * Every criterion carries behaviourally-anchored rating scale (BARS) descriptors at 1 / 3 / 5.
 * Anchors describe an observable state of the world, not an adjective of degree.
 *
 * Fields
 *  id        stable key (never rename — saved bids reference it)
 *  group     group id (see GROUPS)
 *  name      short label
 *  anchors   { 1, 3, 5 } strings (2 and 4 are "between")
 *  gate      optional. { at: 1 }  → a score of 1 is a hard gate (non-compensatory). Verdict = NO-GO (gated).
 *  floor     optional. { at: 2 }  → a score ≤ 2 caps the verdict at CONDITIONAL (weakest-link floor)
 *  axis      'attractiveness' | 'winnability'  — which axis this criterion belongs to on the 2×2
 *  contexts  which package types this criterion is shown in: 'multifamily' | 'commercial' | 'specialty'
 *  evidence  one-line pointer to the research source (kept short; full citations in docs/METHODOLOGY.md)
 *
 * Sources are summarised in docs/METHODOLOGY.md. Key ones: Buildings 12(3):379 (2022 meta-analysis of 24 studies),
 * Buildings 14(10):3114 (Aldossari 2024), Shipley decision gates, SMPS/APEX worksheet, Markup & Profit,
 * Miller Act (40 U.S.C. §3131 et seq.) and state "mini-Miller Act" bond-claim statutes, AIA A401-2017 / ConsensusDocs 750
 * subcontract commentary, flooring-industry moisture-testing standards (ASTM F710 / F2170).
 * Criteria with no such source are marked "Practitioner / industry practice — no peer-reviewed source."
 */

/**
 * Minimum weighted coverage before a verdict band is issued. Coverage is the share of attractiveness weight
 * whose criteria have been scored (group weight × scored / total in the group, summed). Below this — or with any
 * gate criterion unscored — the verdict is INCOMPLETE, never GO. 70 % is a judgement call: it lets a scorer skip
 * the handful of criteria they genuinely cannot see at bid stage while making "one 5 on a 42-line card → GO"
 * impossible.
 */
export const VERDICT_COVERAGE_MIN = 0.70;

export const GROUPS = [
  { id: 'client',    label: 'Client & Payment',        short: 'Client',    axis: 'attractiveness', icon: '◉' },
  { id: 'project',   label: 'Project & Scope',         short: 'Project',   axis: 'attractiveness', icon: '▣' },
  { id: 'contract',  label: 'Contract & Risk',         short: 'Contract',  axis: 'attractiveness', icon: '§' },
  { id: 'capacity',  label: 'Capacity & Backlog',      short: 'Capacity',  axis: 'attractiveness', icon: '◫' },
  { id: 'materials', label: 'Materials & Installation', short: 'Materials', axis: 'attractiveness', icon: '⚒' },
  { id: 'strategic', label: 'Strategic Value',         short: 'Strategy',  axis: 'attractiveness', icon: '◈' },
  { id: 'compete',   label: 'Competitive Position',    short: 'Compete',   axis: 'winnability',    icon: '⇄' },
];

export const CRITERIA = [
  /* ───────────────────────── CLIENT & PAYMENT (the GC) ───────────────────────── */
  {
    id: 'cl_funding', group: 'client', name: 'GC / project funding verified',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    gate: { at: 1 },
    anchors: {
      1: 'GC will not name the owner\'s lender or funding source; project is "in pre-development"; a public job with budget not yet appropriated.',
      3: 'GC states funding is in place but no documentation offered; public job budgeted but not yet under contract with the owner.',
      5: 'GC\'s contract with the owner is executed and funded (loan closed / bond issued / appropriation final); GC will share a funding letter on request.',
    },
    evidence: 'Ranked #1–2 in the 2022 meta-analysis (pooled RII .819) and #1 in Aldossari 2024 (RII 93.4) — same underlying factor (owner/GC ability to fund the work) applies one contract tier down.',
  },
  {
    id: 'cl_terms', group: 'client', name: 'GC payment terms, retention & release timing',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    floor: { at: 2 },
    anchors: {
      1: 'Pay-if-paid enforced with no exceptions, > 45-day pay cycle, 10 % retention with no step-down, or retention "released at final completion of the entire project" regardless of your trade\'s completion.',
      3: 'Pay-when-paid with a reasonable float (≤ 30 days after GC receives payment), retention 10 % → 5 % at 50 % complete, monthly pay applications.',
      5: 'Prompt-pay terms (≤ 14–30 days), retention ≤ 5 % or released at substantial completion of your scope, or GC accepts mobilisation / material-on-site billing.',
    },
    evidence: 'Payment terms = #1 pooled factor (RII .833) in the meta-analysis. Slow payment and retention practices are the leading source of subcontractor cash-flow failure (NASBP / ASA surveys).',
  },
  {
    id: 'cl_history', group: 'client', name: 'GC reputation & payment history to subs',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'Unknown GC with no references from other subs, or known slow payer / frequent disputes reported by trade contacts.',
      3: 'Known in the market; no adverse reports; first job together.',
      5: 'Repeat GC with a completed, paid, clean job on file, or referred by another flooring/tile sub who was paid on time.',
    },
    evidence: 'Client reputation .814 and payment history .802 in the meta-analysis — GC reputation among subs is the direct analogue.',
  },
  {
    id: 'cl_relationship', group: 'client', name: 'Repeat-GC relationship & track record together',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'First job with this GC and no references check out, or a prior job together ended in a dispute over scope, payment or back-charges.',
      3: 'First job with this GC; references from other subs are neutral to positive.',
      5: 'Multiple completed jobs with this GC, paid on time, clean close-out each time.',
    },
    evidence: 'Practitioner / industry practice — no peer-reviewed source. Repeat-relationship effects are directional in trade literature (ConstructConnect 2026) but not formally studied at the sub level.',
  },
  {
    id: 'cl_closeout', group: 'client', name: 'GC punch-list & close-out discipline',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'Known to hold full retention for months over trivial punch items, or no defined punch-list process; owner sign-off historically delayed.',
      3: 'Standard punch-list process; retention released within 60–90 days of substantial completion of your scope.',
      5: 'Fast, itemised punch process; retention released promptly on completion of your scope, not gated on the whole project.',
    },
    evidence: 'Practitioner / industry practice — no peer-reviewed source. This is the sub-side analogue of the meta-analysis\'s payment-terms factor: subs are routinely burned by retention held on trivial close-out items.',
  },
  {
    id: 'cl_deciders', group: 'client', name: 'Decision-makers, responsiveness & change-order speed',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'No single PM/super with authority to approve change orders on site; RFIs and CO pricing sit unanswered for weeks.',
      3: 'Named PM with authority; typical CO turnaround 1–2 weeks.',
      5: 'Responsive PM/super, CO turnaround days not weeks, field directives confirmed in writing promptly.',
    },
    evidence: 'Markup & Profit; Remodelers Advantage pre-qualification; MEDDIC "economic buyer" — applied to the GC field team.',
  },
  {
    id: 'cl_scopeagreement', group: 'client', name: 'Willingness to nail down scope & schedule before pricing',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'GC refuses a pre-bid walk or RFI period; "just price the plans as issued" on drawings with open coordination items.',
      3: 'Standard pre-bid RFI period and one site walk; most coordination questions answered before bid due date.',
      5: 'Pre-bid walk plus a scope-clarification meeting; GC issues addenda promptly and confirms scope boundaries (who installs transitions, base, thresholds) in writing.',
    },
    evidence: 'Design/scope-clarity fees "separate the serious buyers from the tire kickers" (JLC), applied to pre-bid scope clarification for a subcontract package.',
  },
  {
    id: 'cl_litigation', group: 'client', name: 'GC litigation / dispute propensity',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    gate: { at: 1 },
    anchors: {
      1: 'Court-records / lien-filing search shows a pattern of disputes with subcontractors or non-payment claims against this GC.',
      3: 'Nothing found; GC asks reasonable contract questions.',
      5: 'Nothing found; GC accepts your standard qualifications and a normal dispute-resolution clause.',
    },
    evidence: 'Practitioner / industry practice — no peer-reviewed source. Public court-record and lien-filing search is the check.',
  },

  /* ───────────────────────── PROJECT & SCOPE ───────────────────────── */
  {
    id: 'pr_scope', group: 'project', name: 'Scope clarity & take-off completeness at bid',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    floor: { at: 2 },
    anchors: {
      1: 'Finish schedule incomplete or contradictory; no room-by-room take-off possible; transitions, base and thresholds not shown; > 1 open RFI per floor.',
      3: 'Finish schedule issued with spec by reference; take-off possible with reasonable assumptions; a handful of open RFIs.',
      5: 'Complete finish schedule + specs + room finish plan; take-off is a direct count, no assumptions; RFIs closed before bid due.',
    },
    evidence: 'Scope clarity RII 91.8 (Aldossari 2024) — applies directly to a trade package take-off.',
  },
  {
    id: 'pr_experience', group: 'project', name: 'Experience with this building type & material system',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    gate: { at: 1 },
    anchors: {
      1: 'Never installed this material/system (e.g., synthetic turf, large-format porcelain, moisture-mitigation systems) and no crew or partner who has.',
      3: 'Delivered adjacent building types or materials; one or two comparable jobs on this exact system.',
      5: 'Core capability; ≥ 3 comparable jobs on this building type and material system completed profitably in the last 5 years.',
    },
    evidence: 'Experience on similar projects RII .770 (meta-analysis); Shash 1993 top-3 — narrowed to building type AND material system, the two axes that actually drive flooring/tile risk.',
  },
  {
    id: 'pr_substrate', group: 'project', name: 'Substrate conditions & moisture-testing requirements',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'No moisture testing scheduled or specified on a slab-on-grade / post-tension slab; substrate condition unknown; GC assumes flooring sub owns remediation cost with no allowance.',
      3: 'Moisture testing (ASTM F2170 in-situ RH or F710-style calcium chloride) specified and scheduled, but results not yet available at bid; remediation cost allocation undecided.',
      5: 'Moisture testing complete and within tolerance, or a clear contractual allowance / change-order path for remediation if it is not.',
    },
    evidence: 'Moisture-related substrate failure is the leading cause of flooring installation callbacks (flooring-industry trade practice; ASTM F710/F2170 are the governing test standards). Practitioner / industry practice for the risk-allocation anchor — no peer-reviewed source.',
  },
  {
    id: 'pr_leadtime', group: 'project', name: 'Product lead-time & supply-chain risk',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'Specified product (dye-lot-sensitive carpet tile, imported stone/porcelain, synthetic turf) has lead time longer than the schedule allows, or is single-sourced with no substitution approved.',
      3: 'Lead time fits the schedule with normal float; substitution process exists if a delay occurs.',
      5: 'Product in stock or short lead time; multiple approved manufacturers/distributors; dye-lot risk mitigated by ordering the full quantity up front.',
    },
    evidence: 'Practitioner / industry practice — no peer-reviewed source. Flooring and specialty-surface supply chains (carpet tile dye lots, synthetic turf backing, natural stone) are a known project-delay driver in trade press.',
  },
  {
    id: 'pr_unitturn', group: 'project', name: 'Unit-turn / occupied-space scheduling complexity',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial'],
    anchors: {
      1: 'Occupied or partially occupied building; access negotiated unit-by-unit with tenants; no dedicated punch/turn schedule from the GC or property manager.',
      3: 'Vacant-unit turns on a defined schedule with reasonable notice; some tenant coordination required for common areas.',
      5: 'Fully vacant building or new construction; no tenant coordination; GC/PM controls access and sequencing.',
    },
    evidence: 'Practitioner / industry practice — no peer-reviewed source. Occupied-unit access is the dominant schedule-risk driver reported by multifamily flooring subs (trade practice, not formally studied).',
  },
  {
    id: 'pr_certification', group: 'project', name: 'Specialty-scope certification requirements (turf / athletic surfaces)',
    axis: 'attractiveness', contexts: ['specialty'],
    anchors: {
      1: 'Manufacturer-certified installer status required and not held; infill spec, seaming method or ADA/athletic performance testing (e.g., GMax, shock attenuation) not addressed in the bid documents.',
      3: 'Certification held or attainable before award; infill and seaming spec clear; performance-testing requirement known but not yet scheduled.',
      5: 'Certified installer of record on this exact product; performance testing scoped and scheduled with a named third-party testing agency.',
    },
    evidence: 'Practitioner / industry practice — no peer-reviewed source. Synthetic-turf manufacturers gate warranty on certified-installer status; school/athletic work commonly specifies ADA and athletic-performance test criteria (e.g., ASTM F1936 for shock attenuation) in the contract documents.',
  },
  {
    id: 'pr_schedule', group: 'project', name: 'Schedule realism & time to prepare the bid',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: '"Bid in three days, mobilise next week"; install duration shorter than your comparable jobs by a material margin; liquidated damages flow down to your scope.',
      3: 'Adequate bid period; duration within 10 % of your norm for this scope and square footage.',
      5: 'Generous bid period; duration you helped set or agreed to; float built in before your scope\'s critical-path milestone.',
    },
    evidence: 'Time to prepare bid .665; duration .691 (meta-analysis). McCadden: unrealistic asks are disqualifiers.',
  },

  /* ───────────────────────── CONTRACT & RISK (subcontract position) ───────────────────────── */
  {
    id: 'ct_form', group: 'contract', name: 'Subcontract form & amendment level',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'GC\'s bespoke subcontract with > 20 pages of special conditions, or a standard form gutted of its balancing provisions (no termination-for-convenience payment, one-sided indemnity, deleted notice-and-cure).',
      3: 'Standard form (AIA A401, ConsensusDocs 750) with moderate amendments; termination-for-convenience and notice provisions intact.',
      5: 'Unamended standard subcontract form, or your own subcontract accepted.',
    },
    evidence: 'AIA A401-2017 and ConsensusDocs 750 are the standard US subcontract forms; unamended they balance flow-down risk with sub protections — GCs routinely amend them, same dynamic as prime-contract amendment practice.',
  },
  {
    id: 'ct_flowdown', group: 'contract', name: 'Flow-down clauses from the prime contract',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'Blanket flow-down of the entire prime contract sight-unseen, including obligations that make no sense for your scope (bonding, design responsibility, owner-specific insurance you cannot obtain).',
      3: 'Flow-down limited to provisions relevant to your scope; prime contract available for review before signing.',
      5: 'Flow-down scoped explicitly to what applies to you, or prime contract excerpts attached; GC will negotiate an obligation that does not fit.',
    },
    evidence: 'Practitioner / industry practice — no peer-reviewed source. Blanket flow-down clauses are a standard subcontractor risk-review item in AIA A401/ConsensusDocs 750 commentary.',
  },
  {
    id: 'ct_payifpaid', group: 'contract', name: 'Pay-if-paid vs pay-when-paid',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    gate: { at: 1 },
    anchors: {
      1: 'True pay-if-paid (owner non-payment is a condition precedent that extinguishes the GC\'s obligation to pay you) in a state where that clause is enforceable, with no cap or carve-out.',
      3: 'Pay-when-paid (timing mechanism only, not a condition precedent) or pay-if-paid in a state where courts read it as a timing clause regardless of drafting.',
      5: 'No pay-if-paid / pay-when-paid clause; you are paid on your own pay application regardless of the GC\'s receipt from the owner.',
    },
    evidence: 'Pay-if-paid enforceability varies sharply by state (void in some, enforceable if unambiguous in others) — the single largest subcontractor payment-risk clause in US construction law; ranked with cl_terms\'s payment-terms factor (RII .833) as the underlying driver.',
  },
  {
    id: 'ct_retainage', group: 'contract', name: 'Retainage terms & release timing',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    floor: { at: 2 },
    anchors: {
      1: '≥ 10 % retainage held with no step-down, released only at final completion of the entire project (not your scope), no statutory retainage-reduction right invoked.',
      3: '5–10 % retainage with a step-down at 50 % complete, released within 60–90 days of your scope\'s substantial completion.',
      5: '≤ 5 % retainage, or retainage-reduction / bond-in-lieu accepted, released promptly on completion of your scope.',
    },
    evidence: 'Same pooled payment-terms factor as cl_terms (RII .833) — retainage duration and release timing are consistently the largest driver of subcontractor cash-flow strain.',
  },
  {
    id: 'ct_backcharge', group: 'contract', name: 'Back-charge exposure & history with this GC',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'GC has a reputation for unilateral back-charges (clean-up, protection, coordination) deducted from pay apps without prior notice or agreement.',
      3: 'Back-charges only with prior written notice and a chance to cure or dispute.',
      5: 'No back-charge history with this GC, or a clean, mutually-agreed back-charge process in the subcontract.',
    },
    evidence: 'Practitioner / industry practice — no peer-reviewed source. Unilateral back-charging is a standard subcontractor pre-qualification question in ASA (American Subcontractors Association) guidance.',
  },
  {
    id: 'ct_ld', group: 'contract', name: 'Liquidated-damages flow-down risk',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    gate: { at: 1 },
    anchors: {
      1: 'Full prime-contract LD rate flows down to you uncapped, or LDs apply even when the delay is not on your scope\'s critical path.',
      3: 'LD flow-down capped at a fraction of the prime rate proportional to your contract value, and only when your scope is demonstrably the cause.',
      5: 'No LD flow-down, or LDs capped low and only for delay you directly caused and control.',
    },
    evidence: 'CFMA and ASA subcontractor guidance: target a capped, causation-linked LD flow-down — the same principle applied to the subcontract rather than the prime contract.',
  },
  {
    id: 'ct_consequential', group: 'contract', name: 'Consequential damages & liability cap',
    axis: 'attractiveness', contexts: ['commercial', 'specialty'],
    gate: { at: 1 },
    anchors: {
      1: 'Consequential-damages waiver deleted or one-sided AND no liability cap on your subcontract.',
      3: 'Limited mutual waiver with carve-outs; liability capped at 100–150 % of your subcontract sum.',
      5: 'Mutual complete waiver (A401 §11.9-style); liability capped ≤ your subcontract sum with standard carve-outs.',
    },
    evidence: 'ConsensusDocs "don\'t bet the company"; CFMA cites a $14.5 M award on a $600 K fee — the exposure scales the same way for a sub carrying a fraction of the total contract value.',
  },
  {
    id: 'ct_indemnity', group: 'contract', name: 'Indemnity breadth & insurance',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    gate: { at: 1 },
    anchors: {
      1: 'Broad-form / "any and all" indemnity (covers the GC\'s own negligence); insurance limits or additional-insured endorsements you cannot obtain.',
      3: 'Intermediate-form indemnity; insurance within your current program.',
      5: 'Limited-form, comparative-fault indemnity with defence costs pro-rated; insurance as you already carry.',
    },
    evidence: 'Anti-indemnity statutes void broad-form indemnity in many states (e.g., Cal. Civ. Code §2782; Tex. Ins. Code ch. 151), yet it still appears in bespoke subcontracts — its presence signals a hostile drafter.',
  },
  {
    id: 'ct_lien', group: 'contract', name: 'Lien / bond-claim rights',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'Advance unconditional lien/bond-claim waivers required before payment, or lien rights waived entirely in the subcontract, on a private job with no bond in lieu.',
      3: 'Standard conditional waivers tied to actual payment received; lien or bond-claim rights (state mini-Miller Act on public work) intact.',
      5: 'Lien or Miller Act bond-claim rights fully intact and unwaived, with only standard conditional-on-payment waiver language.',
    },
    evidence: 'Federal public work: Miller Act (40 U.S.C. §3131 et seq.) gives subs a payment-bond claim in place of lien rights. Private and state work: mechanics-lien statutes and state "mini-Miller Act" bond statutes vary by jurisdiction — check before waiving.',
  },

  /* ───────────────────────── CAPACITY & BACKLOG ───────────────────────── */
  {
    id: 'ca_estimating', group: 'capacity', name: 'Estimating-team capacity & backlog',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    gate: { at: 1 },
    anchors: {
      1: 'No estimator can take this on without dropping a bid already committed to another GC; queue is already backed up past the bid due date.',
      3: 'An estimator is available at normal queue depth; some evening/weekend work needed to hit the due date.',
      5: 'Estimator free with slack, or this bid replaces one just closed out.',
    },
    evidence: 'Qualified labour / staff availability RII 89.5 (Aldossari 2024) — applied to estimating-team throughput, the actual constraint a small specialty-trade estimating group manages first.',
  },
  {
    id: 'ca_crew', group: 'capacity', name: 'Installation-crew availability in the start window',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'No crew assignable without pulling one off a live job; would require an unvetted new crew for a scope this size.',
      3: 'Crew available within normal lead time; may share supervision with another live job briefly.',
      5: 'Dedicated crew available at the start date, or this job replaces one finishing.',
    },
    evidence: 'Qualified labour / staff availability RII 89.5 (Aldossari 2024).',
  },
  {
    id: 'ca_backlog', group: 'capacity', name: 'Backlog after award (months)',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: '> 6 months (over-committed for a specialty trade\'s shorter install cycles) or < 1 month (desperate — "need for work" bias risk).',
      3: '2–4 months.',
      5: '1–2 months: healthy runway without over-commitment, appropriate to shorter flooring/tile install durations.',
    },
    evidence: 'Current workload .734, need for work .745 (meta-analysis); backlog-months bands adjusted down from a GC\'s multi-year backlog norm to a specialty trade\'s much shorter install cycle.',
  },
  {
    id: 'ca_size', group: 'capacity', name: 'Job size vs largest completed',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: '> 1.5× your largest completed package for this material system.',
      3: '1.0–1.5× largest completed.',
      5: '≤ 1.0× largest completed; within your sweet-spot band (80–120 % of typical).',
    },
    evidence: 'Surety single-job rule of thumb (≈ 1.5× largest completed) applied to package size for a subcontractor without bonding pressure driving the number. Project size RII .781.',
  },
  {
    id: 'ca_arexposure', group: 'capacity', name: 'Retention & AR exposure across concurrent jobs',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'Retention held across several concurrent GCs already ties up working capital equal to more than a month of payroll; adding this job pushes it further.',
      3: 'Retention held across concurrent jobs is manageable against current cash + credit line.',
      5: 'Retention exposure is low, or this GC releases retention fast enough that it never stacks meaningfully.',
    },
    evidence: 'Practitioner / industry practice — no peer-reviewed source. A lightweight adaptation of the working-capital-at-risk concern (Elazouni 2009 finance-based scheduling); kept simple because a specialty sub\'s retention exposure is materially smaller than a GC\'s portfolio cash position.',
  },

  /* ───────────────────────── MATERIALS & INSTALLATION ───────────────────────── */
  {
    id: 'mi_pricevolatility', group: 'materials', name: 'Material price & lead-time volatility exposure',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'Bid is held firm for months before award with no escalation clause; material (LVT resin, carpet-tile backing, synthetic-turf polymer) has shown double-digit price swings in the last 12 months.',
      3: 'Escalation clause covers price movement beyond a defined threshold, or the bid-to-order window is short enough that exposure is limited.',
      5: 'Material ordered/locked at bid, or a full pass-through escalation clause; no exposure between bid and install.',
    },
    evidence: 'Practitioner / industry practice — no peer-reviewed source. Resilient-flooring and synthetic-turf raw material costs are commodity-linked (petrochemical inputs) and volatile; who carries that risk between bid and install is a standard subcontractor bid qualification.',
  },
  {
    id: 'mi_installercert', group: 'materials', name: 'Installer crew certification & experience with this system',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'Crew has never installed this specific product/system; no manufacturer training or certification; would be learning on this job.',
      3: 'Crew has installed comparable systems from a different manufacturer; certification attainable before mobilisation.',
      5: 'Crew is manufacturer-certified on this exact product/system with a track record of completed installs.',
    },
    evidence: 'Practitioner / industry practice — no peer-reviewed source. Not every flooring crew can install synthetic turf or large-format porcelain to spec; manufacturer certification is the standard proxy used in trade qualification questionnaires.',
  },
  {
    id: 'mi_qc', group: 'materials', name: 'Installation QA/QC process & moisture-test documentation',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'No documented QC step for substrate acceptance; moisture-test results, if any, are not logged or attached to the installation record.',
      3: 'Substrate-acceptance checklist used; moisture-test results logged for the job file.',
      5: 'Formal QC process (substrate-acceptance sign-off, moisture-test documentation per ASTM F710/F2170, photo record) that would defend a warranty claim.',
    },
    evidence: 'Practitioner / industry practice — no peer-reviewed source. ASTM F710 / F2170 define the substrate moisture-test methods; TCNA Handbook and NWFA / RFCI installation guidelines define the substrate-acceptance documentation this criterion expects.',
  },
  {
    id: 'mi_subdependency', group: 'materials', name: 'Specialist-sub dependency for specialty scope',
    axis: 'attractiveness', contexts: ['specialty'],
    anchors: {
      1: 'Single-source specialty supplier/installer (e.g., turf-infill supplier, moisture-remediation sub) never used before, no written warranty.',
      3: 'Known specialty supplier/installer with standard warranty.',
      5: 'Vetted specialty supplier/installer with written warranty, or the capability is in-house and already proven on comparable work.',
    },
    evidence: 'Practitioner / industry practice — no peer-reviewed source.',
  },
  {
    id: 'mi_callback', group: 'materials', name: 'Warranty / callback exposure by failure mode',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'High-callback failure mode for this scope (moisture-related delamination, grout/tile cracking over a known-bad substrate, turf seam failure) with no mitigation and a standard 1-year warranty only.',
      3: 'Normal callback exposure for this material system; standard warranty accepted; mitigation for the known failure mode is in the install plan.',
      5: 'Failure mode is specifically mitigated (moisture barrier, movement joints, manufacturer-spec seaming) and documented; warranty exposure is limited to genuine workmanship defects.',
    },
    evidence: 'Practitioner / industry practice — no peer-reviewed source. Moisture-related delamination, grout/tile cracking and turf seam failure are the flooring/tile industry\'s named leading callback causes; this is a modest, honest warranty-exposure check, not a profit-centre framing.',
  },

  /* ───────────────────────── STRATEGIC VALUE ───────────────────────── */
  {
    id: 'st_fit', group: 'strategic', name: 'Segment / sector fit',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'Outside the segments you are trying to grow (e.g., a one-off residential job when your plan is multifamily and specialty athletic surfaces).',
      3: 'Adjacent segment; plausible step.',
      5: 'Exactly the mix you are building the business around (multifamily / commercial TI / specialty athletic).',
    },
    evidence: 'Strategic considerations significant in Egemen & Mohamed 2007.',
  },
  {
    id: 'st_reference', group: 'strategic', name: 'Reference / portfolio value',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'No marketing or credential uplift.',
      3: 'Useful credential for a target segment or GC relationship.',
      5: 'Landmark win: opens a new GC relationship, a property-management-company relationship, or a public-sector specialty-surface prequalification.',
    },
    evidence: 'SMPS worksheet "corporate priority".',
  },
  {
    id: 'st_pipeline', group: 'strategic', name: 'Repeat-work / pipeline potential with this GC',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'One-off; GC has no further packages or properties in the pipeline.',
      3: 'Possible repeat package from this GC or property-management company.',
      5: 'Gateway to a programme (multiple properties, a standing PM-company relationship, or a multi-phase project).',
    },
    evidence: 'Repeat-client win rates 50 %+ vs 15–25 % competitive (directional, ConstructConnect 2026).',
  },
  {
    id: 'st_notbid', group: 'strategic', name: 'Risk of NOT bidding',
    axis: 'attractiveness', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'None — declining costs nothing.',
      3: 'Would disappoint a GC contact or a referrer; a competitor gets a foothold with that GC.',
      5: 'Declining damages a repeat-GC relationship, idles installation crews for a quarter, or hands a competitor your reference GC.',
    },
    evidence: 'Shipley pursuit gate: "risks of bidding vs not bidding" — the only framework that scores the no-bid side.',
  },

  /* ───────────────────────── COMPETITIVE POSITION (winnability) ───────────────────────── */
  {
    id: 'co_influence', group: 'compete', name: 'Influence on requirements / relationship depth',
    axis: 'winnability', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'Learned of it from a public posting; no contact with the GC\'s estimator/PM; spec written around a competitor\'s product.',
      3: 'Known contact at the GC; some pre-bid conversation; spec is neutral on product/installer.',
      5: 'Helped shape the finish schedule or spec; GC relies on you for product input; you knew before it went out to bid.',
    },
    evidence: 'Shipley bid gate: "To what extent have we influenced the requirements?"; SMPS "when did we learn of it".',
  },
  {
    id: 'co_incumbent', group: 'compete', name: 'Incumbency / favoured competitor',
    axis: 'winnability', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'A competitor is the GC\'s go-to flooring/tile sub or the award looks wired.',
      3: 'No incumbent; open field.',
      5: 'You are the GC\'s go-to sub for this scope, or their stated preference.',
    },
    evidence: 'Shipley; Deltek Vantagepoint go/no-go fields; competitiveness of bidders .669.',
  },
  {
    id: 'co_diff', group: 'compete', name: 'Differentiators the GC values',
    axis: 'winnability', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'Commodity play; price is the only lever, and several qualified competitors can do this scope.',
      3: 'Some edge (schedule certainty, certification, self-perform crew) but not decisive.',
      5: 'Clear, defensible advantage the GC has said matters — e.g., the only certified installer of this system in the market, or a proven unit-turn track record.',
    },
    evidence: 'SMPS "how do we distinguish ourselves"; CLEATUS price-to-win. Specialty scopes (turf/athletic) often have fewer qualified competitors, which is itself a differentiator worth naming explicitly.',
  },
  {
    id: 'co_price', group: 'compete', name: 'Expected price position vs field',
    axis: 'winnability', contexts: ['multifamily', 'commercial', 'specialty'],
    anchors: {
      1: 'Likely ≥ 3 % above the field average (P(lowest) ≈ 10 % against four others).',
      3: 'At the field average.',
      5: 'Likely ≥ 3 % below the field through buying advantage or labour productivity — without cutting margin.',
    },
    evidence: 'Bid CV typically 5–8 % (Skitmore & Ballesteros-Pérez 2021); ±3 % moves P(lowest) from ~35 % to ~10 % at n = 4.',
  },
];

/** Convenience lookups */
export const CRITERIA_BY_ID = Object.fromEntries(CRITERIA.map(c => [c.id, c]));
export const criteriaForGroup = (gid) => CRITERIA.filter(c => c.group === gid);
export const criteriaForContexts = (ctxs) => CRITERIA.filter(c => c.contexts.some(x => ctxs.includes(x)));
