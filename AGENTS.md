# Stage agent operating guide

Stage is the branch and session control plane for Expo projects. Its first pilot is ClubHall.

## Product contract

- A Git branch is a preview source, not a separately installed app.
- A session is one branch, commit, target, worktree, Metro port, runtime fingerprint, and preview scenario.
- `web` sessions may be embedded in the Stage comparison workspace.
- `dev-client` sessions open in one compatible Expo development build.
- Do not claim two native iOS apps are embedded in another iOS app. Multiple native previews require multiple simulator workers and streamed sessions.
- Never merge a design branch into `main` merely to preview it.

## Start here

1. Read `docs/product/branch-studio.md`.
2. Read `docs/runtime/session-model.md` and `docs/runtime/native-compatibility.md`.
3. For ClubHall work, read `docs/pilot/clubhall.md` and `docs/runtime/preview-auth.md`.
4. Treat `stage.config.ts` as the machine-readable source of truth.

## Commands

```bash
pnpm install
STAGE_CLUBHALL_ROOT=/absolute/path/to/clubhall pnpm dev
pnpm test
pnpm typecheck
pnpm lint
```

## Invariants

- Execute commands as argument arrays. Do not concatenate branch names into shell strings.
- Worktrees live outside the target repository and are retained as caches when sessions stop.
- Never put Expo, GitHub, Convex, or auth secrets in Stage config, URLs, logs, or browser responses.
- Preview authentication must be impossible to activate in ClubHall production builds.
- Keep the existing route-level browser preview as a fallback; Branch Studio is the primary product surface when a Stage config is present.
