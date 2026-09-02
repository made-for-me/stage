# Architecture

Stage has a **single control-plane npm package** plus a thin TestFlight shell. Branch Studio catalogs
commit-pinned screenshots and capture requests, the browser runtime remains an internal fallback,
and `apps/stage-mobile` opens compatible native ClubHall snapshots through EAS Update channels.

## Layout

| Path | Role |
| --- | --- |
| `src/core` | Manifest building, graph scanning, `ScreenMapV1` export |
| `src/control` | Config loading, Git branch inspection, worktrees, Metro session lifecycle |
| `src/adapters` | Local project detection and Expo-first target resolution |
| `src/preview` | iframe assembly plus browser app/worker runtime |
| `src/server` | Dev server HTML, manifest route, browser asset serving |
| `src/types` | Shared public types |
| `src/utils` | Small helpers |
| `scripts` | Dev entrypoints (`pnpm dev`) |
| `test` | Vitest unit tests and fixtures |
| `auxiliary` | Split-ready blueprints for `stage-runner` and `stage-devtools` |
| `apps/stage-mobile` | Store-distribution iOS shell and on-device branch selector |
| `templates/clubhall` | Overlay injected into published ClubHall previews |
| `templates/github` | Same-repository PR preview publication workflow |

## Branch Studio data flow

1. **Config** — `stage.config.ts` registers projects, local roots, baseline runtime, tracked branches, commands, and preview scenarios.
2. **Discover** — the Git adapter resolves local and `origin/*` refs, SDK versions, commits, and Stage runtime fingerprints.
3. **Launch** — the session manager creates a detached cached worktree, prepares dependencies, allocates a port, and starts Expo web or dev-client Metro.
4. **Review** — the dashboard polls commit-pinned scenes and capture state, then compares matching routes without embedding web sessions.
5. **Stop** — Stage terminates owned processes while preserving worktree caches.

## Route-preview data flow

1. **Input** — the local adapter resolves a project root, Expo route, selected variant, path aliases, asset roots, and diagnostics.
2. **Manifest** — core scans the route graph, injects Stage shims, applies the compatibility registry, and emits `PreviewManifest` plus `ScreenMapV1`.
3. **Serve** — the server exposes `/preview/manifest`, `/preview/screen-map`, and browser assets for the frame runtime.
4. **Preview** — the browser app loads the manifest, the worker bundles the route with `browser-metro`, and the iframe mounts the resulting bundle.

## TestFlight preview data flow

1. **Build once** — the Stage shell is built with the ClubHall SDK 57 native dependency surface and
   submitted as a store-distribution build.
2. **Publish** — a compatible ClubHall Git ref is checked out in an isolated worktree, receives the
   Stage overlay and update config, and is published to a deterministic EAS channel.
3. **Select** — the iPhone app reads the Stage branch catalog and overrides the
   `expo-channel-name` request header.
4. **Reload** — `expo-updates` downloads the selected bundle and restarts into ClubHall. The injected
   Stage button keeps switching available from inside the preview.

## Current support boundary

- Local Git repositories and detached worktrees
- Expo web and development-client Metro targets
- Two-up branch comparison
- SDK and Stage runtime-fingerprint compatibility preflight
- Expo managed projects with `expo-router`
- one route per preview session
- optional `stage.preview.json` for route presets and mock state variants
- explicit shims for `expo-router`, `expo-splash-screen`, `expo-haptics`, and `expo-symbols`
- TestFlight branch switching for ClubHall branches compatible with `stage-clubhall-sdk57-v1`
- visible diagnostics for unresolved routes, shimmed modules, unsupported modules, and missing asset roots

## Non-goals (for now)

- Additional independently versioned packages beyond the iOS shell
- Full Metro parity for every React Native project shape
- Pretending multiple native iOS runtimes can be nested in one iOS application
- Production remote device execution inside this repository; `stage-runner` owns that boundary

See [decisions/0001-single-package-first.md](decisions/0001-single-package-first.md).
