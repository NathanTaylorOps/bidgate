# ADR-0004 · Swing weighting recommended; AHP optional; direct weights labelled "quick mode"
**Status** accepted · 2026-09-16

## Context
The UK Government Analysis Function's MCDA guide states that simple importance weighting "is not a valid approach" — it conflates importance with the range of performance. Swing weighting is its recommended method. AHP (Saaty) provides a consistency check but exhibits rank reversal when alternatives are added (Belton & Gear 1983).

## Decision
Three methods in Settings: direct (quick), swing (recommended in Expert mode), AHP wizard (pairwise 1–9, geometric-mean priorities, CR with Saaty RI table, worst-cell nudge). AHP is used only to derive group weights, where rank reversal is not an issue.

## Consequences
+ Weights are defensible in a review.
− Swing weighting requires anchored scales to exist first — which is why every criterion ships with BARS anchors.
