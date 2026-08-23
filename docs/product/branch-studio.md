# Branch Studio

Branch Studio removes the merge-to-preview loop from Expo UI development.

The opening screen is a collection of branches for one configured project. Each branch exposes its SDK, commit, Stage runtime fingerprint, availability, compatibility, and active sessions. `Open` launches the branch in the shared development client. `Compare` starts an embeddable web session and pins it to one of two comparison slots. `Stop` ends the owned Metro process without deleting the cached worktree.

## Experience principles

- Branch identity is always visible.
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

## Later surface

- `stage-runner` simulator workers and WebRTC streams.
- Screenshot capture and visual diffs per commit.
- EAS Update snapshots for remote review.
- More than two synchronized comparison slots.
