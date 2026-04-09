# Architecture

Stage is a **single npm package** with clear internal folders. The goal is a reproducible path from a local app entry to a **browser-hosted preview** without monorepo churn until separate release cadences exist.

## Layout

| Path | Role |
| --- | --- |
| `src/core` | Pure preview pipeline logic (no framework I/O) |
| `src/adapters` | Expo / React Native / Snack / custom input adapters |
| `src/preview` | iframe / blob / runtime assembly for the preview surface |
| `src/server` | Dev server HTML, future manifest and bundling hooks |
| `src/types` | Shared public types |
| `src/utils` | Small helpers |
| `scripts` | Dev entrypoints (`pnpm dev`) |
| `test` | Vitest unit tests and fixtures |

## Data flow (target)

1. **Input** — adapter resolves project context (entry file, workspace root).
2. **Graph** — core builds a minimal previewable module graph (deterministic, cache-friendly).
3. **Preview** — preview layer assembles an isolated frame and loads the bundle.
4. **Serve** — server exposes dev endpoints and static assets for the loop.

Today, steps 2–4 are stubs wired for the first milestone: a visible preview shell and health check.

## Non-goals (for now)

- Separate `packages/*` workspaces
- Remote or authenticated hosting
- Full Metro/webpack parity

See [decisions/0001-single-package-first.md](decisions/0001-single-package-first.md).
