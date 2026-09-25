# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/); versions follow [SemVer](https://semver.org/).

## [Unreleased]
- Blind multi-rater mode
- Logistic P(win) fit unlocked at ≥ 60 recorded outcomes
- BYOK AI pre-scoring with quoted evidence

## [1.0.0] — 2026-09-17

Bid go/no-go tool for a US flooring / tile / specialty-surface subcontractor bidding discipline packages (US$100K–$4M) to general contractors.

- **Three-stage evaluation**: gates → two-axis compensatory score → weakest-link floor, plus a coverage gate — no verdict is issued while a gate criterion is unscored or weighted coverage is below threshold (`INCOMPLETE`), so a good total can never hide behind an unanswered question.
- **42-criterion library** across 7 groups (Client & Payment, Project & Scope, Contract & Risk, Capacity & Backlog, Materials & Installation, Strategic Value, Competitive Position) with BARS anchors, gate/floor flags, context tags and evidence pointers.
- **Swing weighting and an AHP wizard** with consistency ratio and worst-cell nudge (snapped to the Saaty scale).
- **P(win)**: empirical-Bayes shrinkage, competitor scaling, position shift, Friedman/Gates price curves, winner's-curse flag.
- **Expected value** with levies, bid cost by route, break-even P(win), pursuit ratio, risk adjustment.
- **Beta-PERT Monte Carlo** (seeded) with P10/P50/P90 and P(loss).
- **Capacity & cash**: peak negative cash read off the same portfolio simulation as the rest of the pipeline (so a single job's peak can never exceed a portfolio total that includes it), staffing and working-capital gates.
- **Decision view**: tornado, switching values in words, weight robustness, weakest links with mitigations, pre-mortem, devil's advocate, override reason.
- **Pipeline**: 2×2 bubble chart, side-by-side heat map, CSV export, frozen predictions once an outcome is recorded — calibration always compares the forecast made at bid time against what happened, never a forecast revised with hindsight.
- **Calibration**: Brier score and Murphy decomposition (5 equal-width bins), reliability diagram, hit rate by count and value, criterion separation, override rate.
- **Printable one-page decision memo.**
- **JSON export/import, URL-fragment sharing** (a shared bid carries the sender's effective weights on that bid alone — it never touches the recipient's own settings), schema migration, dark/light theme, keyboard-first scoring.
- 43 engine tests (`node --test`), a headless smoke test, single-file build, CI (lint, test, smoke, build-parity check, deploy).

All sample data is synthetic. Nothing here reflects any employer's real bids, prices or projects.
