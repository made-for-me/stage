# Stage

Browser-first app preview infrastructure for seeing React Native / Expo screens fast.

## Why

Testing app UI should not depend on a device, emulator, or Expo Go constraints.

## What it does

- builds a minimal previewable graph
- serves a browser preview
- mounts your app/screen inside an isolated frame

## Status

Experimental, early architecture.

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847) (override with `PORT`). The shell loads an isolated preview iframe; `/health` returns JSON for smoke checks.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Local preview dev server |
| `pnpm build` | Compile `src/` to `dist/` |
| `pnpm typecheck` | Typecheck library, scripts, and tests |
| `pnpm test` | Run unit tests |
| `pnpm lint` | Biome check |
| `pnpm format` | Biome format (write) |

## Scope now

- first visible app screen in browser frame
- local project input
- deterministic preview loop

## Scope later

- smarter dependency graphing
- richer adapters
- remote/shareable previews

## Docs

- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Contributing](CONTRIBUTING.md)

## License

Apache-2.0. See [LICENSE](LICENSE).
