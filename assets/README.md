Screenshots used by the top-level README, captured from the live GitHub Pages build (`https://nathantaylorops.github.io/bidgate/`) with charts rendering for real — not the headless-Chromium/Chart.js-stub captures CI's own smoke run uses.

- `score.png` — Score view for the "Meridian Place Apartments" sample bid (multifamily preset, scores GO).
- `decision.png` — Decision view for the same bid: sensitivity tornado, weakest links & mitigations, pre-mortem.
- `memo.pdf` — the one-page printable decision memo for the same bid, generated headless and stripped of any browser print header/footer.

CI (`.github/workflows/ci.yml`) runs the unit tests, rebuilds `dist/bidgate.html` and fails if that changes anything the committed copy doesn't already have, then runs the headless smoke test (`scripts/smoke.mjs`) against every view before deploying to Pages.
