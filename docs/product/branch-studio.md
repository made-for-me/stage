# Branch Studio

Branch Studio removes the merge-to-preview loop from Expo UI development.

The opening screen is a visual history of branches for one configured project. Each branch is a reel of screenshots captured from the current commit, with its SHA, capture state, and refresh time kept close to the imagery. Selecting two reels opens a route-matched screenshot comparison. The AR2 command surface requests fresh captures and drives comparison without exposing a traditional operator dashboard.

## Experience principles

- Branch identity is always visible.
- Screens, not status chrome, are the primary branch content.
- Screenshots are scoped to branch, commit, and route; stale commits never appear as current scenes.
- Comparison is a primary workflow, not a settings feature.
- Stage itself has no account layer; it is a personal local product.
- Runtime incompatibility is explicit and blocks unsafe assumptions.
- The dashboard stays useful when the target repository is missing: configured branches remain visible with setup guidance.
- Stage owns processes it starts and stops them when the control-plane server closes.

## Current surface

- Local Git branch discovery, including `origin/*` refs.
- Isolated detached worktrees.
- One Metro port per session.
- A persistent, SHA-pinned AR2 capture queue.
- Route-matched screenshot comparison and full-size scene inspection.
- Session lifecycle retained only as capture/open-app infrastructure.
- SDK and Stage runtime-fingerprint preflight.
- Persistent per-commit scene manifests and a local AR2 screenshot ingestion API.

## Later surface

- Automated scene navigation and native screenshot capture workers.
- Content-hash change labels and later pixel-level visual diffs per commit.
- EAS Update snapshots for remote review.
- More than two synchronized comparison slots.
