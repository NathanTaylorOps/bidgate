# ADR-0002 · Gates are evaluated before, and independently of, the score
**Status** accepted · 2026-09-16

## Context
An additive scorecard is compensatory: strengths offset weaknesses. "Client cannot pay" at 1/5 is buried by four 5/5s. Gilbride & Allenby (2004) formalise conjunctive screening: alternatives must pass every must-have before compensatory evaluation.

## Decision
Stage 1 evaluates gates (criterion gates at score 1, manual deal-killers, capacity gates). Any hit → verdict `NO-GO (GATED)`. The compensatory score is still computed and displayed, greyed, so users learn what the gate protected. Stage 3 adds a weakest-link floor: any `floor` criterion ≤ 2 caps the verdict at CONDITIONAL.

## Consequences
+ "No" is representable.
+ Which criteria carry gates is an explicit, reviewable list (`gate: { at: 1 }` in criteria.js).
− Users can be surprised that a 90-point bid is NO-GO. The UI shows the gate list prominently and the score underneath.
