# Contributing

Thanks for looking. This is a small, opinionated tool; contributions that sharpen the methodology are the most welcome.

## Ground rules
- **Every threshold or weight needs a source or a `judgement call` label.** No unsourced constants.
- **No real project, client, price or employer data** — in code, samples, issues or screenshots. Synthetic only.
- **Engine changes need tests.** `node --test` must pass. Add a case for any new formula.
- **Gate/capacity constants carry `valid_from`.** If you update a threshold, cite the source and date.
- **No build tooling, no framework.** Plain ES modules; Chart.js is the only runtime dependency.

## Workflow
1. Fork, branch from `main`.
2. `node --test` and `node scripts/smoke.mjs` (needs Playwright's Chromium locally; optional).
3. Update `CHANGELOG.md` under *Unreleased*. Schema changes → note the MAJOR bump.
4. Open a PR. Explain the decision, not just the diff — an ADR in `docs/adr/` if it changes how the tool reasons.

## Good first issues
- Add anchors for a criterion you think is missing (with a source).
- Add a preset for your trade or market (subcontract forms, retention norm, gates).
- Translate the mitigation library into your trade's language.
