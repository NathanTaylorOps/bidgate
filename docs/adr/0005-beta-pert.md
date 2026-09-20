# ADR-0005 · Beta-PERT for three-point inputs
**Status** accepted · 2026-09-16

## Context
Triangular distributions over-weight the mode and have hard, linear tails. Beta-PERT (mean = (min + 4·mode + max)/6) concentrates mass near the mode with soft tails and is the convention in schedule and cost risk.

## Decision
All three-point inputs (value, margin, P(win)) are sampled from beta-PERT via two Gamma draws (Marsaglia–Tsang). RNG is seeded (mulberry32) so tests are deterministic and a user re-opening a bid sees the same histogram.

## Consequences
+ ~40 lines of code; 4,000 iterations render instantly.
− Users must supply a low and high; defaults come from the preset's margin band.
