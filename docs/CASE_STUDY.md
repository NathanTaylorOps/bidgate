# Case Study — Turning Bid Selection into a Management System

## Executive summary

BidGate is a portfolio evolution of a bid-qualification process I developed while working as a Project Manager and estimating lead in commercial flooring and tile.

The original problem was operational rather than technical: **estimating capacity was finite, not every opportunity deserved the same effort, and revenue alone was a poor measure of whether a job was worth pursuing.**

The first solution was deliberately simple. I introduced a structured qualification process around factors such as client relationship, payment risk, scope clarity, relevant experience, estimating workload, deal size, margin and competitive intensity. It sat inside a broader estimating improvement effort.

In that operating environment, the broader improvements delivered:

| Measure | Operating outcome |
|---|---:|
| Estimating rework | **30% reduction** |
| Average margin | **8% improvement** |
| Major-bid throughput | **from roughly one every two weeks to 2–4 per week** |
| Small-bid turnaround | **from 2–4 days to hours–1 day** |
| Qualified bids | **majority won** |

These are results from the operating process and team in which the original calculator was used. They are **not measured results produced by this public portfolio application**.

BidGate asks a later question: if that practical qualification process were rebuilt as a transparent management system, what should it include?

---

## 1. The operating problem

A contractor can have a large pipeline and still be allocating its effort badly.

Every pursuit consumes resources before award:

- estimator time;
- management attention;
- supplier and subcontractor input;
- working capital planning;
- future crew capacity;
- commercial and contractual risk capacity.

The obvious question — *“Can we price this?”* — is therefore incomplete.

The management question is:

> **Should the business commit scarce estimating, working-capital and delivery capacity to this opportunity, and what would change that decision?**

A weak pursuit process creates several failure modes. Teams can spend heavily on low-probability bids, chase revenue that does not fit capacity, accept payment or contract risk because the headline margin looks attractive, or make decisions in meetings that leave no usable record for later learning.

## 2. Why a single score is not enough

A weighted spreadsheet is useful until it allows a genuinely unacceptable condition to be averaged away.

For example, a bid might have a strong client relationship, attractive value and good strategic fit while still containing a commercial condition that management is unwilling to accept. Treating all of those factors as compensating inputs can produce a mathematically respectable answer that does not match the organisation's actual risk appetite.

BidGate therefore separates the decision into different questions:

1. **Is there a non-negotiable reason not to proceed?**
2. **How attractive is the work to us?**
3. **How likely are we to win it?**
4. **Does the expected return justify the pursuit cost and risk?**
5. **Can we fund and resource it alongside existing work?**
6. **How sensitive is the answer to uncertain assumptions?**
7. **Who has authority to approve the decision or override the recommendation?**
8. **What happened afterwards, and were our assumptions any good?**

This separation is the core design choice.

## 3. The management process

The operating flow is:

**Opportunity → hard gates → attractiveness & winnability → economics → cash & capacity → uncertainty → approval decision → outcome → calibration**

### Hard gates

True deal-breakers are evaluated before the weighted assessment. A failed gate cannot disappear inside a good average.

### Attractiveness and winnability

These remain separate. A business can strongly want a project it is unlikely to win, or have a strong chance of winning work it should not want.

### Economics

The system connects win probability, expected gross profit and pursuit cost rather than looking at revenue in isolation.

### Cash and capacity

An attractive job can still be the wrong job if its working-capital requirement, retention/AR exposure, estimating demand or installation demand conflicts with the live portfolio.

### Uncertainty

Sensitivity, switching values and simulation expose which assumptions actually drive the recommendation. The aim is not to make uncertainty disappear; it is to make management aware of where it matters.

### Decision and accountability

The model supports the decision. It does not own it. Overrides remain possible because management may know something the model does not. The reason for an override is recorded rather than silently replacing the recommendation.

### Outcome and calibration

The original forecast is preserved before the actual outcome is entered. Won/lost results and actual margin can then be compared with the prior judgement. That turns a one-off scoring exercise into a feedback loop.

## 4. Three examples of management judgement

The public application contains six synthetic bids. These are demonstrations only; they contain no employer or client data.

### Scenario A — attractive opportunity, unacceptable commercial condition

A commercial TI opportunity may look viable on value and delivery factors but contain a condition-precedent pay-if-paid clause that management will not accept.

**Management response:** the hard gate takes precedence over the attractive weighted score. The bid is not allowed to become a GO merely because enough other criteria are strong.

### Scenario B — strategically attractive, but conditions remain unresolved

A public athletic-field package may have strong strategic/reference value while certification, product or delivery conditions are still unresolved.

**Management response:** treat the opportunity as conditional rather than forcing a premature binary answer. The conditions become actions that must be resolved before commitment.

### Scenario C — strong opportunity that exceeds routine authority

A large commercial package may be attractive and deliverable while its size, contract exposure or organisational consequence warrants a named senior approver.

**Management response:** route it for approval rather than treating “good project” and “delegated authority” as the same question.

These scenarios demonstrate a broader principle: **good governance preserves useful management judgement while making the decision path explicit.**

## 5. Decision rights

In a real company, the model would sit inside an agreed authority structure.

A practical pattern is:

- estimators or business development enter the opportunity and evidence;
- operations contributes delivery and capacity information;
- commercial leadership validates material assumptions;
- routine opportunities can be cleared within delegated limits;
- conditional, high-value or exceptional opportunities move to the appropriate executive;
- overriding a gated or NO-GO recommendation requires an identified owner and rationale;
- outcomes are recorded so the organisation can review whether its judgement is improving.

The exact thresholds should be company-specific. The public version intentionally does not pretend that one authority matrix fits every business.

See [Implementation & Governance](IMPLEMENTATION.md) for an illustrative RACI and operating cadence.

## 6. What I would measure after implementation

Adoption should not be judged by logins or number of forms completed. I would look for changes in operating outcomes such as:

- estimating hours per qualified opportunity;
- turnaround time;
- avoidable estimating rework;
- qualified win rate;
- gross-margin quality;
- percentage of opportunities screened out early for a documented reason;
- management override frequency and recurring override themes;
- working-capital exceptions;
- forecast calibration;
- variance between expected and actual margin.

The objective is not to maximise the number of bids. It is to improve the quality of the opportunities the business chooses to pursue and the evidence behind those choices.

## 7. How I would implement it

I would not deploy the public application unchanged.

The operating process would come first:

1. map the current pursuit process and decision rights;
2. identify actual failure modes and existing approval limits;
3. configure company-specific gates, thresholds and assumptions;
4. run the process in parallel with current management decisions;
5. investigate disagreements rather than assuming the model is correct;
6. refine ambiguous or low-value criteria;
7. train the people making and approving the decisions;
8. integrate reliable source data where it reduces manual effort;
9. establish weekly pursuit and periodic calibration reviews;
10. only then make the process part of formal governance.

A production implementation would also need authentication, role-based access, persistent controlled storage, audit logging, integration, security review, backup/recovery, controlled configuration and jurisdiction-specific legal review.

## 8. What this demonstrates about my approach

BidGate is useful to my portfolio because it shows the full path from an operating problem to a governed system.

The work starts with **resource allocation and commercial judgement**, not software. It requires deciding which risks are non-compensatory, what belongs with management rather than an algorithm, how cash and capacity affect commercial decisions, what evidence should be retained, and how the organisation learns after the decision.

The application is the implementation of that thinking.

The same approach applies beyond estimating: identify the real constraint, make assumptions visible, define decision rights, connect the decision to operating consequences, test the result and improve the process from evidence.

## 9. Boundaries

BidGate is a portfolio reference implementation for a US flooring, tile and specialty-surface subcontractor. The sample data are synthetic.

It is not legal advice, an autonomous bidding system, a universal construction model or a production ERP/CRM. Its assumptions and thresholds require company-specific calibration.

Those boundaries are intentional and documented in [Limitations](LIMITATIONS.md).

---

**Live application:** [BidGate](https://NathanTaylorOps.github.io/bidgate/)  
**Management output:** [Example decision memo](../assets/memo.pdf)  
**Model detail:** [Methodology](METHODOLOGY.md)  
**Deployment approach:** [Implementation & Governance](IMPLEMENTATION.md)
