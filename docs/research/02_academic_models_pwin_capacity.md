# 03 — Academic Bid/No-Bid Models, P(win) & Pricing Theory, Capacity & Portfolio

Research slice for an open-source go/no-go tool for a small construction contractor. Written before the tool was rescoped to a flooring / tile / specialty-surface subcontractor; the bid/no-bid literature, P(win) theory and cost-to-bid benchmarks are domain-general, while the owned-shop capacity inputs in §Capacity were dropped in the rescope. Research only; no code. Where a claim rests on vendor/consultant material rather than peer review, it is flagged **[vendor]** or **[consultant]**.

Access note: ASCE, Taylor & Francis and Emerald abstracts were blocked (403) from this environment; where I could not read the primary, I cite it and the secondary source I actually read.

---

## PART A — Academic bid/no-bid literature

### A1. Study-by-study extraction

| Study | Sample / method | Factors | What they found (top-ranked) |
|---|---|---|---|
| **Ahmad & Minkarah (1988)**, J. Mgmt Eng 4(3):229 — [DOI](https://ascelibrary.org/doi/10.1061/(ASCE)9742-597X(1988)4:3(229)) | 90 US top-400 contractors, questionnaire, importance ranking | 31 | Type of job, size of job, need for work, owner, historic profit, degree of hazard, location (as summarised in [Buildings 2019 9(2):33](https://mdpi.com/2075-5309/9/2/33/htm)). Pure ranking survey; no decision model. The meta-analysis calls it "the pioneering work" ([Buildings 2022 12(3):379](https://www.mdpi.com/2075-5309/12/3/379/html)). |
| **Shash (1993)**, CME 11(2):111 — [DOI](https://www.tandfonline.com/doi/abs/10.1080/01446199300000004) | 85 top UK contractors, questionnaire | 55 | Three dominant: **need for work, number of competitors tendering, experience on such projects**; also current workload, owner identity, contract conditions, project type, past profit on similar work, project size, tendering duration ([secondary](https://www.ijirset.com/upload/2017/december/116_Paper%20Manuscript%20_1_.pdf)). Ranking survey only. |
| **Wanous, Boussabaine & Lewis (1998/2000)**, CME 18(4) — [DOI](https://www.tandfonline.com/doi/abs/10.1080/01446190050024879); factor survey in [ARCOM 1998 PDF](https://www.arcom.ac.uk/-docs/proceedings/ar1998-535-543_Wanous_Boussabaine_and_Lewis.pdf) | 61 Syrian contractors; **parametric model** (importance-weighted additive "bidding index") optimised on 162 real bids, tested on 20 | 38 | Importance index Ij = (Mj/6)×100. Top: fulfilling client's to-tender conditions (89.9), client financial capability (77.7), relations/reputation of client (76.8), project size (73.2), time available for tendering (70.8), capital required (68.3), site clearance (68.0), public objection (67.8), materials availability (66.3), current workload (65.8). Model 85% accurate on holdout ([Bristol abstract](https://research-information.bris.ac.uk/en/publications/to-bid-or-not-to-bid-a-parametric-solution)). |
| **Wanous et al. (2003)**, CME 21(7):737 — [abstract](https://ideas.repec.org/a/taf/conmgt/v21y2003i7p737-744.html) | Back-prop ANN, 18 inputs, trained on 157 bids, 20 test | 18 | 90% accurate on 20 holdout (2 errors). Marginal gain over the 85% parametric model for a black box — this matters for your choice. |
| **Chua & Li (2000)**, JCEM 126(5):349 — [DOI](https://ascelibrary.org/doi/10.1061/(ASCE)0733-9364(2000)126:5(349)) | Singapore; structures factors under reasoning "subgoals" (competition, risk, company position, need for work) | — | Primary blocked; cited via [Cheng et al. 2011](https://journals.vilniustech.lt/index.php/JCEM/article/download/5239/4529). Value: the *hierarchical subgoal* framing, later reused by Egemen & Mohamed. |
| **Lowe & Parvar (2004)**, CME 22(6):643 — [abstract](https://researchportal.hw.ac.uk/en/publications/a-logistic-regression-approach-to-modelling-the-contractors-decis/) | One UK contractor's historic bid-opportunity records; pro-forma + factor analysis + **logistic regression** | 8 significant variables | Model classified 94.8% of sample correctly. Excluded from the 2022 meta-analysis because it is a single-firm case, not an RII survey. Strong evidence that a *firm-specific* model with few variables beats generic factor lists. |
| **Egemen & Mohamed (2007)**, Bldg & Env 42(3) — [DOI](https://www.sciencedirect.com/science/article/abs/pii/S0360132305004889); **SCBMD KBS (2008)**, Autom. Constr. — [DOI](https://www.sciencedirect.com/science/article/abs/pii/S0926580508000307) | 80 N. Cyprus/Turkey contractors, 83 factors; then rule-based expert system (Level 5 Object shell) using reasoning subgoals | 83 | Two-stage model (bid/no-bid → markup). "Strategic considerations" significant in both; firm size changes factor weights. KBS matched actual decisions 86% over 100 real bids; markup within 1.75 pts on average. |
| **Bageis & Fortune (2009)**, CME 27(1):53 — [ResearchGate](https://www.researchgate.net/publication/46529036_Factors_affecting_the_bidno_bid_decision_in_the_Saudi_Arabian_construction_contractors) | 91 Saudi contractors; 87 factors (0–6), PCA → 39 | 87 | Client financial capacity (94.9), prompt payment habit (94.0), project payment system (92.1), clarity of work/specs (90.7), project cash flow (90.6), ability to execute (88.7), cash available (88.3), working capital required (87.6), strategic fit (87.3), client honesty (87.2). Contractor size / public-vs-private client significantly change weights. |
| **El-Mashaleh (2010)**, Can. J. Civ. Eng. 37(1) — [DOI](https://cdnsciencepub.com/doi/10.1139/L09-119); **(2013)** J. Mgmt Eng 29(3) — [DOI](https://ascelibrary.org/doi/10.1061/(ASCE)ME.1943-5479.0000147) | **DEA**: past bids as DMUs, factor scores as inputs, win/outcome as output; 2013 survey of 43 large Jordanian contractors, 53 factors | 53 | Primary blocked. DEA produces an efficiency frontier from *your own* historical bids and places a new opportunity relative to it — attractive in principle, but needs dozens of scored historic bids and is hard to explain to an owner. |
| **Cheng, Hsiang, Tsai & Do (2011)**, JCEM (Vilnius) 17(3) — [DOI](https://journals.vilniustech.lt/index.php/JCEM/article/view/5239) | Fuzzy preference relations for weights + Cumulative Prospect Theory for markup; single real case | 10 | Weights (case 1): expected profitability .123, current workload .124, number of competitors .125, project complexity .115, relationship with client .114, expected risk .101, staff availability .093, contractual conditions .082, experience on similar .074, size .049. Notably *flat* weights — the top factor is only 2.5× the bottom. No ELECTRE despite the brief. |
| **Leśniak & Plebankiewicz (2015)**, J. Mgmt Eng 31(2) — [DOI](https://ascelibrary.org/doi/10.1061/%28ASCE%29ME.1943-5479.0000237); **Leśniak (2018) fuzzy AHP**, Symmetry 10(11):642 — [MDPI](https://mdpi.com/2073-8994/10/11/642/htm); **Leśniak et al. (2021) LOG/LDA**, Appl. Sci. 11(13):5973 — [MDPI](https://www.mdpi.com/2076-3417/11/13/5973) | 61 Polish contractors, 16 factors (smallest set in the meta-analysis); fuzzy sets → fuzzy AHP (4 criteria/15 sub-criteria: company capabilities, investment characteristics, financial conditions, tender characteristics) → ANN (2016) → logistic regression & LDA on 88 real tenders (64 lost/24 won) | 15–16 | 2021 result is the most useful: backward-stepwise reduced 15 factors to **six** discriminators — type of works, contractual conditions, project value, need for work, subcontractor participation, degree of difficulty. LOG 79.6% acc., **LDA 86.0%** (sens. 83%, spec. 87%). Again: a handful of factors carries the signal. |
| **Oyeyipo et al. (2016)**, J. Constr. Dev. Countries 21(2):21 — [PDF](http://web.usm.my/jcdc/vol21_2_2016/JCDC%2021(2)_Art%202(21-35).pdf) | 64 Nigerian contractors, 20 factors, RII | 20 | Host blocked; included as S8 in the meta-analysis (financial/client-payment factors dominate). |
| **Chileshe, Kavishe & Edwards (2021)**, Constr. Innov. 21(2):182 — [DOI](https://doi.org/10.1108/CI-09-2019-0098) | 33 Tanzanian small building contractors, 30 factors | 30 | Paywalled/CAPTCHA; included as S23 in the meta-analysis. |
| **Aldossari (2024)**, Buildings 14(10):3114 — [MDPI](https://www.mdpi.com/2075-5309/14/10/3114) | 112 Saudi contractors; RII, t-test, ANOVA, EFA (6 latent groups) | — | Client's ability to pay 93.4, clarity of scope 91.8, project cash flow 91.1, need for work 90.2, qualified labour availability 89.5, contractor financial capacity 89.2, project risks 88.9, project type 88.1, market competition 87.8, company workload 87.2. |
| **Meta-analysis: Ma et al.? (2022)**, Buildings 12(3):379 — [MDPI](https://www.mdpi.com/2075-5309/12/3/379) | 24 questionnaire studies 1988–2021, 440 RII values, 264 factors; random-effects inverse-variance pooling; 28 factors with ≥11 occurrences | 28 | Pooled RII: **payment terms .833; client financial capacity .819; client reputation .814; client payment history .802; project size .781; experience on similar .770; need for work .745; current workload .734; project type .729; availability of other projects .716**; complexity .706; availability of work .703; tendering procedure .700; firm's financial situation .699; relationship with client .695; location .693; duration .691; track record .687; contract type .675; **number of bidders .672**; competitiveness of bidders .669; time to prepare bid .665; profit potential .661; tender information .657; resource availability .621; economic stability .617; equipment .597; firm reputation .553. No significant heterogeneity (all p>.05). Key finding: how often a factor appears in the literature correlates poorly with how important it is. |

**Blunt observations.**
1. Every one of the 24 pooled studies is a Likert questionnaire; the *only* studies that model actual bid outcomes (Wanous, Lowe & Parvar, Leśniak 2021, El-Mashaleh, SCBMD) all land at 85–95% agreement with 6–18 variables. Beyond ~10 factors you are adding noise, not rigour.
2. The centre of gravity has moved since 1988–93 (job type, need for work, competitors) to **client money** (payment terms, client solvency, payment history). For a small contractor that is the correct emphasis: one slow-paying client is a bigger threat than one lost bid.
3. Number of bidders ranks only 20th in the pooled survey RII, yet in Part B it is the single most powerful *quantitative* driver of P(win). Surveys measure what practitioners *say* matters; keep #bidders in the EV panel regardless.

### A2. Consolidated master factor table

Group codes: **CL** client/payment, **PR** project fit & risk, **CO** competition, **FC** firm capacity/strategy, **MK** market. "Top-10 in" counts studies above where the factor is explicitly in a reported top-10.

| # | Factor | Top-10 in | Group | Use in tool |
|---|---|---|---|---|
| 1 | Client ability to pay / financial capacity | Meta, Bageis, Wanous, Aldossari, Palestine (ETASR) | CL | **Hard gate** + scored |
| 2 | Payment terms / project cash-flow / payment history | Meta (#1,#4), Bageis (#2,#3,#5), Aldossari #3 | CL | Scored; feeds cash module |
| 3 | Client reputation / relationship / honesty | Meta #3, Wanous #3, Bageis #10, Cheng | CL | Scored |
| 4 | Need for work / current workload / backlog | Shash #1, Meta #7–8, Aldossari #4,#10, Wanous #10, Cheng, Leśniak-2021 | FC | Scored; **derived from capacity module**, not opinion |
| 5 | Experience on similar projects / project type | A&M, Shash #3, Meta #6,#9, Aldossari #8, Leśniak-2021 ("type of works") | PR | Scored + gate (never-done-before type) |
| 6 | Project size / value | A&M, Meta #5, Wanous #4, Leśniak-2021 | PR/FC | Gate (bonding/1.5× largest) + scored |
| 7 | Clarity of scope / specs / tender information | Bageis #4, Aldossari #2, Meta #24 | PR | Scored |
| 8 | Number & strength of competitors | Shash #2, Meta #20–21, Aldossari #9, Cheng (highest weight) | CO | **Direct input to P(win)**, not a Likert score |
| 9 | Project risk / complexity / degree of difficulty / hazard | A&M, Meta #11, Aldossari #7, Cheng, Leśniak-2021 | PR | Scored; adjusts margin variance |
| 10 | Contract conditions / contract type / tendering procedure | Shash, Meta #13,#19, Leśniak-2021, Cheng | PR | Scored + gate (uncapped LDs, pay-when-paid, etc.) |
| 11 | Expected profit / historic profit on similar | A&M, Shash, Cheng #1 | PR | Enters EV as margin, not as a score |
| 12 | Resource availability (labour, staff, equipment, subs) | Aldossari #5, Wanous #9, Cheng, Leśniak-2021, Meta #25 | FC | Capacity module |
| 13 | Time available to prepare bid | Wanous #5, Meta #22 | CO | Scored; drives bid cost |
| 14 | Location / site conditions | A&M, Wanous #7–8, Meta #16 | PR | Scored |
| 15 | Strategic fit / market conditions / availability of other work | Bageis #9, Meta #10,#12, Egemen | MK/FC | Scored (low weight) |

### A3. Model-type comparison for a lightweight browser tool

| Model | Evidence | Pros | Cons for this tool |
|---|---|---|---|
| **Weighted additive (SAW) 1–5** | Wanous 2000 parametric 85%; Cheng weights nearly flat | Transparent, 5-minute completion, trivially auditable, matches every practitioner checklist | Fully compensatory — a great margin can "pay for" an insolvent client. Fix with gates. |
| **Non-compensatory gates / conjunctive screens** | Implicit in every KBS (SCBMD rules) and in surety practice | Encodes killers (client solvency, bonding, contract terms) that no score should offset | Need discipline about what is truly a gate vs a penalty |
| **AHP / fuzzy AHP** | Leśniak 2018; Cheng 2011 (FPR) | Pairwise weights are more defensible than owner gut; consistency ratio flags incoherent weights | Only worth it for *weight derivation* (once, offline). Fuzzy variants add maths without adding information at n≈1 firm. |
| **Logistic regression / LDA** | Lowe & Parvar 94.8%; Leśniak 2021 LDA 86% on 88 tenders | Best accuracy per unit complexity; coefficients are interpretable; a browser can fit it | Needs ≥60–90 scored historical bids with outcomes. Phase 2 feature once the tool has logged data. |
| **ANN / SVM** | Wanous 2003 90% (vs 85% parametric) | Handles interactions | Black box, overfits at small n, no owner will trust it. Skip. |
| **DEA** | El-Mashaleh 2010/2013 | Uses own history, no subjective weights | Needs many DMUs, non-intuitive, fragile to outliers. Skip. |
| **Case-based reasoning / KBS** | SCBMD 86% | Explains its reasoning | Rule maintenance burden; effectively what a good scorecard + gate set already is. |

**Recommendation.** Implement (1) weighted additive 1–5 scorecard on ~10–12 factors from A2, (2) a short list of **hard gates** evaluated *before* scoring (client can't pay / no payment-terms clarity, job > single bond limit or > 1.5× largest completed, contract terms outside policy, no PM/super available in the window, never-built-before type without a partner), (3) an optional **AHP pairwise weight wizard** with consistency ratio so the owner derives weights once rather than typing them, and (4) log every scored bid with outcome so that at ≥60 records the tool can fit a logistic model and show its coefficients next to the owner's weights (Lowe & Parvar / Leśniak 2021 both show that is where the real rigour comes from). Keep P(win), margin and bid cost **out of the additive score** and in the EV panel — mixing them double-counts.

---

## PART B — Win probability & pricing theory

### B1. Friedman (1956) and Gates (1967)

- **Friedman**: with markup m over cost C, and competitor i's bid/cost ratio distribution Fi, P(beat i) = 1 − Fi(1+m); assuming independence, **P(win | n competitors) = ∏ P(beat i)**, or (1−F(1+m))ⁿ for n identical unknown competitors. Expected profit EP(m) = m·C·P(win). Optimum m* maximises EP ([Friedman & Gates worked example](https://www.aast.edu/pheed/staffadminview/pdf_retreive.php?url=350_10315_CB519_2019_1__1_1_Bidding+Strategy+and+Markup+Estimation.pdf&stafftype=staffcourses)).
- **Gates**: **P(win) = 1 / (1 + Σᵢ (1−pᵢ)/pᵢ)** where pᵢ = P(beat competitor i alone). Gates rejected Friedman's independence assumption (all bidders share the same cost estimate error). Skitmore et al. proved Gates is exact iff bids follow a proportional-hazards family (Weibull once markup is included) ([Gates' Bidding Model, ResearchGate](https://www.researchgate.net/publication/43474832_Gates'_Bidding_Model); [Gates revisited, CME 2023](https://www.tandfonline.com/doi/abs/10.1080/01446193.2023.2181980)).
- Worked example ($1M job, 3 competitors): Friedman m* ≈ 3.2%, EP ≈ $13K; Gates m* ≈ 4.2%, EP ≈ $14K. Friedman is always the more pessimistic (lower P(win), lower optimal markup); the two converge as n→1 ([same source](https://www.aast.edu/pheed/staffadminview/pdf_retreive.php?url=350_10315_CB519_2019_1__1_1_Bidding+Strategy+and+Markup+Estimation.pdf&stafftype=staffcourses)).
- **Markup vs. number of bidders** rule of thumb from the same teaching source: **m₂/m₁ = (n₁/n₂)^0.7** — going from 3 to 6 bidders cuts the optimal markup by ~38%. Treat as heuristic, not law.
- **Carr (1982)** "General Bidding Model", J. Constr. Div. 108(4) ([ASCE](https://ascelibrary.org/doi/10.1061/JCCEAZ.0001070)) standardises bids by the bidder's own estimate so one distribution serves all competitors; **Skitmore (2002)**, JORS 53 ([Springer](https://link.springer.com/article/10.1057/palgrave.jors.2601236)) tested Friedman, Gates, Carr and his own model on 591 UK auctions (k = 2–14 bidders): Carr and Skitmore-S1 best at picking the winner; Skitmore-S2 best calibrated (log score) in 6 of 8 out-of-sample tests. Practical takeaway: **no model beats a well-calibrated per-competitor empirical distribution**, and Friedman's independence assumption is wrong but its pessimism is a useful bias for a small firm.
- **Bid dispersion**: Skitmore & Ballesteros-Pérez (JCEM 2021) across 13 international datasets find σ of log-bids implying a **bid CV of roughly 4–12%, typically 5–8%**, and show most auction-to-auction variation in σ is sampling error from small n ([preprint](https://rodin.uca.es/bitstream/handle/10498/29948/PaperCOENG2021.pdf?sequence=1&isAllowed=y)). With CV≈6%, a bidder pricing 3% above the field average against 4 others has P(lowest) ≈ 10%; at field average ≈ 20%; 3% below ≈ 35% (normal approximation). That is the entire game.
- **Number of bidders, empirically**: Four-DOT 2015 sample of 1,301 bids: low bid vs engineer's estimate follows ē = −.0029c³ + .0376c² − .1554c + .1793 (R² .86); going from 6 to 2 bidders raises cost ≈ 2.2 pts; bid spread s̄ = −.047 ln(c) + .1476 (R² .98), i.e. spread falls from 8.2% (4 bidders) to 5.4% (6) ([CMAA/ FHWA-based study](https://www.cmaanet.org/sites/default/files/resource/The%20Effect%20of%20the%20Level%20of%20Competition.pdf)). Carr (1983) "Impact of Number of Bidders on Competition", JCEM 109(1) is the canonical earlier reference ([ASCE](https://ascelibrary.org/doi/10.1061/%28ASCE%290733-9364%281983%29109%3A1%2861%29)).

### B2. Winner's curse

Low bidder in a common-value auction is systematically the one who under-estimated; the more bidders, the worse ([Ahmed, Elubeir et al., JCEM 142(2), game theory](https://ascelibrary.org/doi/abs/10.1061/%28ASCE%29CO.1943-7862.0001058); [agent-based model](https://www.sciencedirect.com/science/article/pii/S1877050920304178)). Dyer & Kagel (Mgmt Sci 1996) show the commercial construction industry corrects for it via bid-withdrawal-on-error norms, repeat play and sub relationships rather than by shading bids ([ResearchGate](https://www.researchgate.net/publication/5022979_Bidding_in_Common_Value_Auctions_How_the_Commercial_Construction_Industry_Corrects_for_the_Winner's_Curse)). The DOT study above flags 7+ bidders as the zone where "unfavorable" (too-low) bids spike. **Tool implication**: when n ≥ 6 and scope clarity is scored ≤ 2, show a winner's-curse warning and raise the contingency, don't lower the markup.

### B3. Cost-to-bid benchmarks

- Hughes et al. (Reading, CIB 2003/2006), 2001–03 UK data: main-contractor bid cost averages **0.64% of contract value across routes** — general contracting 0.81%, pure D&B 0.80%, management 0.25%, novated D&B 0.21%; range 0.07–0.8% on £0.2M–£220M jobs; and "no correlation with different methods of procurement" ([CIB paper](https://www.irbnet.de/daten/iconda/CIB6271.pdf); book: [Routledge](https://www.routledge.com/Procurement-in-the-Construction-Industry-The-Impact-and-Cost-of-Alternative/Hughes-Hillebrandt-Greenwood-Kwawu/p/book/9781138983854)). Whole commercial process (marketing + bidding + monitoring + disputes) ≈ 2.57% of main-contractor turnover, 5.43% for trade contractors.
- Constructing Excellence / Hughes 2014–15 survey (179 firms, £11bn of bids): **0.57% of project value** overall; **losing bids 0.48%, winning bids 0.65%** (winners spend ~25% more); highest ratio on jobs under £5M; median 5 bidders; contractors win ≈1 in 5 ([Constructing Excellence](https://constructingexcellence.org.uk/4015-2/); [Evolution5 summary](https://evolution5.co.uk/how-much-does-it-cost-to-tender-a-construction-project/) **[consultant]** — its "22% of turnover on tendering" figure is not supported by the underlying study; ignore it).
- No peer-reviewed US residential benchmark exists. For your size band expect **0.5–1.5% of contract value per hard bid** and 2–4% per *won* job at a 1-in-3 to 1-in-4 hit rate (Evolution5's own £3M case: 0.87% per bid, 3.5% per win). Default the tool to 1.0% × contract value for hard bid, 0.4% for negotiated/D-B preconstruction that the client pays for, editable per bid with actual estimating hours.

### B4. Bid-hit ratio benchmarks (all **[consultant/trade]**; no peer-reviewed US survey found)

- ENR/George Hedley: GCs public works 6–10:1, private bid ~5:1, negotiated ~3:1; subs 7–11:1 / 5:1 / 4:1; ceiling "should not exceed 10–11:1" for public; only 6% of 2,000 surveyed firms tracked their ratio ([ENR](https://www.enr.com/articles/23952-bid-hit-ratios-provide-valuable-road-map)).
- ConstructConnect 2026 **[vendor]**: hard-bid public 10–20%, competitive private 15–25%, negotiated/selective 30–50%, repeat client 50%+ — explicitly "trade and consultant sources," no primary data ([ConstructConnect](https://www.constructconnect.com/blog/bid-hit-ratio-commercial-gcs-2026)).
- Report both **by count and by dollar**; the dollar ratio is what drives backlog, the count ratio is what drives estimating cost. Track separately by procurement route.

### B5. P(win) + EV model spec

**Inputs per opportunity**: contract value V; expected gross margin g (on V); route ∈ {hard-bid public, hard-bid private, invited/selective, negotiated, design-build/CM}; expected number of competitors n; competitive-position score s ∈ [1,5] (price competitiveness, relationship, differentiation, incumbent); estimated bid cost B (hours × loaded rate + externals, default 1.0% V hard-bid, 0.4% V negotiated); estimating hours H.

**Step 1 — Base rate p₀ by segment (empirical Bayes shrinkage).**
For segment k (route × client × size band, coarsest that has data): p₀ₖ = (wₖ + α·μ) / (Nₖ + α), where wₖ = wins, Nₖ = bids in that segment, μ = the firm's overall win rate (or the route default below if history < 10 bids), α = prior strength in "pseudo-bids" (default 10). This is the Beta-binomial posterior mean ([STAT415 Beta-Binomial](https://bookdown.org/kevin_davisross/stat415-handouts/beta-binomial.html); regression-on-covariates version in [Robinson, beta-binomial regression](http://varianceexplained.org/r/beta_binomial_baseball)). Route defaults when no history: hard-bid public 0.15, hard-bid private 0.20, invited 0.33, negotiated 0.50, repeat-client negotiated 0.65 (from B4, **[consultant]** — replace with own data ASAP).

**Step 2 — Adjust for number of competitors.**
Neutral-position P(win) against n others is 1/(n+1). Blend: p₁ = p₀ · [(1/(n+1)) / (1/(n̄ₖ+1))], where n̄ₖ is the historical mean competitor count in the segment (Friedman/Gates logic that P(win) falls roughly as 1/(n+1) for evenly matched bidders; Skitmore 2002). Cap p₁ ∈ [0.02, 0.95].

**Step 3 — Competitive-position adjustment (logit shift).**
logit(p) = logit(p₁) + β·(s − 3), default β = 0.5 (so s=5 vs s=1 moves odds by e² ≈ 7×). Owner can recalibrate β once ≥30 outcomes are logged (fit s against outcome in the logistic model from A3).

**Step 4 — Optional Friedman/Gates price check** (hard-bid only, when a target markup m is being debated): with bid CV c (default 0.06) and the firm's typical cost-estimate position relative to the field d (default 0), P(lowest | m, n) ≈ [1 − Φ((m − d)/c)]ⁿ (Friedman, pessimistic) and Gates form 1/(1 + n·Φ/(1−Φ)). Show both; display EP(m) = m·V·P(m) curve and the m* peak. Display the m₂/m₁ = (n₁/n₂)^0.7 heuristic as a sanity check.

**Step 5 — EV.**
EV = p · (g·V − B_post) − B, where B_post is post-award pursuit cost (buyout, contract negotiation; default 0). Also show **EV per estimating hour = EV / H**, **break-even P(win) = B / (g·V)**, and **risk-adjusted EV** = p·(g − σ_g·z)·V − B using a margin-variance haircut driven by the scope-clarity and complexity scores (σ_g default 3 pts of margin at clarity 3, 6 pts at clarity 1; z = 1 for a one-sigma downside view). Flag winner's-curse if n ≥ 6 and clarity ≤ 2.

**Negotiated / D-B vs. hard-bid.** Negotiated work has high p and low B, but the tool must ask a different question: *is the fee/GMP structure and the preconstruction reimbursement adequate?* Use p from the negotiated segment, set B to unreimbursed precon only, and add a gate: "no signed precon/letter of intent → treat as hard bid p". Hughes found no procurement-route effect on bid cost, so do not assume D-B is cheap to pursue — model it explicitly.

---

## PART C — Capacity & portfolio

### C1. Literature

- **Multi-project finance-based scheduling** (Elazouni, CME 27(2):199, 2009 and later work) schedules concurrent projects so cumulative negative cash never exceeds the credit line; heuristic within ~1% of integer-programming optimum on 15 networks ([abstract](https://ideas.repec.org/a/taf/conmgt/v27y2009i2p199-211.html)). This is the correct mental model: a new job is feasible only if the *portfolio's* peak overdraft stays inside available cash + line.
- **Portfolio cash-flow optimisation** (Ain Shams Eng. J. 2024) formalises the constraint "cumulative negative cash flow does not exceed the available capital" across a portfolio, with start-timing as the decision variable; DE beat expert judgement by 8% in the case study ([ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2090447924006403)). Knapsack-type portfolio selection under uncertainty exists in generic form ([PLOS One 2019](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0213652)); I found no peer-reviewed Markowitz-style *bid* portfolio paper specific to small GCs — treat that as an open gap, and note that with a handful of concurrent jobs a brute-force enumeration of pursue/skip combinations (2^k for k ≤ 8 open pursuits) is trivial in a browser and needs no optimiser.
- **S-curve cash models**: DHSS/Hudson polynomial and Kenley–Wilson logit v = 1/(1+e^(−α−βt)); NZ parameters for $5–10M jobs α≈−0.05…−0.29, β≈1.57–1.75 ([CIB PDF](https://www.irbnet.de/daten/iconda/CIB_DC27661.pdf)). Peer-reviewed literature does **not** give a clean "peak negative cash = X% of contract" number; it must be derived (below).
- **Surety rules of thumb** (all **[trade/CPA]**, but consistent): single-job limit ≈ 10× working capital and ≈ 1.2–1.5× largest completed job; aggregate ≈ 15–20× working capital; sureties want analysed working capital ≥ 5–10% of the work programme (i.e. backlog ≤ 10–20× WC); liabilities/equity < 3:1; underbillings approaching 25% of WC and profit fade > 10% draw questions ([ToolGrit calc](https://www.toolgrit.com/tools/bonding-capacity-calc), [Roughley](https://roughleyinsurance.com/blog/surety-underwriting-guide), [ASL CPA](https://aslcpa.com/five-key-performance-indicators-sureties-watch/)). ASL also cites WC ≈ 10–15% of annual revenue and backlog ≈ 12 months' revenue as healthy. CFMA's own article offers quick ratio 1.1–1.5 and D/E < 2.0 but no backlog benchmark ([CFMA](https://cfma.org/articles/construction-s-lifeline-key-metrics-for-measuring-financial-health)).
- **PM/superintendent load**: no empirical benchmark exists; the best-known attempt (Sedam, Pro Builder 2021) explicitly failed to produce a "Superintendent Load Calculator" and lists 15 qualitative drivers ([Pro Builder](https://www.probuilder.com/home/article/55198432/project-manager-workloads-how-much-is-enough)) **[consultant]**. Use the firm's own declared capacity.

### C2. Deriving peak negative cash for one job (first-principles, for the spec)

Contractor cost outflow follows an S-curve; billings lag by the pay-app cycle L (typically 30–60 days from work to cash), retention r (5–10%) is withheld until substantial completion, and the contractor buys at cost while billing at cost/(1−g). Under those assumptions the peak cumulative negative cash is roughly:

**PeakCash ≈ V × [ (L/D) × k_slope + r × (1 − g) − f ]**

where D = duration in months, k_slope ≈ 1.6 (peak monthly burn ≈ 1.6× average for a standard S-curve), and f = front-loading/mobilisation billed ahead (0–5%). Example: V = $2M, D = 12 mo, L = 1.5 mo, r = 10%, g = 15%, f = 0 → ≈ 2M × (0.125×1.6 + 0.085) ≈ **$570K (28%)**; with L = 1 mo and r = 5% → ≈ $350K (17%). Owned trade shops raise this (payroll is weekly; you cannot pay yourself net-60), so add the shop's share of labour × (L in months) explicitly. Present as a range and let the user override; there is no peer-reviewed constant to cite here and the tool should say so.

### C3. "Capacity & Cash" module spec

**Inputs**: current jobs (value, % complete, remaining months, PM, super, shop hours/wk committed, retention outstanding); staff roster (PMs, supers, shop crews with hours/wk); available cash + undrawn line; bonding single/aggregate limits and open bonded backlog; annual revenue plan; the candidate job's V, D, start month, L, r, g, self-performed share, bond required?

**Derived**:
- Backlog months = (remaining contract value of open jobs) / (annual revenue plan/12).
- PM load = Σ active jobs per PM (weighted by value; owner sets max, default 3 for $0.4–4M jobs); same for supers (default 2, or 1 if job > $2M).
- Shop utilisation = committed hours / available hours over the candidate's window, month by month.
- Portfolio peak cash = Σ per-job PeakCash curves overlapped in time (C2) → compare with cash + line.
- Bond headroom = min(single limit − V, aggregate − open bonded backlog − V).
- Working-capital ratio = WC / (backlog + V).

**Criteria (score 1/3/5)**

| # | Criterion | 1 | 3 | 5 |
|---|---|---|---|---|
| 1 | Backlog after award (months) | > 15 or < 3 | 9–15 | 5–9 (can start on time, still hungry) |
| 2 | PM availability in start window | none free; would exceed max load | free at max load | free with slack |
| 3 | Superintendent availability | none / pull from live job | available at start +1 mo | dedicated super available |
| 4 | Owned-shop utilisation during job | > 100% in any month (must sub out own trades) | 85–100% | 60–85% (fills a trough) |
| 5 | Portfolio peak cash / (cash + line) | > 90% | 60–90% | < 60% |
| 6 | Retention exposure after award / WC | > 50% | 25–50% | < 25% |
| 7 | Bond headroom after award | < 0 (gate) or < 10% of aggregate | 10–25% | > 25% or no bond required |
| 8 | Job size vs largest completed | > 1.5× | 1.0–1.5× | ≤ 1.0× |
| 9 | Schedule overlap with peak-burn months of other jobs | 2+ jobs at peak burn simultaneously | 1 | 0 |
| 10 | Client payment terms (L, r, front-load) | L > 60d or r = 10% no reduction | L 45d, r 10% → 5% at 50% | L ≤ 30d, r ≤ 5%, mobilisation paid |

**Hard gates (stop before scoring)**: (a) V > single bond limit or open bonded backlog + V > aggregate; (b) portfolio peak cash > 100% of cash + line under the base case; (c) no PM *and* no super can be assigned without exceeding declared max load; (d) WC / (backlog + V) < 5% (surety floor, [Roughley](https://roughleyinsurance.com/blog/surety-underwriting-guide)); (e) client solvency unverified or payment terms undefined (this is also gate #1 in Part A — the strongest single factor in the whole literature).

**Portfolio view**: for the k open pursuits, enumerate every pursue/skip combination, compute expected backlog, expected peak cash (probability-weighted using P(win) from Part B, and worst-case if all hit), total bid cost, and total EV; rank by EV subject to the worst-case cash and staffing gates. With k ≤ 8 that is ≤ 256 rows — no optimiser needed, and it is more honest than a Markowitz frontier built on guessed covariances.

---

## Bottom line for the owner

1. The literature justifies a **short** scorecard (10–12 factors) plus **gates**; it does not justify fuzzy/ANN/DEA machinery for one firm. Log outcomes and let logistic regression earn its place later.
2. Put **client money** at the top, exactly as the 2022 meta-analysis, Bageis & Fortune and Aldossari all do.
3. Keep **P(win), margin and bid cost out of the score and in an EV panel**, with P(win) built from a shrunken segment base rate × 1/(n+1) competitor adjustment × a logit shift for competitive position, and a Friedman/Gates price curve for hard bids.
4. Treat capacity and cash as **constraints first, scores second**; the peak-cash overlap across concurrent jobs is the number most likely to sink a small contractor, and no vendor scorecard I found computes it.
