# ClubHall previews on TestFlight

The installed Stage app is a store-distribution shell, not an Expo development client. This matters:
EAS development builds contain developer tooling and are distributed internally, while TestFlight
accepts App Store distribution builds. Stage preserves the fast branch loop with `expo-updates`
channel surfing.

## One-time release setup

1. Create a separate EAS project for `stage-mobile` under the `madeforme` account.
2. Create the App Store Connect app for `com.madeforme.stage`.
3. Export `STAGE_EAS_PROJECT_ID` locally and add it as the same GitHub Actions variable.
4. Add `EXPO_TOKEN` as a ClubHall repository secret.
5. Copy `templates/github/clubhall-stage-preview.yml` to
   `accollier/clubhall/.github/workflows/stage-preview.yml`.
6. Build the shell with `pnpm mobile:testflight`.

## Preview publication

The publisher refuses branches outside Expo SDK 57, creates a detached worktree, injects a custom
Expo Router entry and Stage overlay, then publishes to a deterministic channel. It never mutates or
merges the source branch.

```bash
STAGE_CLUBHALL_ROOT=/absolute/path/to/clubhall \
STAGE_EAS_PROJECT_ID=<uuid> \
STAGE_TRACKED_BRANCHES=ar2/arena-ui-sdk57-e69f,codex/flighty-native-design-lab \
pnpm preview:clubhall -- --branch codex/flighty-native-design-lab
```

The PR workflow publishes same-repository pull requests automatically. Fork pull requests do not
receive the Expo token. A manual workflow dispatch can publish any named branch.

## Switching behavior

- The shell and injected overlay compute the same branch-to-channel identifier.
- The app changes only the predeclared `expo-channel-name` header.
- If no compatible update exists, the previous channel is restored and the current preview remains.
- The Stage button remains above ClubHall so another branch can be selected without reinstalling.
- Native dependency or config changes require a new TestFlight build and runtime version.
