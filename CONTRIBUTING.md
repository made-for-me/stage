# Contributing

Thanks for helping improve Stage. This project aims for a fast contributor loop: clone, install, run `pnpm dev`, and see the preview shell.

## Development

1. Install [pnpm](https://pnpm.io/) and Node 20+ (see `.nvmrc`).
2. `pnpm install`
3. `pnpm dev` — preview shell at `http://127.0.0.1:3847`
4. Before opening a PR: `pnpm lint`, `pnpm typecheck`, `pnpm test`

Keep changes focused on the [current milestone](docs/roadmap.md): one real screen in a browser frame with a reproducible dev command.

## Pull requests

- Link related issues when possible.
- Describe what changed and why in the PR body (the template prompts for this).
- CI must pass (lint, typecheck, test, build).

## Version string

`src/version.ts` carries the dev UI version; keep it aligned with `package.json` when bumping releases (or automate later).

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Participation requires respectful collaboration.

## Security

Please report security issues per [.github/SECURITY.md](.github/SECURITY.md) rather than public issues.
