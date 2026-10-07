# Contributing

BidGate is maintained as a portfolio reference implementation of a commercial decision process rather than as a general-purpose open-source product.

## Feedback

Issues are useful when they identify a modelling or calculation error, an unclear assumption, a mismatch between a business rule and its documentation, an accessibility or usability problem, or a test case that exposes an unintended decision outcome.

When reporting an issue, include the inputs or steps needed to reproduce it and the expected versus actual result. Do not submit confidential tender, client, employer or project data.

## Proposed changes

1. Create a branch from `main`.
2. Keep the change focused and explain the operating or technical reason for it.
3. Add or update tests when decision behaviour changes.
4. Run `node --test` and `node scripts/build-single.mjs`.
5. Open a pull request describing what changed, why, and any assumptions affected.

The priority is transparent, testable decision logic rather than feature volume.
