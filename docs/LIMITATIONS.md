# Limitations

BidGate is a decision-support portfolio project. Its limitations are stated explicitly so the output is not mistaken for certainty or production authority.

## Scope

The current model is designed around a US flooring, tile and specialty-surface subcontractor bidding packages to general contractors. Its criteria and defaults should not be assumed to transfer unchanged to a general contractor, infrastructure owner, public authority or another trade.

## Portfolio implementation

The public build uses browser-local storage and explicit JSON / URL sharing. It does not provide enterprise authentication, role-based access, a controlled server-side database, immutable audit logging, system integration, backup/recovery or central configuration management.

Those omissions are acceptable for a public demonstration with synthetic data; they would not be acceptable for commercially sensitive production bid data.

## Decision model

Weights, thresholds and route assumptions are defaults, not universal standards. They need to be calibrated to the organisation using the process.

The working-capital model is a decision aid rather than a full project-finance or treasury model. Timing, billing behaviour, retention release, credit availability and overlapping jobs can differ materially from simplified assumptions.

Probability-of-win estimates are uncertain, particularly before a company has recorded enough of its own outcomes. BidGate deliberately avoids fitting a predictive model to a small sample.

Monte Carlo output describes uncertainty in the assumptions supplied to the model. It does not discover unknown risks or make poor inputs reliable.

## Legal and contractual risk

US subcontractor payment, lien, bond and contract rules vary by jurisdiction and contract wording. BidGate can surface those issues for review; it is not legal advice and should not replace project-specific legal/commercial review.

## Human judgement

A structured model can make assumptions and inconsistencies visible, but it cannot replace management accountability. Strategic context, client intelligence, delivery conditions and risks outside the model may justify a different decision.

For that reason, overrides are allowed and recorded rather than prohibited.

## Evidence and results

All demonstration bids are synthetic. No employer, client or confidential project data are included.

The operating results described in the README relate to the real estimating environment and broader process from which the original qualification concept developed. They should not be interpreted as measured results produced by this public portfolio application.

## Production readiness

A production implementation would require company-specific configuration, integration, security controls, data governance, user acceptance testing, operational ownership and an agreed change-management process.

The distinction is intentional: **implemented is not the same as verified, and verified is not the same as production-ready.**
