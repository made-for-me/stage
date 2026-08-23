# Branch Studio

Branch Studio removes the merge-to-preview loop from Expo UI development.

The opening screen is a visual library of branches for one configured project. Each branch is a shelf of screenshots captured from the current commit, with its SHA, compatibility, session state, and refresh time kept close to the imagery. Selecting a shelf adds it to the two-up comparison stage. The AR2 command surface opens the shared development client, starts live web comparisons, and requests fresh captures without exposing a traditional operator dashboard.

## Experience principles

- Branch identity is always visible.
- Screens, not status chrome, are the primary branch content.
- Screenshots are scoped to branch, commit, and route; stale commits never appear as current scenes.
- Comparison is a primary workflow, not a settings feature.
- Stage Tester is the default ClubHall preview identity.
- Runtime incompatibility is explicit and blocks unsafe assumptions.
- The dashboard stays useful when the target repository is missing: configured branches remain visible with setup guidance.
- Stage owns processes it starts and stops them when the control-plane server closes.

## Current surface

- Local Git branch discovery, including `origin/*` refs.
- Isolated detached worktrees.
- One Metro port per session.
- Web and development-client targets.
- Two-up web comparison workspace.
- Session lifecycle, logs, status polling, and stop control.
- SDK and Stage runtime-fingerprint preflight.
- Persistent per-commit scene manifests and a local AR2 screenshot ingestion API.

## Later surface

- `stage-runner` simulator workers and WebRTC streams.
- Automated scene navigation, screenshot capture, and visual diffs per commit.
- EAS Update snapshots for remote review.
- More than two synchronized comparison slots.
