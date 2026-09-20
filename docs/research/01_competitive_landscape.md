# Competitive Landscape: Go/No-Go, Bid Qualification and Pursuit Scoring Tools

Research date: 2026-09-16. Scope: what commercial tools and published frameworks actually do for bid/no-bid decisions, and where a free single-file tool for a small construction contractor can beat them. Written against the v1 scorecard, before the tool was rescoped to a flooring / tile / specialty-surface subcontractor; the market findings are domain-general, the builder-specific gap items (owned trade shops, self-perform) were dropped in the rescope.

## Headline findings (blunt version)

1. **Almost nobody in construction software ships a real go/no-go engine.** Procore, Buildertrend, JobTread, Houzz Pro, Knowify, PlanHub, Bidtracer, EstimateOne and BuildingConnected are bid *distribution*, *leveling* and *pipeline* tools. None publishes a weighted qualification scorecard. Their "prequalification" features score *subcontractors*, not *opportunities*.
2. **The only construction/AEC CRMs with a genuine go/no-go scorecard are Unanet CRM by Cosential and Deltek Vantagepoint**, and both are effectively "build it yourself with user-defined fields and a workflow." Unanet describes it as "configurable, weighted forms and gates" ([Unanet Pipeline](https://unanet.com/crm-aec/pipeline)); Deltek's is hidden UDFs summed by a workflow ([Deltek](https://www.deltek.com/resources/articles/pursue-the-right-projects-with-go-no-go-in-vantagepoint/)). Neither publishes default criteria. Unanet's "17-point weighted scoring tool" download now redirects to a contact-sales form ([go.cosential.com/go-no-go-tool](https://go.cosential.com/go-no-go-tool) -> unanet.com/contact-sales). Unanet's one quantitative case study ("predicting winners 80% of the time and losers at 100%") is a single anecdote with no methodology ([Unanet case study](https://unanet.com/case-study/to-go-or-not-to-go-allgeier-martin-and-associates-uses-unanet-to-predict-the-winnability-of-business-opportunities-more-accurately)) — treat as marketing.
3. **The real substance lives in the GovCon/proposal world** (Shipley, APMP-adjacent vendors, BidClarity, Loopio, GovEagle, CLEATUS) and in **academic bid/no-bid research**, which ranks factors the v1 scorecard barely touched: payment terms, client's ability to pay, client payment history, scope clarity, cash flow, need for work, and current workload ([MDPI meta-analysis of 24 studies, 2,031 respondents](https://www.mdpi.com/2075-5309/12/3/379); [MDPI 2024](https://www.mdpi.com/2075-5309/14/10/3114)).
4. **No tool found does calibration** (compare predicted PWin to actual outcomes). Everyone *recommends* it ([Loopio](https://loopio.com/blog/pwin/), [CLEATUS](https://www.cleat.ai/blog/pwin-score-for-government-contracts), [GovEagle](https://www.goveagle.com/blog/what-is-pwin-probability-of-win-guide)); nobody ships it. This is the single biggest open gap.
5. **No tool models a vertically integrated builder** — shop capacity, self-perform margin uplift, or shop backlog conflicts. Zero results anywhere.

## Tool-by-tool audit

### Unanet CRM by Cosential (AEC CRM) — the important one
- **Criteria:** Not published. Marketing pages say "configurable, weighted forms and gates," "Red Zone forms" for risk, "detailed win probability analysis," and forecasting dashboards (projections vs actuals, funnel by stage/personnel, "strategic or at-risk opportunities") ([Pipeline page](https://unanet.com/crm-aec/pipeline)). The GovCon side leans on PWIN scores plus past performance and agency relationship history ([Unanet blog](https://unanet.com/blog/go/no-go-decisions-made-smarter-using-crm-insights-to-win-the-right-contracts)).
- **Mechanics:** Weighted form -> score -> gate. The Cosential-era blog listed five principles (strategic alignment, growth plan, process discipline, team "all in," client research) and pointed to a 17-criterion weighted tool that is no longer downloadable ([Unanet blog](https://unanet.com/blog/expert-advice-how-to-make-the-right-go-no-go-decision)).
- **Doesn't do:** publish default criteria; calibration; expected value; deal-killers as a first-class concept (visible only as configurable gates).
- **Pricing:** reported "starting at $50/user/month," sales-quoted ([Procurement Sciences](https://www.procurementsciences.com/blog/unanet-pricing)).

### Deltek Vantagepoint (AEC ERP/CRM)
- **Criteria:** three subcategories — Client evaluation, Project evaluation, Competition evaluation. Example point mapping: existing client = 2, former client = 1, none = 0. Other suggested fields: experience with work type, past performance for client, subcontracting share required, whether you knew before advertisement, strategic alignment, known competitors, number of bidders, incumbent status ([Deltek](https://www.deltek.com/resources/articles/pursue-the-right-projects-with-go-no-go-in-vantagepoint/); [Full Sail Partners](https://www.fullsailpartners.com/fspblog/pick-the-winning-rfp-with-deltek-vantagepoint-crm)).
- **Mechanics/output:** hidden UDF scores summed to subcategory and overall; workflow outputs **Go / Go with Management Approval / No Go** and emails the decision. Notable: a 3-state verdict where the middle state is an *approval route*, not just "amber."
- **Doesn't do:** ship defaults, visualise, calibrate. Enterprise-priced.

### Shipley Associates (BD Lifecycle) — decision gates
- Three gates: **Pursuit decision -> Bid decision -> Bid validation decision** ([Shipley](https://www.shipleywins.com/blogs/bid-decisions)). Actual questions ([Shipley](https://www.shipleywins.com/blogs/problem-solution-bid-decision)): *Pursuit:* within our business area? fits strategic plan? how well known to customer? incumbent or others favored? effect on existing business? risks of bidding vs not bidding? *Bid:* have we influenced requirements? does customer rely on us for input? do we know competitors and their approach? surprises in draft requirements and why? *Validation:* show-stoppers — unachievable requirements, unacceptable terms, unrealistic schedule, wired selection.
- Qualification triad: problem priority (customer rates 7–8/10+), solution agreed with customer, cost aligned early ([Shipley](https://www.shipleywins.com/blogs/qualifying-opportunities-a-simple-framework)). Claim "bid discipline can double or triple win rates" is unsourced — marketing.
- **Gap vs v1:** v1 had one gate; Shipley has three with different questions per stage and explicit "advance / defer / end."

### SMPS-style worksheets (A/E marketing)
- **APEX/SMPS 8-criterion sheet, 0–10 each, anchored descriptors, threshold 56/80 = Go** ([PDF](https://apexalaska.org/wp-content/uploads/2016/09/Go-No-Go-Checklist.pdf)). Criteria: client knowledge of your firm, technical approach, corporate experience, corporate priority, team members, opportunity awareness (when did you learn of it), opportunity to market to client pre-RFP, competition.
- **SMPS Twin Cities process** — 13 yes/no questions, % true -> <50% No, 50–60% consider with care, 70%+ Go; plus three process questions: what is the decision process, who decides, how do we distinguish ourselves ([PDF](https://smps-tc.org/images/downloads/go.no_go_process.pdf)).
- **PSMJ/Kennedy-Jenks**: six criteria 0–5, 22–30 = go; separate rule: no-go if 3+ of 7 T/F are false **and pursuit cost > 10% of potential revenue** ([PSMJ](https://go.psmj.com/blog/go/no-go-is-a-go-for-most-firms)). PSMJ's free "My Go/No-Go" uses 41 guided questions ([PSMJ](https://www.psmj.com/go-no-go/)).

### BidClarity.ai (GovCon SMB) — best-documented commercial scorecard
- 12 criteria, 0–10, 120 max: capability fit, past performance fit (3–6 yr window), incumbent vulnerability, set-aside fit, funding ceiling realism, bonding feasibility, teaming necessity, geographic fit, schedule realism, competition density, strategic value, PWIN. Thresholds 84+ Bid / 60–83 Conditional / <60 No-bid. **Persona presets double specific weights** (e.g., "SMB set-aside hunter" doubles set-aside + bonding). 6 of 12 auto-scored from public data; 6 manual. $279–349/mo ([BidClarity](https://bidclarity.ai/resources/bid-no-bid-decision-framework.html)).
- **Doesn't do:** commercial/residential; calibration.

### Loopio and Responsive (RFP response)
- Loopio's template: 8 questions, 1–4 scale, equal weight, submit if mean ≥ 2.5; advises factoring your historical win rate ([PDF](https://link.loopio.com/hubfs/Content%20Pieces/Templates/Go_No_Go_Decision_Matrix.pdf)). In-product it is a "proposal readiness score"; mechanics undisclosed ([Loopio](https://loopio.com/blog/go-no-go/)). Loopio's PWin article gives the weighted formula and example weights (customer fit .25–.30, competitive edge .15–.25, past performance .20, relationship .15–.30, pricing .10) ([Loopio](https://loopio.com/blog/pwin/)).
- Responsive: three-tier method — 5 questions; 15–20 customised T/F statements (>80% true = bid); 1–3 matrix **scored independently by multiple stakeholders and averaged** ([Responsive](https://www.responsive.io/blog/bid-no-bid)). No product mechanics published.
- Arphie (competitor) publishes a 6-criterion weighted model (relationship 25%, capability 20%, competitive 20%, resources 15%, strategic 10%, budget 10%), 1–5, 75%+ auto-go / 60–74 leadership review / <60 auto no-go ([Arphie](https://www.arphie.ai/blog/rfp-go-no-go-scorecard)).

### GovEagle / CLEATUS (GovCon PWin)
- GovEagle: no proprietary PWin engine; "Bid/No-Bid Analysis" matches RFP requirements to past performance and federal award data. Publishes bands <40 no-bid / 40–70 conditional with "gap owners" / >70 pursue, and a list of calibration errors (single-meeting relationships rated strong, ignoring incumbency, "unknown" competitors) ([GovEagle](https://www.goveagle.com/blog/what-is-pwin-probability-of-win-guide)).
- CLEATUS: 10 factors with a worked 110-point weighting, includes **key personnel, price-to-win, compliance/proposal risk, capture maturity, operational readiness**; recommends back-testing on last 20 bids and rubrics where "a 4 requires evidence a stranger would accept" ([CLEATUS](https://www.cleat.ai/blog/pwin-score-for-government-contracts)).

### Autodesk BuildingConnected / TradeTapp / Bid Board Pro
- TradeTapp scores *subcontractor* risk: custom questionnaires, financial ratios, safety, single-project/annual limits; ratios and thresholds undisclosed; "support — not replace — professional risk judgment"; contact-sales pricing ([Autodesk](https://www.autodesk.com/products/tradetapp/overview); [ConTech Index](https://www.contechindex.com/products/tradetapp)). Public analogue: Massachusetts DCAMM SPL = average of two highest evaluated projects × 1.3–1.8 multiplier, floored at $150k, capped by bonding letter ([Mass.gov](https://www.mass.gov/info-details/dcms-tip-sheet-volume-2-edition-13-single-project-limit)).
- Bid Board Pro analytics: total bids, bids won, **hit rate by count and by dollar value**, active opportunities by status, wins by client, bid history by month, wins by assignee ([BuildingConnected support](https://support.buildingconnected.com/hc/en-us/articles/360009722734-Understanding-your-company-s-analytics-in-BuildingConnected-Bid-Board-Pro)). No pre-bid qualification scoring.

### Procore
- Prequalification = customisable questionnaire ("hundreds of default questions"), approve/deny workflow; no automated opportunity scoring ([Procore](https://www.procore.com/prequalification)). Bid Management = invitations, bid leveling ("compare bids side by side to identify gaps and outliers"), trade-partner performance data ([Procore](https://www.procore.com/bid-management)). Nothing on go/no-go. Pricing is ACV-based, undisclosed.

### Buildertrend, JobTread, Houzz Pro, Knowify
- Buildertrend CRM: lead capture, salesperson, projected sale date, activity templates; published stats are conversion (55.08%) and 27-day median close ([Buildertrend](https://buildertrend.com/blog/data-more-sales-leads/)). **No lead scoring documented** despite the brief's assumption ([Buildertrend CRM](https://buildertrend.com/sales-process/construction-crm/)).
- JobTread: kanban pipeline, lead statuses, web-to-lead custom fields, custom views/reports; no scoring or probability ([JobTread](https://www.jobtread.com/features/construction-crm)).
- Houzz Pro: CRM at $99/mo Design tier, bid management at $199 Pro, $399 Teams; no qualification features ([Houzz](https://www.houzz.com/houzz-pro/pricing)).
- Knowify: job costing/estimating for trades; no bid qualification found ([Knowify](https://knowify.com/)).

### PlanHub, Bidtracer, EstimateOne, ConstructConnect, ConstructionBids.ai, TenderScan, Tenderbolt
- PlanHub: free Essentials (posting, bid mgmt, basic leveling); Pro/Premier/Enterprise unpriced; adds sub prequal and Lead Finder. No bid-decision tooling ([PlanHub](https://planhub.com/pricing-general-contractors/)).
- Bidtracer: bid tracking "from budget to awarded," vendor invites; nothing on scoring ([Bidtracer](https://www.bidtracer.com/services.html)).
- EstimateOne (AU): AUD 6,000–9,000/yr builder plans; tender distribution, quote comparison, AI scope/price discrepancy detection; no go/no-go ([E1](https://estimateone.com/commercial-builders/)).
- ConstructConnect: project leads $129–199/mo per market; bidders lists, "Ask Docs" AI, regional volume trends; no scorecard ([ConstructConnect pricing](https://www.constructconnect.com/pricing); [Project Intelligence](https://www.constructconnect.com/en/products/project-intelligence)).
- ConstructionBids.ai: public-bid discovery, "bid-fit scoring," risk detection, $39–99/mo; scoring method undisclosed — marketing ([ConstructionBids.ai](https://constructionbids.ai/blog/planhub-review-pricing-2026)).
- TenderScan (UAE): AED 99 per document; extracts liability caps, LDs, bonds, insurance, retention, payment schedule, "140+ risk patterns," BID/NO-BID verdict, deadline tracker, PDF export. Algorithm undisclosed ([TenderScan](https://www.tenderscanai.com/ai/tender-analysis)). Tenderbolt: category scores (Risks/Tech/Commercial) with AI reasoning and source citations; "+25% win rate" claim unverified ([Tenderbolt](https://www.tenderbolt.ai/en/features/analysis)).
- ContractsConnected: no product documentation found; likely confusion with ConstructConnect.
- Salesforce for Construction: "gated review process," Agentforce; no published scoring or pricing ([Salesforce](https://www.salesforce.com/engineering-construction-real-estate/construction-software/)). TrebleHook (AEC CRM on Salesforce) lists six criteria incl. **risk profile: contract red flags and client history** and **financial fit: payment terms** ([TrebleHook](https://treblehook.com/the-go-no-go-decision-a-framework-for-choosing-the-right-pursuits/)).
- APMP BoK: qualification content is paywalled (bok.apmp.org); nothing verifiable retrieved — not cited further.

### Residential-specific qualification (pre-rescope; retained for the client-fit criteria it informed)
- Remodelers Advantage: 7 prequalifying questions (lead source, scope, timeline, "investment range," research done, other decision-makers, prior remodel experience); one firm scores location + project type + lead source, 9+ = priority, ≤3 = reject; red flags = unrealistic timeline, budget mismatch, missing decision-maker ([Remodelers Advantage](https://remodelersadvantage.com/turning-time-money-pre-qualifying-prospects-part-2/)).
- Association of Professional Builders warns *against* disqualifying on early budget non-disclosure ([APB](https://blog.associationofprofessionalbuilders.com/builders-qualifying-process)).
- Architecture-firm AI pre-scoring framework adds **legal/contractual risk** and **payment risk** as criteria, kill criteria (litigation history vs design professionals, pay-at-risk language, <30-day turnaround on unfamiliar type), and requires the AI to quote the RFP line justifying every score ([Dan Cumberland Labs](https://dancumberlandlabs.com/blog/using-ai-in-architecture/)).

## 1. Comparison table

| Tool | Opportunity scorecard? | Criteria published | Scale / weights | Verdict bands | Multi-gate | Multi-rater | Kill criteria | Calibration vs outcomes | Visuals | Price |
|---|---|---|---|---|---|---|---|---|---|---|
| Unanet CRM (Cosential) | Yes, configurable | No | Weighted forms | Configurable gates | Yes (gates) | Unclear | Via gates | No | Funnel, projections vs actual | ~$50/user/mo+ |
| Deltek Vantagepoint | Yes, DIY UDFs | Partial (examples) | Points per answer | Go / Go w/ mgmt approval / No | No | No | No | No | Generic dashboards | Enterprise |
| Shipley (method) | Worksheet | Yes (questions) | Qualitative | Advance/defer/end | **3 gates** | Review team | Show-stoppers | Recommended | n/a | Guides paid |
| SMPS/APEX sheet | Yes | Yes | 8 × 0–10, anchored | 56/80 | No | No | No | No | n/a | Free |
| PSMJ / K-J | Yes | Yes | 6 × 0–5 + 7 T/F | 22–30 go; cost >10% rule | No | No | 3-false rule | No | n/a | Free tool |
| BidClarity | Yes | Yes | 12 × 0–10, persona 2× weights | 84/60 of 120 | No | No | No | No | Unknown | $279–349/mo |
| Loopio | Template + readiness score | Template yes | 8 × 1–4 equal | mean ≥2.5 | No | No | No | Advises using win rate | Unknown | Enterprise |
| Responsive | Guidance only | Yes | 1–3, averaged across raters | >80% true | No | **Yes** | No | No | n/a | Enterprise |
| GovEagle / CLEATUS | Analysis, not engine | Yes | 10 factors, 110 pts | 40/70 | Gate-aware | No | No | Recommended (last 20 bids) | Unknown | Quote |
| TradeTapp / Procore Prequal | Sub risk only | No | Ratios, limits | Approve/deny | n/a | n/a | n/a | No | Unknown | Quote |
| Bid Board Pro | No | n/a | n/a | n/a | n/a | n/a | n/a | Hit rate by count & $ | Yes | Quote |
| Buildertrend / JobTread / Houzz / Knowify / PlanHub / Bidtracer / E1 / ConstructConnect | **No** | n/a | n/a | n/a | n/a | n/a | n/a | No | Pipeline only | $99–$9k/yr |
| TenderScan / Tenderbolt | AI doc-read verdict | Partial | Undisclosed | BID/NO-BID | No | No | Risk patterns | No | PDF report | AED 99/doc; quote |
| **v1 scorecard** | Yes | Yes | 15 × 1–5, weights to 100 | 75/40 RAG | No | No | Toggles | No | Bar + radar | Free |

## 2. Feature gaps a free open-source tool can fill (rationale + source)

1. **Three staged gates (Pursuit / Bid / Validate) with different question sets and an "advance / defer / end" outcome**, not one flat score. Shipley's whole method; no construction tool does it. ([Shipley](https://www.shipleywins.com/blogs/problem-solution-bid-decision))
2. **Outcome logging and calibration**: record won/lost/withdrawn, plot predicted PWin vs actual hit rate, Brier score, and suggest weight adjustments. Universally recommended, never shipped. ([CLEATUS](https://www.cleat.ai/blog/pwin-score-for-government-contracts); [Loopio](https://loopio.com/blog/pwin/))
3. **Hit rate by count and by dollar value**, by client, project type, estimator and month — match Bid Board Pro analytics for free. ([BuildingConnected](https://support.buildingconnected.com/hc/en-us/articles/360009722734-Understanding-your-company-s-analytics-in-BuildingConnected-Bid-Board-Pro))
4. **Multi-rater scoring with variance display**: several stakeholders score independently; show mean and disagreement per criterion. Responsive recommends it; nobody visualises it. ([Responsive](https://www.responsive.io/blog/bid-no-bid))
5. **Anchored rating descriptors per criterion** (what a 1 vs 5 means, "evidence a stranger would accept") instead of bare 1–5. ([APEX/SMPS PDF](https://apexalaska.org/wp-content/uploads/2016/09/Go-No-Go-Checklist.pdf); [CLEATUS](https://www.cleat.ai/blog/pwin-score-for-government-contracts))
6. **Persona / project-type presets that multiply weights** (multi-family, commercial TI, specialty surfaces) — BidClarity's 2× persona trick, adapted. ([BidClarity](https://bidclarity.ai/resources/bid-no-bid-decision-framework.html))
7. **"Go with management approval" middle band as a routed state with approver, due date and conditions**, not just amber. ([Deltek](https://www.deltek.com/resources/articles/pursue-the-right-projects-with-go-no-go-in-vantagepoint/))
8. **Pursuit-cost-to-revenue guardrail**: auto no-go/flag when estimated pursuit cost exceeds X% (PSMJ uses 10%) of expected fee/margin; feed into EV panel. ([PSMJ](https://go.psmj.com/blog/go/no-go-is-a-go-for-most-firms))
9. **Payment-risk block**: payment terms, retention %, pay-when-paid, client funding source verified, client payment history, lien rights. Top-4 factors in the 24-study meta-analysis; absent from every construction tool. ([MDPI](https://www.mdpi.com/2075-5309/12/3/379))
10. **Contract red-flag checklist** (liability cap, LDs, consequential damages waiver, no-damages-for-delay, indemnity breadth, bond requirements) with severity, mirroring TenderScan's extracted fields but manual and free. ([TenderScan](https://www.tenderscanai.com/ai/tender-analysis))
11. **Capacity model**: current backlog, estimating hours available, PM/super availability at award date, and **trade-specific backlog (crew and estimating hours)** — "current workload" and "need for work" rank 7–8 globally; trade-level capacity is unaddressed anywhere. ([MDPI](https://www.mdpi.com/2075-5309/12/3/379))
12. **Self-perform uplift**: field for % of scope captured by in-house shops, with margin uplift and schedule-risk reduction feeding EV. No competitor models vertical integration.
13. **Bonding/single-project-limit check**: compare bid value to bonding capacity and to a DCAMM-style SPL (avg of two largest jobs × 1.3–1.8). ([Mass.gov](https://www.mass.gov/info-details/dcms-tip-sheet-volume-2-edition-13-single-project-limit); [BidClarity bonding criterion](https://bidclarity.ai/resources/bid-no-bid-decision-framework.html))
14. **Competitor-perspective view**: score how each named competitor would rate on the same criteria and infer relative position / number of bidders. SMPS asks it; nobody tools it. ([SMPS TC](https://smps-tc.org/images/downloads/go.no_go_process.pdf); [Deltek](https://www.fullsailpartners.com/fspblog/pick-the-winning-rfp-with-deltek-vantagepoint-crm))
15. **Portfolio view**: rank all open pursuits by EV per estimating hour and highlight capacity collisions — SMPS "availability of other projects" factor. ([MDPI](https://www.mdpi.com/2075-5309/12/3/379))
16. **Evidence-required scoring**: each score ≥4 requires a note/quote (RFP line, meeting date). ([Dan Cumberland Labs](https://dancumberlandlabs.com/blog/using-ai-in-architecture/))
17. **Residential client-fit block** (decision-makers present, budget realism vs $/sf, timeline realism, prior build experience, lead source quality, plans/financing status) — from remodeler practice; no residential software scores it. ([Remodelers Advantage](https://remodelersadvantage.com/turning-time-money-pre-qualifying-prospects-part-2/))
18. **Sensitivity / "what would flip this" panel**: show which 1–2 criteria changes move the verdict across a band; GovEagle's "gap owners" made concrete. ([GovEagle](https://www.goveagle.com/blog/what-is-pwin-probability-of-win-guide))
19. **Decision record export (PDF/Markdown)** with scores, rationale, dissent, approver, date — Deltek notifies, TenderScan exports PDF; do both. ([Deltek](https://www.deltek.com/resources/articles/pursue-the-right-projects-with-go-no-go-in-vantagepoint/))
20. **Re-score history per opportunity** (PWin should "update continuously as intelligence arrives") with a timeline chart. ([GovEagle](https://www.goveagle.com/blog/what-is-pwin-probability-of-win-guide))
21. **Bid/no-bid vs "bid to lose / courtesy bid" outcome** — Shipley's "risks of not bidding" and relationship-preservation bids as an explicit third verdict path. ([Shipley](https://www.shipleywins.com/blogs/problem-solution-bid-decision))
22. **Optional local-LLM/paste-in RFP pre-scoring prompt template** that must quote source lines — replicate TenderScan/Tenderbolt without sending documents anywhere. ([Dan Cumberland Labs](https://dancumberlandlabs.com/blog/using-ai-in-architecture/))

## 3. Ten best criteria/questions the v1 scorecard lacked

1. **Client ability to pay / funding verified** — #1 factor (RII 93.4) in 2024 study; #2 in meta-analysis. ([MDPI 2024](https://www.mdpi.com/2075-5309/14/10/3114))
2. **Payment terms and retention** (and client's payment history on past projects) — #1 and #4 in meta-analysis. ([MDPI](https://www.mdpi.com/2075-5309/12/3/379))
3. **Clarity of scope / completeness of documents** — RII 92.8. ([MDPI 2024](https://www.mdpi.com/2075-5309/14/10/3114))
4. **"To what extent have we influenced the requirements? Does the customer rely on us for input?"** — Shipley bid gate. ([Shipley](https://www.shipleywins.com/blogs/problem-solution-bid-decision))
5. **"When did we learn of this opportunity?"** (pre-advertisement vs public posting) — SMPS "opportunity awareness"; Deltek. ([APEX PDF](https://apexalaska.org/wp-content/uploads/2016/09/Go-No-Go-Checklist.pdf))
6. **Incumbent / pre-favored competitor?** and **number of bidders** — Shipley, Deltek, meta-analysis #13. ([Deltek](https://www.fullsailpartners.com/fspblog/pick-the-winning-rfp-with-deltek-vantagepoint-crm))
7. **Proposal cost as % of potential revenue** (>10% = no-go signal). ([PSMJ](https://go.psmj.com/blog/go/no-go-is-a-go-for-most-firms))
8. **Key personnel named and available at award** (PM/super), plus **qualified labour availability** (RII 90.2). ([CLEATUS](https://www.cleat.ai/blog/pwin-score-for-government-contracts); [MDPI 2024](https://www.mdpi.com/2075-5309/14/10/3114))
9. **Contract terms: liability cap, LDs, bond and insurance requirements acceptable?** — Shipley validation "show-stoppers"; TenderScan's extracted fields. ([TenderScan](https://www.tenderscanai.com/ai/tender-analysis))
10. **"What are the risks of NOT bidding?"** (relationship, competitor foothold, shop utilisation) — Shipley pursuit gate; the only source that scores the no-bid side. ([Shipley](https://www.shipleywins.com/blogs/problem-solution-bid-decision))

## Marketing-vs-evidence flags
- Unanet "80%/100% prediction" — one user anecdote, no method. Shipley "double or triple win rates" — unsourced. Tenderbolt "+25% win rate," TenderScan "140+ risk patterns," ConstructionBids.ai "bid-fit scoring" — undisclosed algorithms. Buildertrend "lead scoring" — not found in any Buildertrend documentation; the brief's premise appears wrong. Every tool's weights/thresholds (75/60, 84/60, 56/80, 70/40) are convention, not validated — the meta-analysis is the only outcome-based evidence located.
