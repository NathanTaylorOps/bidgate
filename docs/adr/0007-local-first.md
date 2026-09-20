# ADR-0007 · Local-first; nothing leaves the browser
**Status** accepted · 2026-09-16

## Context
Bid pipelines are commercially sensitive. A hosted backend would need auth, a privacy policy and a security posture this project cannot promise.

## Decision
State lives in `localStorage` under a versioned key with a migration function. Export/import is JSON. One bid can be shared via a base64url payload in the URL fragment (fragments are not sent to servers). No analytics, no fetches.

## Consequences
+ Zero infrastructure; works offline.
− Data is per browser. Users must export to move machines. Private windows lose data on close — the UI says so in Settings.
