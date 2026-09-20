# Research 05 — Decision-science rigour, UX/reporting, and open-source portfolio positioning for a bid go/no-go tool

Scope: single-file HTML/JS (Chart.js) bid-qualification tool for a small construction contractor (written before the rescope to a flooring / tile / specialty-surface subcontractor); published on GitHub Pages as a portfolio piece by an ops/estimating leader. v1 is a weighted 1–5 additive scorecard with RAG verdict, deal-killers, EV panel, bar+radar charts, presets, localStorage saved bids, CSV.

Headline verdict (blunt): v1 is a competent "simple scoring and weighting" tool, which the UK Government Analysis Function explicitly says is *not* a valid weighting approach and which HM Treasury's Green Book rejects ([GAF MCDA guide](https://analysisfunction.civilservice.gov.uk/policy-store/an-introductory-guide-to-mcda/)). The gap between v1 and "market-leading" is not more charts — it is (1) gates before scores, (2) swing-weighted or AHP-checked weights with anchored scales, (3) uncertainty made visible (tornado, Monte Carlo), and (4) a closed calibration loop against actual outcomes. Almost no free bid/no-bid tool does (3) or (4); that is the differentiator.

---

## PART A — Rigour module spec

### A1. Weighting: direct vs swing vs AHP

| Method | How | Pros | Cons | Verdict for this tool |
|---|---|---|---|---|
| Direct ("importance") weights (v1) | User types 1–10 importance per criterion | Fast, familiar | GAF: "Simple weighting is not a valid approach" — conflates importance with range of performance; criteria with narrow real-world swing get inflated weights ([GAF](https://analysisfunction.civilservice.gov.uk/policy-store/an-introductory-guide-to-mcda/)) | Keep as "Quick mode" only, labelled as such |
| Swing weighting | Rank the *swing from worst to best* on each criterion; give the biggest swing 100, others relative; normalise | Recommended by GAF ("The approach that should be used is swing weighting"); ties weight to the scale actually used; cheap to implement (one sortable list + sliders) | Needs the scale anchors defined first (see A3) | **Default in Expert mode** |
| AHP pairwise (Saaty) | n(n−1)/2 pairwise 1–9 judgements → priority vector → consistency ratio | Forces explicit trade-offs; CR flags incoherent judgement; widely used in construction bid/no-bid literature | 8 criteria = 28 comparisons (fatigue); rank reversal when near-copies of alternatives are added — Belton & Gear 1983, still debated ([Wikipedia: rank reversals](https://en.wikipedia.org/wiki/Rank_reversals_in_decision-making)); Saaty's 1–9 scale is ordinal-ish being treated as ratio | Offer as optional "Derive weights by pairwise comparison" wizard; use it to *derive and sanity-check* weights, not as the scoring model |

Lightweight browser AHP implementation (no eigen library needed):
1. Build reciprocal matrix A (a_ji = 1/a_ij).
2. Priority vector w_i = geometric mean of row i, normalised to sum 1.
3. λmax ≈ mean over i of (A·w)_i / w_i.
4. CI = (λmax − n)/(n − 1); CR = CI / RI(n); RI table (Saaty): n=3 0.58, 4 0.90, 5 1.12, 6 1.24, 7 1.32, 8 1.41, 9 1.45, 10 1.49; warn if CR > 0.10 ([SpiceLogic AHP CR](https://spicelogic.com/docs/ahp-software/intro/ahp-consistency-ratio-transitivity-rule-388); [Saaty RI table](https://www.researchgate.net/figure/Random-Index-RI-Saaty-1980_tbl2_323905554)).
UI pattern: show the CR as a small meter next to the derived weights; highlight the single pairwise cell whose change would most reduce CR ("your judgement that Margin ≫ Client relationship conflicts with Client ≫ Complexity").

### A2. Compensatory vs non-compensatory: deal-killers must be gates

An additive scorecard is a compensatory model: strengths offset weaknesses ([NN/g](https://www.nngroup.com/articles/compensatory-noncompensatory-decisions/)). A "client can't pay" item scored 1/5 can be buried by four 5/5s — which is precisely the failure mode of every homemade bid matrix. The literature on consideration sets (Gilbride & Allenby 2004, *Marketing Science*) formalises the fix: **conjunctive screening** — every alternative must pass all "must" thresholds before compensatory scoring is even computed ([Gilbride & Allenby](https://pubsonline.informs.org/doi/10.1287/mksc.1030.0032); [Hauser et al. review](https://mitsloan.mit.edu/shared/ods/documents?DocumentID=4054)). NN/g notes people naturally do this two-stage filter-then-compare and design should mirror it.

Spec:
- Stage 1 **Gates** (binary or threshold): client ability to pay verified; scope clarity ≥ 3; contract form acceptable; cash-flow terms acceptable; licence/insurance coverage; capacity in the delivery window. These map to the top-ranked factors in the 2024 MDPI survey of 112 contractors (client ability to pay RII 93.4, scope clarity 91.9, project cash flow 91.5, need for work 90.7, labour availability 90.4) ([MDPI Buildings 2024](https://www.mdpi.com/2075-5309/14/10/3114)).
- Any gate fail → verdict is **NO-GO (gated)** regardless of score; score still computed and shown greyed with "would have been AMBER 68" so the user learns what the gate is protecting them from.
- Stage 2 **Compensatory score** only for passing bids.
- Stage 3 **Minimum-per-criterion floor** (optional non-compensatory soft rule): any criterion ≤ 2 caps verdict at AMBER ("weakest-link rule").

### A3. Behaviourally anchored rating scales (BARS)

A bare 1–5 with no anchors invites leniency and rater drift. BARS development = critical incidents → retranslation → scaling ([AIHR BARS guide](https://www.aihr.com/blog/behaviorally-anchored-rating-scale/)). Rules for writing anchors: concrete, observable, verifiable, no adjectives of degree ("strong", "good"); each level describes a *state of the world*, not an opinion. Example for "Scope clarity":
- 5: Full construction docs + specs + geotech; addenda closed; ≤ 5 open RFIs.
- 3: DA-level drawings, spec by reference; key selections unresolved; allowances required for > 10% of value.
- 1: Sketch/brief only; scope to be "developed with the builder"; no site info.
Every criterion in every preset should ship with 5 anchors, shown inline as the user hovers/focuses the score (progressive disclosure). Anchors are also the precondition for swing weighting.

### A4. Multi-rater calibration

If estimator, construction manager and GM each score, show per-criterion spread (min–max band on the bar chart) and a simple agreement index. Fleiss' kappa / ICC are the formal measures ([Wikipedia IRR](https://en.wikipedia.org/wiki/Inter-rater_reliability)); in a browser tool a plain "max−min ≥ 2 → flag for discussion" is more useful than a kappa nobody reads. Evidence from rater-training literature: collaborative calibration sessions on shared anchors raise agreement ([ERIC ED626350](https://eric.ed.gov/?id=ED626350)). UI: "Committee mode" — each rater scores blind (separate localStorage keys or JSON import), then a reveal shows divergences first.

### A5. Sensitivity analysis: tornado + "what would flip the verdict"

- **One-at-a-time tornado**: for each criterion, recompute total score with that score at 1 and at 5 (or weight at ±50%); bar length = swing; sort descending; overlay the GO and NO-GO thresholds as vertical lines ([TreeAge tornado](https://www.treeage.com/tornado-diagram-sensitivity-analysis/); [SumProduct](https://sumproduct.com/thought/tornado-charts/)). GAF: concentrate on whether *rankings/verdicts* change, not on score deltas.
- **Switching values**: solve for the minimum change in each single input that crosses the verdict threshold; render as plain sentences: "Verdict flips to NO-GO if Margin drops from 4 to 2, or if Client relationship weight falls below 12%." This is the highest-value, cheapest rigour feature in the whole spec.
- **Weight-perturbation robustness**: sample 1,000 random weight vectors within ±20% of stated weights (Dirichlet or clipped uniform, renormalised); report "GO in 87% of plausible weightings".

### A6. Monte Carlo on margin and P(win) in-browser

Inputs as three-point estimates (low / most likely / high) for: contract value, direct cost, prelims, variations recovery, and P(win). Prefer **beta-PERT** over triangular: mean = (min + 4·mode + max)/6; PERT places progressively more mass near the mode and less at tails, triangular over-weights the mode and has hard linear tails ([RiskAMP beta-PERT](https://www.riskamp.com/beta-pert/); [Wikipedia three-point](https://en.wikipedia.org/wiki/Three-point_estimation)). Implementation: shape α = 1 + 4(mode−min)/(max−min), β = 1 + 4(max−mode)/(max−min); sample Beta via two Gamma draws (Marsaglia–Tsang) — ~40 lines of JS, no library. 10,000 iterations is instant. Outputs: P(margin < 0), P10/P50/P90 margin, EV = P(win)·E[margin] − bid cost, and a histogram with the P10–P90 band shaded. Guesstimate does exactly this pattern (5,000 samples per change, distribution drawn behind the number) and is the design reference ([guesstimate-app, 2.4k stars, MIT](https://github.com/getguesstimate/guesstimate-app)).

Displaying uncertainty: never show a bare point estimate where a range exists; show "P50 $84k (P10 $12k – P90 $141k)"; colour the gauge by P(margin<0) rather than by mean margin.

### A7. Decision audit trail

Every saved bid stores: `decidedBy`, `decidedAt`, `verdictShown`, `verdictTaken` (committee can override), `overrideReason` (mandatory if they differ), `weightsSnapshot`, `presetVersion`, `notes`. Rendering the divergence between *tool verdict* and *human verdict* over time is itself a calibration signal (are overrides usually right?). Borrow the ADR pattern: Context / Decision / Consequences ([adr.github.io](https://adr.github.io/)).

### A8. Post-mortem calibration loop

Record outcome per bid: won / lost / withdrawn / no-bid, actual margin at completion, and (if known) competitor count and winning price. Then:
- **Brier score** on stated P(win): BS = (1/N)Σ(p_i − o_i)²; 0 perfect, 0.25 = always saying 50% ([Convexly](https://www.convexly.app/answers/how-to-measure-forecasting-calibration)). Murphy decomposition (reliability − resolution + uncertainty) tells you whether you are miscalibrated or merely undiscriminating.
- **Reliability diagram**: bin stated P(win) into 5 bins (not 10 — a small builder will have < 50 bids/year), plot observed win frequency vs bin midpoint against the 45° line; below the line = overconfident. Show bin counts as bubble size so a bin with n=2 is visibly weak.
- **Base rates**: display the firm's own historical win rate by work type next to the P(win) input (Flyvbjerg's "outside view" — three steps: pick reference class, get its distribution, place this bid in it) ([Flyvbjerg, arXiv 1302.3642](https://arxiv.org/pdf/1302.3642)). Industry defaults for cold start, flagged as directional not evidence: hard-bid public 10–20%, private competitive 15–25%, negotiated 30–50%, repeat client 50%+ ([ConstructConnect](https://www.constructconnect.com/blog/bid-hit-ratio-commercial-gcs-2026) — the article itself says "no single published benchmark").
- **Re-tuning weights** (keep it honest): with < 100 outcomes, do not fit a regression — it will overfit and look like science. Instead: (a) show mean score-by-criterion for won vs lost vs withdrawn bids and for positive- vs negative-margin bids; (b) let the user drag weights while watching a "hindsight accuracy" counter (how many past verdicts the new weights would have got right). Label this "explore", not "optimise".
- Hubbard's data: untrained people hit 52–55% inside their "90%" intervals; after training 78–85% ([Hubbard Decision Research](https://hubbardresearch.com/category/facilitating-calibrated-estimates/)) — this is vendor data, but consistent with Tetlock's tournament findings. Ship a 10-question calibration quiz on the firm's own past bids as onboarding.

### A9. Biases and design counters

| Bias | Where it bites bids | Counter in the UI | Source |
|---|---|---|---|
| Optimism bias / planning fallacy | Margin and duration estimates | Reference-class base rates shown next to inputs; PERT forces a "high" cost | Flyvbjerg: rail 44.7% avg overrun, roads 20.4%, no improvement in 70 years ([arXiv](https://arxiv.org/pdf/1302.3642)) |
| Strategic misrepresentation | Estimator shades numbers to win internal approval | Blind multi-rater mode; audit trail of overrides | Flyvbjerg, same |
| Need-for-work | Bidding anything when the book is thin | "Need for work" is a *separate declared input*, not folded into scores; tool shows how verdict changes with it set to zero | MDPI 2024: need for work ranked 4th (RII 90.7) vs 8th–43rd in earlier studies ([MDPI](https://www.mdpi.com/2075-5309/14/10/3114)) |
| Winner's curse | Winning because you were the most optimistic estimator | Show "expected profit *conditional on winning*" with competitor-count adjustment; P(win) ↑ should visibly pull E[margin|win] ↓ | Kellogg, "Learning to avoid the winner's curse" ([Kellogg](https://www.kellogg.northwestern.edu/academics-research/research/detail/1996/learning-to-avoid-the-winners-curse)) |
| Sunk cost | Continuing because tender prep is 60% done | Bid-cost-to-date is shown but excluded from EV; explicit "cost to complete" field | Standard; Kahneman *Thinking, Fast and Slow* |
| Anchoring | First score colours the rest | Randomise criterion order per session (opt-in); hide running total until all scored | Kahneman |
| Overconfidence | 90% ranges that hold 55% of the time | Calibration quiz; reliability diagram | Hubbard; Tetlock |
| Groupthink / HiPPO | GM scores first, room follows | Blind committee mode; reveal divergences first | Kahneman & Sibony "decision hygiene" ([Uncertainty Project](https://www.theuncertaintyproject.org/threads/applying-decision-hygiene-to-yield-better-judgment)) |
| Premature closure | Nobody voices the downside | **Pre-mortem prompt** on any GO: "It is 18 months on and this job lost money. Write three reasons." Prospective hindsight raised reasons identified by ~30% (Mitchell, Russo & Pennington 1989; popularised by Klein HBR 2007, endorsed by Kahneman) ([Wikipedia](https://en.wikipedia.org/wiki/Pre-mortem); [alfred_ summary of the 30% claim](https://get-alfred.ai/blog/pre-mortem-technique)) — note the 30% is a single 1989 lab study, not a construction field result |

Devil's-advocate prompt: on GO, rotate one of ~12 stored questions ("Which crew is already at capacity in this window?", "What does the client's last builder say?"). Cheap, memorable, demonstrably behavioural-science-literate.

---

## PART B — UX / dashboard / reporting spec (prioritised)

Priority key: P0 = ship before calling it "market-leading"; P1 = next; P2 = nice.

**P0**
1. **One-page Go/No-Go decision memo (print/PDF via CSS `@media print`)**. Structure used by bid committees (synthesised from Shipley capture-planning and Loopio's template, which scores 8 factors 1–4 and uses a 2.5 mean threshold ([Loopio](https://loopio.com/resources/go-no-go-decision-template-rfp-responses/); [Shipley capture planning](http://sbdl.shipleywins.com/files/documents/8/Capture%20Planning_CG%20v3.0.pdf))): header (project, client, value, due date, decision date, deciders) → verdict banner with gate status → three-line "why" (top strengths / top weaknesses / switching values) → scorecard table with anchors met → EV & margin distribution (P10/P50/P90) → risks & mitigations (from weakest-link prompts) → pre-mortem answers → decision, override reason, signatures. One page, no charts that don't survive greyscale.
2. **Gates panel above scores** (A2) with clear "gated NO-GO" state.
3. **Switching values in words** (A5). This replaces half the need for a tornado for non-expert users.
4. **Colour-blind-safe RAG with redundant encoding**: Okabe-Ito palette (vermilion #D55E00, orange #E69F00, bluish-green #009E73, blue #0072B2 …) plus icon/text (✕ / ! / ✓ and the word) — dual-encode because "a CVD viewer who prints in greyscale still reads the figure correctly" ([Okabe-Ito reference](https://sci-draw.com/blog/colorblind-safe-palettes-okabe-ito-reference)). WCAG 1.4.1 forbids colour as the only carrier of meaning.
5. **Keyboard-first scoring**: number keys 1–5 set the focused criterion, Tab/↓ advance, `?` shows anchors, `Ctrl+Enter` saves. WCAG 2.2 AA additions relevant here: 2.4.11 Focus Not Obscured, 2.5.8 Target Size ≥ 24×24 CSS px, 3.3.7 Redundant Entry, 3.2.6 Consistent Help; 2.4.13 Focus Appearance is AAA — aim for it anyway ([W3C What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/); a popular vendor summary mislabels several levels — cite W3C, not blogs ([wcag.com](https://www.wcag.com/blog/wcag-2-2-aa-summary-and-checklist-for-website-owners/))).
6. **Chart accessibility**: Chart.js canvases need `role="img"` + `aria-label` and fallback content; add a visually-hidden or toggleable data table under every chart ([Chart.js accessibility](https://www.chartjs.org/docs/latest/general/accessibility.html)).
7. **Shareable state**: JSON export/import (whole workspace, schema-versioned) and a `#state=` URL hash compressed with lz-string so a bid can be sent by email/Teams with no server ([Scott Antipa, state in URLs](https://www.scottantipa.com/store-app-state-in-urls); [lz-string](https://smartdevbox.com/glossary/what-is-lz-string)). Local-first privacy statement in the UI footer: "nothing leaves your browser".
8. **Onboarding + sample data**: three pre-loaded sample bids (a clear GO, a gated NO-GO, a marginal AMBER) so the empty state is never empty; "Load samples / Start blank" on first run.

**P1**
9. **Tornado chart** (horizontal bar, Chart.js `indexAxis:'y'`, two datasets for low/high) with threshold lines via annotation plugin.
10. **Side-by-side comparison** (2–4 bids, columns aligned; NN/g: cap compensatory comparison at ~5 items ([NN/g](https://www.nngroup.com/articles/compensatory-noncompensatory-decisions/))).
11. **Pipeline bubble chart**: x = P(win), y = attractiveness score, bubble = contract value; overlay the GE/McKinsey 3×3 with the classic advice per cell (invest / select / harvest) ([McKinsey, Enduring Ideas](https://www.mckinsey.com/capabilities/strategy-and-corporate-finance/our-insights/enduring-ideas-the-ge-and-mckinsey-nine-box-matrix)). Label the two axes explicitly as *attractiveness* (margin, fit, strategic value) vs *winnability* (relationship, competition, price position) — these are two different criterion subsets; the current single total conflates them.
12. **Criteria heat map across bids** (Chart.js matrix plugin or plain CSS grid with Okabe-Ito sequential ramp) — reveals systematic weakness ("we always score 2 on cash-flow terms").
13. **Weakest-link cards with mitigation prompts**: for each criterion ≤ 2, show a stored mitigation library entry ("Cash-flow terms: propose deposit + fortnightly claims; price the finance cost").
14. **Monte Carlo panel** (A6) behind an "Expert" toggle.
15. **Progressive disclosure**: Simple mode (gates + scores + verdict + memo) vs Expert (swing weights, AHP wizard, tornado, Monte Carlo, calibration). Progressive disclosure defers advanced features to a secondary layer to reduce error and learning time ([IxDF](https://ixdf.org/literature/topics/progressive-disclosure)).
16. **Calibration dashboard** (A8): reliability diagram, Brier trend, won/lost/withdrawn by verdict.

**P2**
17. Gauge (only if it encodes P(loss) or verdict robustness — a gauge of the raw score adds nothing over the banner).
18. Localisation: `Intl.NumberFormat` for AUD/USD, `Intl.DateTimeFormat` for dd/mm/yyyy vs mm/dd, m²/ft² toggle stored in settings; default `en-US`.
19. Mobile: single-column, sticky verdict bar, 44px targets; scoring on a phone at a site visit is a real use case.
20. Empty-state copy for every view (no bids, no outcomes yet, no comparison selected).

Design references: Guesstimate (uncertainty drawn behind the number) ([repo](https://github.com/getguesstimate/guesstimate-app)); it-tools (clean tool-per-card UX, 40k stars) ([README](https://github.com/CorentinTh/it-tools/blob/main/README.md)); Decision Frameworks' tornado guidance ([blog](https://decisionframeworks.com/blog/how-to-build-and-interpret-tornado-diagrams-for-sensitivity-analysis)); Zeiss DecisionMatrixHelper for "justification per rating" and crash-recovery autosave ([repo](https://github.com/zeiss-digital-innovation/DecisionMatrixHelper)).

---

## PART C — Open-source portfolio positioning

### C1. What the audience actually evaluates (evidence quality: weak)

There is no rigorous survey of how non-engineer hiring managers assess repos; the available material is practitioner opinion. The consistent claims: 3–5 well-documented projects beat many; README must state the problem, the intended user, key decisions, screenshots/GIF, iteration/lessons learned, and business relevance ("improved efficiency… operational challenges" rather than tutorial clones) ([SOLTECH](https://soltech.net/what-do-hiring-managers-actually-look-for-in-a-github-portfolio/) — one staffing firm's opinion, no data; similar from [Reczee](https://www.reczee.com/blog/what-do-hiring-managers-see-on-my-github-profile), [Instahyre](https://resources.instahyre.com/blog/github-profile-checklist/)). For the Microsoft "Frontier Firm" framing, the 2025 Work Trend Index (marketing, self-reported survey) prizes people who "build, delegate to, and manage agents" and who can judge human-vs-agent task allocation ([Microsoft WTI 2025](https://www.microsoft.com/en-us/worklab/work-trend-index/2025-the-year-the-frontier-firm-is-born)). Implication: the repo must read as *a domain expert who encoded judgement into a tool and measured it*, not as a coding exercise. The METHODOLOGY.md and calibration loop are the résumé; the JavaScript is incidental.

### C2. Exemplar repos — what they do well

| Repo | Stars (fetched Sep 2026) | Take from it |
|---|---|---|
| [getguesstimate/guesstimate-app](https://github.com/getguesstimate/guesstimate-app) | 2.4k, MIT | Uncertainty as first-class UI; README opens with purpose then GIF walkthroughs; 5,000-sample Monte Carlo on every edit |
| [quantified-uncertainty/squiggle](https://github.com/quantified-uncertainty/squiggle) | (monorepo) | Estimation-as-code; public model library — pattern for a `/models` folder of preset scorecards |
| [TiddlyWiki/TiddlyWiki5](https://github.com/TiddlyWiki/TiddlyWiki5) | 8.7k | Proof that single-HTML-file, local-first apps can be serious software; strong governance docs (CONTRIBUTING, CoC) |
| [CorentinTh/it-tools](https://github.com/corentinth/it-tools) | 40.1k, GPLv3 | Tagline + live demo first; roadmap via issues; explicit self-host section; but *no screenshots* — a gap you can beat |
| [dkalinchenko/rationalize.io](https://github.com/dkalinchenko/rationalize.io) | 7 | Vanilla JS Pugh matrix with sensitivity analysis and custom domain; author literally ships their résumé in the repo — the portfolio intent is naked; copy the intent, not the execution |
| [ilovefreesw/WeightedDecisionMatrix](https://github.com/ilovefreesw/WeightedDecisionMatrix) | 2, MIT | Methodology written in the README (formula + 6-step process); GitHub Pages demo; zero tests — typical of the category |
| [zeiss-digital-innovation/DecisionMatrixHelper](https://github.com/zeiss-digital-innovation/DecisionMatrixHelper) | 0 | Wizard flow, justification per rating, autosave with crash recovery, alternatives-first vs criteria-first paths; over-engineered stack (Quasar/TS/Docker) with no demo — shows that stack ≠ traction |
| [adr/madr](https://github.com/adr/madr) | — | The ADR template to adopt |
| [olivierlacan/keep-a-changelog](https://github.com/olivierlacan/keep-a-changelog) | — | CHANGELOG format |

Blunt observation: the "decision matrix" category on GitHub is a graveyard of 0–10-star repos with no tests, no methodology, no outcome loop ([GitHub topic: decision-making](https://github.com/topics/decision-making?l=html&o=asc&s=forks)). The bar to be the best bid/no-go tool on GitHub is low; the bar to look credible to a GM is "did you close the loop on real outcomes".

### C3. Repo blueprint

```
bid-qualifier/
├─ index.html                 # single-file app; imports ./src/*.js as ES modules (still zero build)
├─ src/
│  ├─ scoring.js              # pure: gates(), weightedScore(), verdict(), switchingValues()
│  ├─ weights.js              # pure: swingWeights(), ahpPriorities(), consistencyRatio()
│  ├─ montecarlo.js           # pure: betaPert(), simulate(), percentiles()
│  ├─ calibration.js          # pure: brier(), murphyDecomposition(), reliabilityBins()
│  ├─ memo.js                 # renders decision memo HTML
│  ├─ storage.js              # localStorage + JSON schema versioning + URL hash (lz-string)
│  └─ ui.js                   # DOM/Chart.js wiring only
├─ presets/                   # multifamily.json, commercial-ti.json, specialty-turf.json (with BARS anchors)
├─ samples/                   # sample-bids.json (GO / gated NO-GO / AMBER) + sample-outcomes.json
├─ tests/                     # Vitest: scoring.test.js, weights.test.js (CR against Saaty worked example),
│                             #   montecarlo.test.js (mean ≈ PERT mean), calibration.test.js (Brier known values)
├─ docs/
│  ├─ METHODOLOGY.md          # gates→swing weights→BARS→score→sensitivity→MC→calibration; formulas; sources
│  ├─ adr/                    # 0001-single-file-no-build.md … (MADR)
│  └─ screenshots/, demo.gif
├─ .github/workflows/ci.yml   # npm test → deploy Pages on main
├─ README.md  CHANGELOG.md  CONTRIBUTING.md  LICENSE  SECURITY.md  CITATION.cff
```

Keeping `index.html` single-file while testing pure functions: use `<script type="module">` importing `./src/*.js` (works on GitHub Pages with no bundler); Vitest runs the same modules in Node ([Vitest](https://github.com/vitest-dev/vitest); CI badge via [vitest-badge-action](https://github.com/marketplace/actions/vitest-badge-action) or a plain workflow status badge). If the owner insists on one literal file, keep a 30-line `build.sh` that inlines modules — and record that as an ADR.

**README outline**: tagline (one sentence, domain first: "Go/No-Go for flooring, tile & specialty-surface subcontractors — gates, weighted score, margin Monte Carlo, and a calibration loop, in one HTML file"); badges (CI, licence, Pages, "no tracking"); live demo link + 20-second GIF; the problem (need-for-work bias, compensatory scorecards hide deal-killers, nobody records outcomes); features (grouped Simple/Expert); methodology summary linking METHODOLOGY.md; architecture + why single-file (link ADR-0001); decisions & trade-offs; roadmap; "why I built this" (2 paragraphs, first person, operational credibility); privacy; contributing; licence.

**ADR list** (MADR format: Context / Decision drivers / Options / Outcome / Consequences ([adr.github.io templates](https://adr.github.io/adr-templates/))): 0001 single-file, no build; 0002 gates precede compensatory score; 0003 swing weighting default, AHP optional; 0004 beta-PERT not triangular; 0005 localStorage + URL hash, no backend; 0006 Okabe-Ito + icon dual encoding; 0007 optional BYOK AI layer is client-side only; 0008 MIT licence.

**Licence**: MIT vs Apache-2.0 — Apache adds an explicit patent grant and NOTICE handling; for a small tool with no patent exposure, MIT is the community default and lowest friction ([FOSSHub comparison](https://www.fosshub.com/resources/licensing/mit-vs-apache/); [Safeguard](https://safeguard.sh/resources/blog/mit-license-vs-apache-2-0-which-to-pick)). Pick MIT; record in ADR-0008.

**Versioning & changelog**: SemVer; Keep a Changelog 1.0.0 with `Unreleased` section and Added/Changed/Deprecated/Removed/Fixed/Security groups ([keepachangelog.com](https://keepachangelog.com/en/1.0.0/)). Treat a preset schema change as a MAJOR bump — that is the honest signal to users with saved bids.

**Test plan** (pure functions only; ~40 tests): gate fail forces NO-GO regardless of score; additive score with known weights; switching value returns the smallest flipping delta; AHP CR reproduces Saaty's textbook example within 0.01; RI table lookup; PERT sample mean within 1% of (a+4m+b)/6 over 50k draws; Brier of all-0.5 forecasts = 0.25; reliability bins sum to N; JSON schema migration v1→v2; lz-string round-trip.

### C4. Optional AI layer without overclaiming

Pattern: "Paste tender → pre-score with quoted evidence". Client-side only, bring-your-own-key stored in `sessionStorage` (not localStorage), never sent anywhere but the model vendor. Anthropic's API allows direct browser calls with the `anthropic-dangerous-direct-browser-access: true` header — the name is a deliberate warning that a key in the browser is the user's key at the user's risk, which is exactly the BYOK posture ([Simon Willison](https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access/); [DEV BYOK example](https://dev.to/sendotltd/calling-the-anthropic-api-directly-from-the-browser-a-150-line-byok-comparison-tool-for-opus--nh)). Design rules that keep it honest: the model may only *propose* a score per criterion and must return a verbatim quote from the pasted text as evidence, or "no evidence found"; the user accepts/rejects each proposal; accepted AI proposals are tagged in the audit trail; gates are never AI-set. Document-QA hallucination rates are non-trivial and rise with context length ([arXiv 2603.08274](https://arxiv.org/html/2603.08274v1)), so the README should say "drafts, cites, never decides" and show a screenshot of a rejected proposal. This is the feature that speaks directly to the "agent boss" framing in the Microsoft material — human sets the rubric and gates, agent does the reading, human keeps the decision.

---

## Marketing vs evidence flags

- **Evidence**: GAF/Green Book rejection of simple weighting; Saaty CR formula and RI table; Gilbride & Allenby conjunctive screening; Flyvbjerg overrun statistics; Brier/Murphy decomposition; MDPI 2024 contractor factor ranking (n=112, Saudi).
- **Weak / single-study**: pre-mortem "30%" (one 1989 lab study); Hubbard's 52%→78% calibration gains (vendor data).
- **Marketing / directional**: ConstructConnect win-rate ranges (self-described as directional); Microsoft Frontier Firm statistics (self-reported survey, product marketing); all "what recruiters look for" articles (practitioner opinion, no surveys).

## Sources
- https://analysisfunction.civilservice.gov.uk/policy-store/an-introductory-guide-to-mcda/
- https://spicelogic.com/docs/ahp-software/intro/ahp-consistency-ratio-transitivity-rule-388
- https://www.researchgate.net/figure/Random-Index-RI-Saaty-1980_tbl2_323905554
- https://en.wikipedia.org/wiki/Rank_reversals_in_decision-making
- https://www.nngroup.com/articles/compensatory-noncompensatory-decisions/
- https://pubsonline.informs.org/doi/10.1287/mksc.1030.0032
- https://mitsloan.mit.edu/shared/ods/documents?DocumentID=4054
- https://www.mdpi.com/2075-5309/14/10/3114
- https://www.aihr.com/blog/behaviorally-anchored-rating-scale/
- https://eric.ed.gov/?id=ED626350
- https://en.wikipedia.org/wiki/Inter-rater_reliability
- https://www.treeage.com/tornado-diagram-sensitivity-analysis/
- https://sumproduct.com/thought/tornado-charts/
- https://decisionframeworks.com/blog/how-to-build-and-interpret-tornado-diagrams-for-sensitivity-analysis
- https://www.riskamp.com/beta-pert/
- https://en.wikipedia.org/wiki/Three-point_estimation
- https://www.convexly.app/answers/how-to-measure-forecasting-calibration
- https://arxiv.org/pdf/1302.3642
- https://www.constructconnect.com/blog/bid-hit-ratio-commercial-gcs-2026
- https://hubbardresearch.com/category/facilitating-calibrated-estimates/
- https://www.kellogg.northwestern.edu/academics-research/research/detail/1996/learning-to-avoid-the-winners-curse
- https://www.theuncertaintyproject.org/threads/applying-decision-hygiene-to-yield-better-judgment
- https://en.wikipedia.org/wiki/Pre-mortem
- https://get-alfred.ai/blog/pre-mortem-technique
- https://loopio.com/resources/go-no-go-decision-template-rfp-responses/
- http://sbdl.shipleywins.com/files/documents/8/Capture%20Planning_CG%20v3.0.pdf
- https://sci-draw.com/blog/colorblind-safe-palettes-okabe-ito-reference
- https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- https://www.wcag.com/blog/wcag-2-2-aa-summary-and-checklist-for-website-owners/
- https://www.chartjs.org/docs/latest/general/accessibility.html
- https://www.scottantipa.com/store-app-state-in-urls
- https://smartdevbox.com/glossary/what-is-lz-string
- https://ixdf.org/literature/topics/progressive-disclosure
- https://www.mckinsey.com/capabilities/strategy-and-corporate-finance/our-insights/enduring-ideas-the-ge-and-mckinsey-nine-box-matrix
- https://soltech.net/what-do-hiring-managers-actually-look-for-in-a-github-portfolio/
- https://www.reczee.com/blog/what-do-hiring-managers-see-on-my-github-profile
- https://resources.instahyre.com/blog/github-profile-checklist/
- https://www.microsoft.com/en-us/worklab/work-trend-index/2025-the-year-the-frontier-firm-is-born
- https://github.com/getguesstimate/guesstimate-app
- https://github.com/quantified-uncertainty/squiggle
- https://github.com/TiddlyWiki/TiddlyWiki5
- https://github.com/CorentinTh/it-tools/blob/main/README.md
- https://github.com/dkalinchenko/rationalize.io
- https://github.com/ilovefreesw/WeightedDecisionMatrix
- https://github.com/zeiss-digital-innovation/DecisionMatrixHelper
- https://github.com/topics/decision-making?l=html&o=asc&s=forks
- https://adr.github.io/ and https://adr.github.io/adr-templates/
- https://github.com/adr/madr
- https://keepachangelog.com/en/1.0.0/
- https://www.fosshub.com/resources/licensing/mit-vs-apache/
- https://safeguard.sh/resources/blog/mit-license-vs-apache-2-0-which-to-pick
- https://github.com/vitest-dev/vitest
- https://github.com/marketplace/actions/vitest-badge-action
- https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access/
- https://dev.to/sendotltd/calling-the-anthropic-api-directly-from-the-browser-a-150-line-byok-comparison-tool-for-opus--nh
- https://arxiv.org/html/2603.08274v1
