# Implementation & Governance

BidGate is a portfolio reference implementation of a management process. Deploying the concept in a real business would be an operating-model change, not simply a software installation.

## 1. Start with the decision

Define the decision the organisation is trying to improve: which opportunities deserve estimating effort, management attention, working capital and future delivery capacity.

Document the current process before configuring the tool. Capture who participates, what information is available at each stage, current approval thresholds, common exceptions, known failure modes and how outcomes are recorded.

## 2. Establish decision rights

A practical authority model could look like this:

| Activity | Estimator / BD | Project / Ops | Commercial lead | GM / delegated executive |
|---|---|---|---|---|
| Enter opportunity and evidence | R | C | C | I |
| Score operational criteria | R | R/C | C | I |
| Validate commercial assumptions | C | C | R/A | I |
| Clear routine GO within authority | C | C | R/A | I |
| Approve conditional / above-limit pursuit | C | C | R | A |
| Override a gated or NO-GO recommendation | I | C | R | A |
| Record outcome and actual margin | R | C | A | I |
| Review calibration / change thresholds | C | C | R | A |

This is illustrative only. Authority limits should follow the organisation's actual delegations.

An override should identify the decision owner, reason, conditions and review point. The system informs the decision; accountability stays with the authorised manager.

## 3. Configure company assumptions

Replace portfolio defaults with controlled company settings:

- minimum acceptable margin and return thresholds;
- client/payment-risk rules;
- working-capital and credit availability;
- estimating and delivery capacity;
- strategic account priorities;
- contract-risk tolerances;
- delegated approval limits;
- historical win rates by route/client/segment;
- relevant jurisdictional requirements.

Record who approved each material assumption and when it was last reviewed.

## 4. Pilot before enforcement

Run BidGate beside the existing pursuit process before allowing it to affect authority.

During the pilot:

1. score real opportunities without changing the existing decision;
2. compare the system output with management judgement;
3. investigate disagreements rather than automatically treating either side as correct;
4. record won/lost/withdrawn outcomes and actual margin where available;
5. identify criteria that are unclear, duplicated or not decision-useful;
6. review false gates and missed risks;
7. adjust configuration through controlled governance.

The objective is not agreement with the model. It is a better, more explicit decision process.

## 5. Embed it in the operating cadence

### Weekly pursuit review

Review new opportunities, failed gates, conditional decisions, estimating load, delivery constraints, cash exposure and approvals requiring action.

### Monthly commercial review

Review pipeline conversion, margin, overrides, forecast accuracy, client/payment patterns and material changes to capacity.

### Quarterly governance review

Review thresholds, weighting, recurring overrides, model calibration, user behaviour and whether the process is still solving the intended business problem.

## 6. Production controls

A real deployment would require controls not present in this portfolio build:

- authenticated users and role-based access;
- persistent controlled database;
- immutable audit history for material decisions;
- integration with CRM, estimating, ERP/job-cost and finance systems;
- backup, recovery and retention policies;
- security and privacy review;
- jurisdiction-specific legal review;
- configuration/version control;
- monitoring and support ownership;
- user acceptance and regression testing;
- documented change authority.

## 7. Success measures

The implementation should be judged on operating outcomes, not software usage alone. Useful measures include estimating hours per qualified opportunity, bid turnaround, qualified win rate, gross-margin quality, avoidable bid rework, management override rate, forecast calibration, working-capital exceptions and the share of pursuits abandoned early for a documented reason.

The aim is not to maximise bids. It is to improve the quality of work the business chooses to pursue and the evidence behind those decisions.
