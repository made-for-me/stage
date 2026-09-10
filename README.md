# Stage

Branch and session control infrastructure for Expo and React Native projects.

## Why

Testing mobile UI should not depend on owning a Mac, running a simulator locally, or fitting your app into Expo Go constraints.

## What it does today

- discovers configured Git branches and evaluates SDK/runtime compatibility
- creates isolated cached worktrees and owns one Metro process per preview session
- opens compatible branches in one Expo development client
- compares route-matched screenshots from two branch commits in Branch Studio
- resolves a local Expo Router project into a preview target
- builds a browser VFS manifest with `browser-metro`
- mounts one real route inside an isolated iOS-preview browser frame
- exports a versioned `ScreenMapV1` contract for future devtools

## Status

Experimental, but no longer a placeholder shell. Stage now ships an Expo-first local preview path and blueprints for the self-hosted remote stack.

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847). When `stage.config.ts` is present, Stage opens Branch Studio. Without a config it falls back to the built-in Expo fixture under `test/fixtures/expo-managed-app` so contributors still get a reproducible route preview.

## Stage on iPhone

`apps/stage-mobile` is the TestFlight shell for the ClubHall SDK 57 runtime. It lists ClubHall
branches and uses EAS Update channel surfing to install a compatible branch preview without a new
native build. Every published ClubHall preview receives a small Stage overlay, so the branch picker
remains reachable after the app reloads into ClubHall.

```bash
# one-time: link a separate EAS project for com.madeforme.stage
cd apps/stage-mobile
eas init

# publish one compatible local ClubHall branch
STAGE_CLUBHALL_ROOT=/absolute/path/to/clubhall \
STAGE_EAS_PROJECT_ID=<stage-project-uuid> \
pnpm preview:clubhall -- --branch ar2/arena-ui-sdk57-e69f

# build and submit the store-distribution shell to TestFlight
STAGE_EAS_PROJECT_ID=<stage-project-uuid> pnpm mobile:testflight
```

A traditional `developmentClient: true` build is intentionally not used for TestFlight. Current EAS
development builds are internal-distribution artifacts, while the Stage shell is a store build with
the same native runtime and controlled OTA branch selection.

The bundled ClubHall pilot expects a local checkout:

```bash
STAGE_CLUBHALL_ROOT=/absolute/path/to/clubhall pnpm dev
```

`Capture latest` creates a SHA-pinned request for AR2. Selecting two branch reels and pressing `Compare` aligns the same captured routes side by side. Stage does not embed simulators or require an account.

To preview a different project:

```bash
STAGE_PROJECT_ROOT=/absolute/path/to/expo-app pnpm dev -- --screen app/index
STAGE_PROJECT_ROOT=/absolute/path/to/expo-app pnpm dev -- --screen app/index --variant review
```

## CLI

```bash
pnpm dev                          # start the local preview server
node --import tsx scripts/dev.ts --screen app/index
node --import tsx scripts/dev.ts --screen app/index --variant review
node --import tsx src/cli.ts doctor --json
node --import tsx src/cli.ts manifest --screen app/index --json
```

## Preview presets

Stage now reads an optional `stage.preview.json` from the target Expo project root. Use it to define:

- route titles
- named variants such as `default`, `review`, or `empty-state`
- mocked router params
- mocked preview data exposed through `globalThis.__STAGE_PREVIEW_CONTEXT__`

This is the basis for route isolation, screenshot review, and future PR validation flows.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Local preview dev server |
| `pnpm build` | Compile `src/` to `dist/` |
| `pnpm typecheck` | Typecheck library, scripts, and tests |
| `pnpm test` | Run unit tests |
| `pnpm lint` | Biome check |
| `pnpm format` | Biome format (write) |
| `pnpm mobile:start` | Start the Stage iOS shell locally |
| `pnpm mobile:typecheck` | Typecheck the Stage iOS shell |
| `pnpm mobile:testflight` | Build and submit the Stage shell to TestFlight |
| `pnpm preview:clubhall -- --branch <name>` | Publish one ClubHall branch preview |

## Scope now

- Expo Router / Expo managed projects first
- deterministic route resolution and manifest generation
- route-level variants and `ios-preview` presets via `stage.preview.json`
- explicit compatibility registry for shimmed and unsupported modules
- browser preview states: loading, mounted, failed with explicit iOS-preview fidelity caveats
- versioned `ScreenMapV1` output for downstream tooling

## Next

- move the auxiliary blueprints into standalone repositories
- add native route-driving workers and screenshot export
- connect the preview/runtime contracts to a self-hosted remote session runner

## Docs

- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Branch Studio](docs/product/branch-studio.md)
- [Session model](docs/runtime/session-model.md)
- [Native compatibility](docs/runtime/native-compatibility.md)
- [Preview authentication](docs/runtime/preview-auth.md)
- [ClubHall pilot](docs/pilot/clubhall.md)
- [Auxiliary blueprints](auxiliary/README.md)
- [Contributing](CONTRIBUTING.md)

## License

Apache-2.0. See [LICENSE](LICENSE).
