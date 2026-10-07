# Portfolio evidence

These assets are outputs from the live BidGate application rather than concept mock-ups. The screenshots were captured from the GitHub Pages build with charts rendered normally.

- `decision.png` — **primary management view** for the synthetic Meridian Place Apartments sample. It shows the decision layer: sensitivity, weakest links, mitigations and pre-mortem. This is the primary README image because BidGate is intended to support a management decision, not simply produce a score.
- `score.png` — **supporting assessment view** for the same sample. It shows the structured scoring evidence behind the recommendation, including attractiveness and winnability.
- `memo.pdf` — **one-page decision record** for the same sample, generated from the application and stripped of browser print headers and footers.

All demonstration data are synthetic.

CI (`.github/workflows/ci.yml`) runs the engine tests, rebuilds `dist/bidgate.html` and checks the committed build against source, then runs the browser smoke test (`scripts/smoke.mjs`) before Pages deployment.
