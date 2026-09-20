# ADR-0008 · Okabe-Ito semantic palette, dual-encoded
**Status** accepted · 2026-09-16

## Context
Red/amber/green is the industry idiom for bid verdicts, and roughly 1 in 12 men cannot rely on it. WCAG 1.4.1 requires that colour is not the only means of conveying information.

## Decision
Verdict tones use the Okabe-Ito colour-blind-safe palette (vermilion #D55E00, orange #E69F00, bluish-green #009E73, blue #0072B2). Every state is also carried by an icon (⛔ ✖ ▲ ◐ ✔) and a word. Score buttons 1–5 use a five-step scale from the same palette. Charts read tokens at draw time so both themes stay legible.

## Consequences
+ Verdicts are readable in greyscale print.
− The greens/reds are not the saturated defaults people expect; the memo header uses a border, not a fill, for the same reason.
