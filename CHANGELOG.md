# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/); versions follow [SemVer](https://semver.org/). A change to the saved-bid or preset schema is a MAJOR bump.

## [Unreleased]
- Blind multi-rater mode
- Logistic fit unlocked at ≥ 60 outcomes
- BYOK AI pre-scoring with quoted evidence

## [3.0.0] — 2026-09-17
### Changed — BREAKING: full domain rescope, schema bump (`SCHEMA_VERSION` 2 → 3)
BidGate is rescoped from a vertically-integrated custom home builder (owned trade shops, AU/QLD regulatory regime) to a **US flooring / tile / specialty-surface subcontractor** bidding discipline packages (US$100K–$4M) to general contractors — the domain the original spreadsheet this tool descends from was built for. See `README.md` §Why I built this.

- **Criteria library rewritten**: 42 criteria across 7 groups (`Client & Payment`, `Project & Scope`, `Contract & Risk`, `Capacity & Backlog`, `Materials & Installation`, `Strategic Value`, `Competitive Position`). All criterion ids changed. "Client" now means the GC, not the owner. New criteria for substrate/moisture-testing risk, product lead-time, unit-turn scheduling, turf/athletic certification, pay-if-paid vs pay-when-paid, flow-down clauses, retainage timing, Miller Act / mechanics-lien rights, estimating-team and installation-crew capacity, and material price volatility.
- **`Self-Perform & Shops` group removed**, replaced by **`Materials & Installation`** (material price/lead-time volatility, installer certification, QC/moisture documentation, specialist-sub dependency, warranty/callback exposure by failure mode). No hours-based shop-utilisation tracking — the group is scored qualitatively like every other group.
- **Presets replaced**: `vi_custom`, `small_gc`, `qld_residential`, `au_commercial`, `public_hardbid` → `multifamily` (Multi-Family / Apartment Flooring & Tile), `commercial_ti` (Commercial TI Flooring & Tile), `specialty_turf` (Specialty Surfaces — Athletic / Turf, public hard-bid dynamics folded in rather than a fourth preset). All presets are USD-only.
- **AU/QLD regulatory-preset machinery removed entirely**: `AUD_LOCALE`, QBCC MFR categories, PQC one-third rule, Home Warranty Scheme and QLeave levies, BIF Act trust-account thresholds, AS 4000/4902/2124 contract-form references. `leviesFor()` now always returns `[]` for the shipped presets (mechanism kept for future extensibility, covered by a test).
- **`src/engine/capacity.js` simplified**: removed `shopLoading()`, `bespokeLoad()`, `bondHeadroom()` and their AU-specific gate checks (QBCC MFR, PQC one-third rule, licence-GFA). `capacityGates()` now checks retention/AR exposure vs facility, estimator + crew load, and working-capital ratio only.
- **`src/ui/state.js`**: `SCHEMA_VERSION` bumped to 3; bid shape drops `shops[]`, bespoke/first-of-kind fields, and all QBCC/PQC econ fields (`isGovernment`, `hasPqc`, `mfrCategoryId`, `fyRevenue`, `fyBacklog`, `licenceClass`, `gfa`, `buildingClass`); adds `estimatorLoadAfter` / `crewLoadAfter`. `migrate()` now drops unrecognised criterion ids and unrecognised-preset saved bids instead of assuming they still apply, so a pre-3.0 save loads without crashing (with reduced data) rather than being silently wrong.
- **`Capacity & Shops` view renamed `Capacity & Materials`**: owned-shop hours table and bespoke-scope contingency inputs replaced with a read-only Materials & Installation score summary; bond-headroom UI removed.
- **Samples, decision-memo devil's-advocate prompts and README updated** to the new domain. `docs/METHODOLOGY.md` §§9–11 rewritten: US subcontractor payment/bond-claim law (pay-if-paid vs pay-when-paid, Miller Act, mechanics liens) replaces the QLD/AU regulatory-modelling section.

## [2.0.0] — 2026-09-16
### Added
- Three-stage evaluation: gates → two-axis compensatory score → weakest-link floor; `GO WITH APPROVAL` routed band
- 40-criterion library with BARS anchors, gate/floor flags, context tags and evidence pointers
- Five presets incl. AU/QLD regulatory presets (since removed in 3.0.0)
- Swing weighting and AHP wizard with consistency ratio and worst-cell nudge
- P(win): empirical-Bayes shrinkage, competitor scaling, position shift, Friedman/Gates price curves, winner's-curse flag
- Expected value with levies, bid cost by route, break-even P(win), pursuit ratio, risk adjustment
- Beta-PERT Monte Carlo (seeded) with P10/P50/P90 and P(loss)
- Capacity & cash: peak negative cash, portfolio S-curve overlap vs facility, bond headroom, staffing gates
- Self-perform & shops: utilisation regimes, collision penalty, contribution-floor guard, first-of-kind contingency, warranty/LTV
- Decision view: tornado, switching values in words, weight robustness, weakest links with mitigations, pre-mortem, devil's advocate, override reason
- Pipeline 2×2 bubble chart, side-by-side heat map, CSV export
- Calibration: Brier, Murphy decomposition, reliability diagram, hit rate by count and value, criterion separation, override rate
- Printable one-page decision memo
- JSON export/import, URL-fragment sharing, schema migration, dark/light theme, keyboard-first scoring
- 35 engine tests (`node --test`), headless smoke test, single-file build

### Changed
- Replaced v1 five-group additive scorecard entirely. v1 saved bids are not migrated (different model).

## [1.0.0] — 2026-09-16
- Initial single-file scorecard: 5 groups, 15 criteria, RAG verdict, EV panel, bar + radar, presets, saved bids, CSV.
