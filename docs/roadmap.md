# Roadmap

## Milestone 1 (complete)

**Given a local app entry, Stage renders one real screen in a browser frame with a reproducible dev command.**

Deliverables:

- [x] Resolve a local Expo route into a preview target.
- [x] Generate a preview manifest with local files, shims, diagnostics, and `ScreenMapV1`.
- [x] Bundle and mount one real route in the iframe.
- [x] Keep `pnpm dev` as the single contributor entrypoint.

## Milestone 2 (current): Branch Studio

- [x] Load a type-safe `stage.config.ts`.
- [x] Discover branches, commits, Expo SDKs, and runtime fingerprints.
- [x] Create detached cached worktrees.
- [x] Own web and development-client Metro session lifecycles.
- [x] Render a branch collection with Open, Compare, and Stop controls.
- [x] Compare two live web sessions.
- [ ] Stream multiple native simulator sessions through `stage-runner`.
- [x] Publish and open EAS Update snapshots in a TestFlight shell for remote review.
- [ ] Capture screenshots and commit-level visual diffs.

## Next

- Route selection UX beyond query-string driven `screen` and `variant`.
- Richer screen-map export with screenshots and journeys.
- Expand the compatibility registry and add fixture-driven validation presets.
- Split `auxiliary/stage-runner` and `auxiliary/stage-devtools` into standalone repositories.
- Add remote session execution once the local loop remains stable.
- Host the Stage branch catalog so the TestFlight shell discovers every new branch without an
  embedded fallback list.

## Principles

- One package until a folder needs its own release cadence.
- Docs stay small: architecture here, sharp choices in `docs/decisions/`.
- Every merge keeps `pnpm dev`, `pnpm test`, and `pnpm typecheck` green.
