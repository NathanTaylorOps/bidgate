# Methodology

BidGate is a decision-support tool, not an oracle. This document explains what it computes, why, and where every default came from — so you can disagree with it precisely.

## 1. The problem with a simple scorecard

Most bid/no-bid templates are a weighted sum of 1–5 scores. That has three defects:

1. **It is compensatory.** A client who cannot pay (1/5) is "offset" by a great margin (5/5). The UK Government Analysis Function's MCDA guide says simple importance weighting "is not a valid approach" because it conflates *importance* with the *range of performance*.
2. **It hides uncertainty.** A single number implies a precision nobody has at bid stage.
3. **It never learns.** Nobody records whether the bid was won, or what margin it actually made, so the weights are never tested.

BidGate addresses each in turn.

## 2. Three-stage evaluation

```
Stage 1  GATES        conjunctive screening — any gate criterion at 1, any manual deal-killer,
                      any capacity gate  →  NO-GO (gated). Score still shown, greyed.
Stage 2  SCORE        weighted mean of group means, two axes:
                      attractiveness (should we want it?)  ·  winnability (can we win it?)
Stage 3  FLOOR        any `floor` criterion ≤ 2 caps the verdict at CONDITIONAL
```

Bands on attractiveness: **≥ 75 GO · 60–74 GO WITH APPROVAL · 40–59 CONDITIONAL · < 40 NO-GO.** The middle band is a *routed state* — approver, conditions, date — not just "amber" (pattern from Deltek Vantagepoint's Go / Go-with-management-approval / No-Go).

Gates are conjunctive screening in the Gilbride & Allenby (2004) sense: an alternative must pass every must-have before compensatory evaluation applies. Which criteria carry gates follows the evidence on what actually sinks subcontractors — gates: funding, litigation propensity, project-type experience, pay-if-paid, LD, consequential damages, indemnity, estimating capacity; floors (cap at CONDITIONAL): payment terms, retainage, scope clarity.

## 3. Criteria library (42 criteria, 7 groups)

BidGate scores a bid from the position of a US **flooring / tile / specialty-surface subcontractor** bidding a discipline package (US$100K–$4M) to a general contractor — not a general contractor running the whole job. "Client" throughout means the GC (and, one level up, sometimes the GC's owner/developer).

Every criterion has behaviourally-anchored descriptors at 1 / 3 / 5: observable states of the world, not adjectives. Sources per criterion are in `src/data/criteria.js`; the principal ones:

| Group | Weight (Multi-Family preset) | Why this weight |
|---|---|---|
| Client & Payment | 24 % | Payment terms (.833), funding/financial capacity (.819), reputation (.814), payment history (.802) are the four highest pooled RII values in the 24-study meta-analysis (Buildings 12(3):379, 2022) — applied one contract tier down, to the GC's payment behaviour toward subs. |
| Project & Scope | 22 % | Scope clarity RII 91.8 (Aldossari); experience on similar building type/material .770. Flooring-specific additions (substrate/moisture, lead-time, unit-turn, certification) are practitioner-sourced — see §9. |
| Materials & Installation | 16 % | No published tool models a specialty trade's material/installer risk. Weight reflects that for a flooring/tile sub, material price volatility, installer certification and callback exposure are first-order economic variables — the sub-level analogue of a general contractor's self-perform economics. |
| Capacity & Backlog | 16 % | Current workload .734, need for work .745 (meta-analysis) — rescaled to a specialty trade's much shorter install cycles than a general contractor's multi-year backlog. |
| Contract & Risk | 14 % (multi-family) / 20 % (commercial TI) / 16 % (specialty) | Subcontract-specific: flow-down, pay-if-paid/pay-when-paid, retainage and LD flow-down are where subcontractors lose money, not prime-contract clauses. |
| Strategic Value | 8–10 % | Shipley pursuit gate ("risks of not bidding"); SMPS "corporate priority" — reframed around GC-relationship and segment fit. |
| Competitive Position | winnability axis | Kept off the attractiveness score so the 2×2 can separate "want it" from "can win it". |

**Weights are configurable defaults, not standards.** ContractsConnected, TenderScan, BidClarity et al. publish weight sets that are vendor templates. The only outcome-based evidence located is the meta-analysis; presets lean on it.

## 4. Weighting methods

- **Direct** ("quick mode"): type percentages. Fast, and the method the Analysis Function warns against.
- **Swing weighting** (recommended): for each group, rate how much moving *that group alone* from worst to best anchor improves the decision; biggest = 100; normalise. Weights by range of impact.
- **AHP** (Saaty): pairwise 1–9 comparisons → priority vector via normalised row geometric means → λmax → CI = (λmax − n)/(n − 1) → CR = CI / RI(n). CR > 0.10 flags inconsistency, and the tool names the single judgement whose revision most reduces CR. AHP is used only for group weights, where its rank-reversal weakness (Belton & Gear 1983) does not bite. Test: reproduces Saaty's 3×3 textbook example to ±0.01.

## 5. Sensitivity and robustness

- **Tornado**: each scored criterion set to 1 and 5, one at a time; bar = swing in attractiveness.
- **Switching values in words**: the smallest single-criterion change that moves the band, up or down.
- **Weight robustness**: 400 random weight vectors within ±20 % of the preset; report the share landing in the same band. Below ~70 % the verdict depends on weighting, not scoring.

## 6. Win probability

```
p0 = (wins + α·μ) / (bids + α)           empirical-Bayes shrinkage, α = 10 pseudo-bids, μ = route default
p1 = p0 · [1/(n+1)] / [1/(n̄+1)]         competitor adjustment, clipped [0.02, 0.95]
logit(p) = logit(p1) + β·(s − 3)          s = winnability mapped to 1–5, β = 0.5
```

Route defaults (hard-bid public 15 %, private 20 %, invited 33 %, negotiated 50 %, repeat 65 %) are **directional trade figures** (ENR/Hedley; ConstructConnect 2026, which itself says no published benchmark exists). Replace them with your own log; the shrinkage does that automatically as outcomes accumulate.

**Friedman (1956) / Gates (1967)** price curves for hard bids: with bid coefficient of variation *c* (default 6 %; Skitmore & Ballesteros-Pérez 2021 find 4–12 %, typically 5–8 %) and price position *d* vs field mean, P(lowest | n) ≈ (1 − Φ(d/c))ⁿ (Friedman, independence, pessimistic) or 1/(1 + n·Φ/(1−Φ)) (Gates). Skitmore (2002) tested both on 591 UK auctions: neither beats a calibrated empirical model; Friedman is a useful pessimistic bound. Markup heuristic: m₂/m₁ = (n₁/n₂)^0.7.

**Winner's curse** flag at ≥ 6 bidders with scope clarity ≤ 2 (Dyer & Kagel 1996; DOT data show too-low bids spike at 7+). Response: raise contingency, do not cut markup.

## 7. Expected value

```
EV  = p · (V·g − levies − post-award cost) − bid cost
```

- Bid cost defaults by route: 1.0 % of value hard-bid, 0.8 % invited, 0.4 % negotiated, 0.3 % repeat — from Hughes et al. (UK, 0.64 % mean; losing bids 0.48 %, winning 0.65 %) and Constructing Excellence 2014–15 (0.57 %). No peer-reviewed US specialty-subcontractor figure exists. Explicit hours × loaded rate override the default.
- **Pursuit ratio** bid cost / gross profit > 10 % is flagged (PSMJ rule).
- **Risk-adjusted EV** subtracts one σ of margin, σ driven by scope clarity (6 pts at 1 → 1 pt at 5).
- **Levies**: the mechanism (`leviesFor()`) exists so a locale-specific line item could be added later, but every current preset ships an empty levies array — these are US-only subcontractor presets with no analogous statutory levy modelled. `leviesFor()` degrades gracefully to `[]` when a preset carries none (covered by a test).

## 8. Monte Carlo

Value, margin and P(win) are sampled from **beta-PERT** distributions: mean = (min + 4·mode + max)/6, α = 1 + 4(mode − min)/(max − min), β = 1 + 4(max − mode)/(max − min), sampled via two Gamma draws (Marsaglia–Tsang). PERT is preferred over triangular because it concentrates mass near the mode with soft tails. Outputs: P10/P50/P90 margin and EV, P(margin < 0), P(EV < 0), histogram. Seeded (mulberry32) so tests are deterministic. Test: PERT sample mean within 1 % of the analytic mean over 50,000 draws.

## 9. Capacity and cash

**Peak negative cash for one job** (first principles; no peer-reviewed constant exists):

```
PeakCash ≈ V × [ (L/D) × 1.6 + r × (1 − g) − f ]
```

L pay lag (months), D duration, r retention, g margin, f front-loading (deposit / mobilisation as a fraction of V); 1.6 ≈ peak-to-average burn of a standard S-curve. Shown as a ±25 % range.

**Retention / AR exposure across concurrent jobs** (`portfolioPeak()`): per-job logistic S-curves (Kenley–Wilson form) overlapped month by month, billing lagged and net of retention, retention returned at completion + lag. Gate if the exposure exceeds cash + undrawn credit line. For a general contractor this would be an elaborate portfolio-peak-cash model spanning many concurrent jobs; for a specialty subcontractor whose retention exposure is a fraction of a GC's, the same math is kept deliberately lightweight — a judgement call, revisit if the tool is used by a larger sub carrying more concurrent packages.

**Estimating and crew capacity** replace a general contractor's PM/superintendent/bonding gates: `capacityGates()` checks (a) retention/AR exposure vs cash + credit line, (b) no estimator *and* no installation crew assignable within maximum load, (c) working capital < 5 % of backlog + bid. Bonding-specific gates (single/aggregate bond limits) were part of the original general-contractor model and are dropped here — a specialty trade sub is occasionally bonded (see `ct_lien` and the `dk_bond` deal-killer for public work) but bonding capacity is not modelled as a first-class capacity gate, since it is materially less often the binding constraint than estimating/crew throughput for this business. That is a simplification worth revisiting if the tool is extended to a bonded, publicly-procured specialty trade with heavier bonding pressure.

## 10. US subcontractor payment and bond-claim law (replaces the AU/QLD regulatory model)

BidGate's predecessor scope modelled Queensland's QBCC/BIF Act regulatory regime in detail (MFR categories, PQC, Home Warranty Scheme, QLeave). That machinery is gone — the domain this tool now models is US-only. What replaces it is not a state-by-state regulatory engine (that would need per-state statute tracking well beyond what one criteria file can carry responsibly) but three US subcontractor-specific legal concepts encoded as criteria and their anchors:

- **Pay-if-paid vs pay-when-paid** (`ct_payifpaid`, a gate). A pay-if-paid clause makes the owner's payment to the GC a *condition precedent* to the GC's obligation to pay the subcontractor — if drafted unambiguously and enforceable in that state, non-payment by the owner can mean the sub is never paid at all. A pay-when-paid clause is read as a timing mechanism only (payment is due within a reasonable time regardless). Enforceability of pay-if-paid varies sharply by state — some courts void it as against public policy, others enforce it if the clause is unambiguous. This is the single largest subcontractor payment-risk clause in US construction law and is treated as a gate for that reason.
- **Miller Act / state "mini-Miller Act" bond-claim rights, and mechanics liens** (`ct_lien`). On federal public work, subcontractors have no lien right against government property; instead the Miller Act (40 U.S.C. §3131 et seq.) requires the prime contractor to post a payment bond, against which a sub with no direct contract with the government can claim if unpaid, subject to a notice deadline (typically 90 days from last furnishing labor/material) and a statute of limitations (one year from last furnishing). Most states have an analogous "mini-Miller Act" for state/local public work. On private work, mechanics-lien statutes (state-specific notice and filing deadlines) are the sub's security. Advance unconditional lien or bond-claim waivers signed before payment is actually received are the practice this criterion flags.
- **Retainage / retention flow-down** (`ct_retainage`, a floor). Several states cap retainage or require early release on substantially-complete trades, but practice varies; the criterion anchors are written to be checked against the specific subcontract and state rather than a hard-coded percentage.

None of these are modelled as automatic gate *constants* the way QBCC MFR thresholds were (there is no single number that is "the" US retainage cap or "the" pay-if-paid rule — it is state-by-state and clause-by-clause). Instead they are scored criteria with BARS anchors, consistent with how every other qualitative risk in this tool is handled, and the evidence lines point to the governing statute/concept rather than a specific number.

## 11. Materials & Installation (replaces Self-Perform & Shops)

The original tool's Self-Perform & Shops group modelled a vertically-integrated builder's owned trade shops: hours-based utilisation tracking, shop transfer pricing, and warranty framed as a profit centre through service contracts. None of that applies to a subcontractor whose whole scope *is* installation labour and material — there is no owned shop to load or idle, and subs do not typically run the service-contract business a vertically-integrated builder can.

The replacement group, Materials & Installation, is scored qualitatively like every other group (no separate hours-tracking widget):

- **Price/lead-time volatility** — who carries escalation risk between bid and install for commodity-linked materials (LVT resin, carpet-tile backing, synthetic-turf polymer).
- **Installer certification** — not every flooring crew can install synthetic turf or large-format porcelain to spec; manufacturer certification is the standard proxy trade qualification questionnaires use.
- **QC/moisture documentation** — a substrate-acceptance and moisture-test record (ASTM F710/F2170) that would defend a warranty claim.
- **Specialist-sub dependency** (specialty-surface preset only) — the sub-sub-dependency risk pattern carried over from the original tool's bespoke-scope criterion, narrowed to genuinely specialty scopes (turf infill suppliers, moisture-remediation subs).
- **Warranty/callback exposure by failure mode** — moisture-related delamination, grout/tile cracking, turf seam failure are the industry's named leading callback causes; this is a modest, honest exposure check, not the original tool's warranty-as-profit-centre framing (that was specific to a vertically-integrated builder's service-contract business).

## 12. Calibration loop

Record won / lost / withdrawn and actual margin on the Pipeline tab. The Calibration tab then shows:

- **Brier score** BS = (1/N)Σ(p − o)²; 0.25 = always saying 50 %.
- **Murphy decomposition** BS = reliability − resolution + uncertainty (grouped by unique forecast so the identity is exact).
- **Reliability diagram** with 5 bins, so each bin holds roughly ten or more outcomes in the first year of logging (10 bins would be noise).
- **Hit rate by count and by value**, by route and by verdict shown.
- **Criterion separation**: won-vs-lost mean score per criterion. Labelled *explore*, not *optimise*: Lowe & Parvar (2004, logistic, 94.8 %) and Leśniak et al. (2021, LDA, 86 %) show 6–8 firm-specific variables carry the signal — but only at ≥ 60 logged outcomes. Below 60, do not fit a model.
- **Override rate**: how often the recorded human decision disagreed with the tool.

## 13. Bias counters built into the UI

| Bias | Counter |
|---|---|
| Optimism / planning fallacy | Three-point inputs force a "high cost / low margin" case; base rates shown beside P(win) (Flyvbjerg's outside view) |
| Need-for-work | Backlog criterion anchors "< 1 month" as a *1* (rescaled for a specialty trade's shorter install cycles), and the mitigation text says to re-score with it zeroed |
| Winner's curse | Explicit flag; E[margin \| win] falls as P(win) rises |
| Sunk cost | Sunk estimating hours are never a reason to bid; EV is recomputed from scratch each time |
| Premature closure / groupthink | Pre-mortem required on GO; rotating devil's-advocate prompts; blind multi-rater is on the roadmap |
| Strategic misrepresentation | Override reason is mandatory when the decision disagrees with the verdict; override rate is reported |

## 14. What BidGate deliberately does not do

- It does not fit a regression or neural network (Wanous 2003's ANN gained 5 points over a parametric model at the cost of a black box).
- It does not use fuzzy or DEA models — no additional information at n = 1 firm.
- It does not send anything anywhere. localStorage and URL fragments only.
- It does not tell you to bid. It tells you what you would have to believe.

## References

- Aldossari, K. M. (2024). Exploring bid/no-bid decision factors of construction contractors. *Buildings* 14(10):3114.
- Bageis, A. S. & Fortune, C. (2009). Factors affecting the bid/no bid decision in the Saudi Arabian construction contractors. *CME* 27(1).
- Belton, V. & Gear, T. (1983). On a short-coming of Saaty's method of analytic hierarchies. *Omega* 11(3).
- Dyer, D. & Kagel, J. (1996). Bidding in common value auctions: how the commercial construction industry corrects for the winner's curse. *Management Science* 42(10).
- Elazouni, A. (2009). Heuristic method for multi-project finance-based scheduling. *CME* 27(2).
- Friedman, L. (1956). A competitive-bidding strategy. *Operations Research* 4(1).
- Gates, M. (1967). Bidding strategies and probabilities. *J. Constr. Div.* 93(1).
- Gilbride, T. & Allenby, G. (2004). A choice model with conjunctive, disjunctive, and compensatory screening rules. *Marketing Science* 23(3).
- Hughes, W. et al. (2006). *Procurement in the Construction Industry: The Impact and Cost of Alternative Market and Supply Processes.* Routledge.
- Leśniak, A. et al. (2021). Bid/no-bid decision using logistic regression and LDA. *Applied Sciences* 11(13):5973.
- Lowe, D. & Parvar, J. (2004). A logistic regression approach to modelling the contractor's decision to bid. *CME* 22(6).
- Meta-analysis (2022). Bid/no-bid decision factors: a meta-analysis of 24 studies. *Buildings* 12(3):379.
- Saaty, T. L. (1980). *The Analytic Hierarchy Process.* McGraw-Hill.
- Shash, A. (1993). Factors considered in tendering decisions by top UK contractors. *CME* 11(2).
- Skitmore, M. (2002). Predicting the probability of winning sealed bid auctions. *JORS* 53.
- Skitmore, M. & Ballesteros-Pérez, P. (2021). Bid dispersion in construction auctions. *JCEM*.
- Wanous, M., Boussabaine, H. & Lewis, J. (2000, 2003). To bid or not to bid: a parametric solution; a neural network bid/no-bid model. *CME* 18(4), 21(7).
- UK Government Analysis Function. *An introductory guide to MCDA.*
- Shipley Associates. Bid decisions; pursuit/bid/validation gates. shipleywins.com.
- SMPS / APEX. Go/No-Go checklist (0–10, 8 criteria, 56/80).
- PSMJ. Go/No-Go: pursuit cost > 10 % of revenue rule.
- Miller Act, 40 U.S.C. §3131 et seq. (federal public-work payment-bond claims).
- American Subcontractors Association (ASA). Pay-if-paid / pay-when-paid and back-charge pre-qualification guidance.
- AIA A401-2017; ConsensusDocs 750/751. Standard US subcontract forms and commentary.
- ASTM F710 / F2170. Standard test methods for substrate moisture (calcium chloride; in-situ relative humidity).
- ASTM F1936. Standard specification for shock-attenuating properties of athletic-surface systems (turf/track).
