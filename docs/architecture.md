# Architecture

Stage is a **single npm package** with clear internal folders. The goal is a reproducible path from a local Expo route to a **browser-hosted preview** without monorepo churn until separate release cadences exist.

## Layout

| Path | Role |
| --- | --- |
| `src/core` | Manifest building, graph scanning, `ScreenMapV1` export |
| `src/adapters` | Local project detection and Expo-first target resolution |
| `src/preview` | iframe assembly plus browser app/worker runtime |
| `src/server` | Dev server HTML, manifest route, browser asset serving |
| `src/types` | Shared public types |
| `src/utils` | Small helpers |
| `scripts` | Dev entrypoints (`pnpm dev`) |
| `test` | Vitest unit tests and fixtures |
| `auxiliary` | Split-ready blueprints for `stage-runner` and `stage-devtools` |

## Data flow

1. **Input** — the local adapter resolves a project root, Expo route, selected variant, path aliases, asset roots, and diagnostics.
2. **Manifest** — core scans the route graph, injects Stage shims, applies the compatibility registry, and emits `PreviewManifest` plus `ScreenMapV1`.
3. **Serve** — the server exposes `/preview/manifest`, `/preview/screen-map`, and browser assets for the frame runtime.
4. **Preview** — the browser app loads the manifest, the worker bundles the route with `browser-metro`, and the iframe mounts the resulting bundle.

## Current support boundary

- Expo managed projects with `expo-router`
- one route per preview session
- optional `stage.preview.json` for route presets and mock state variants
- explicit shims for `expo-router`, `expo-splash-screen`, `expo-haptics`, and `expo-symbols`
- visible diagnostics for unresolved routes, shimmed modules, unsupported modules, and missing asset roots

## Non-goals (for now)

- Separate `packages/*` workspaces
- Full Metro parity for every React Native project shape
- Production remote device execution inside this repository

See [decisions/0001-single-package-first.md](decisions/0001-single-package-first.md).
