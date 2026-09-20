# ADR-0001 · Single file, no build step
**Status** accepted · 2026-09-16

## Context
The primary user is an estimating manager or owner-operator, not a developer. The tool must open from a USB stick, an email attachment or a SharePoint folder, and still work in two years.

## Decision
Plain HTML + ES modules, no framework, no bundler, no npm install. Chart.js is the only runtime dependency, loaded from cdnjs. `scripts/build-single.mjs` emits `dist/bidgate.html` by inlining every module through an import map of `data:` URLs — module semantics are preserved and nothing is transpiled.

## Consequences
+ Zero maintenance surface; anyone can read the source in a browser.
+ Engine is pure functions and testable with `node --test`.
− ES modules need `http://` for local dev (`python3 -m http.server`), not `file://`; the single-file build has no such restriction.
− No TypeScript; JSDoc carries the types.
