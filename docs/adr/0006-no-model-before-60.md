# ADR-0006 · No fitted model below 60 decided outcomes
**Status** accepted · 2026-09-16

## Context
Lowe & Parvar (2004) and Leśniak et al. (2021) show logistic regression / LDA on a single firm's history reaches 86–95 % with 6–8 variables — on 88–100+ records. Wanous (2003)'s neural network gained 5 points over a parametric model at the cost of interpretability. The Calibration view's reliability diagram uses 5 bins so each bin holds roughly ten or more outcomes in the first year of logging.

## Decision
The Calibration view shows Brier score, reliability diagram, hit rates and won-vs-lost criterion separation, labelled *explore, not optimise*. A logistic fit is on the roadmap, unlocked only at ≥ 60 decided outcomes, with coefficients displayed beside the user's weights rather than replacing them.

## Consequences
+ No false precision from over-fitting 15 records.
− Users who want "the tool to learn" must wait. The text tells them why.
