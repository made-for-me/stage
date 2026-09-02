# ClubHall pilot

`stage.config.ts` registers `accollier/clubhall` and reads the local checkout from `STAGE_CLUBHALL_ROOT`.

The SDK 57 baseline is `ar2/arena-ui-sdk57-e69f`. `main` remains visible but is expected to report incompatible until it is upgraded from SDK 55. The first tracked design branches are:

- `main`
- `ar2/arena-ui-sdk57-e69f`
- `codex/flighty-native-design-lab`
- `codex/world-first-clubhall-ui`

Start Stage:

```bash
STAGE_CLUBHALL_ROOT=/absolute/path/to/clubhall pnpm dev
```

Open `http://127.0.0.1:3847`. Stage immediately shows the latest commit-pinned scene reel for each tracked branch. Select two branches and press `Compare` to align the same routes side by side. No browser simulator is embedded in this surface.

The ClubHall scene plan currently asks AR2 to capture Home, Arena, Worlds, and Profile after each
tracked branch changes. The Stage shelf displays only captures matching the branch's current commit.
Use the AR2 command field for requests such as `capture arena`, `compare arena and flighty`, and
`show changed screens`; the human-facing navigation, account, and settings surfaces have been removed.

Before using a physical iPhone, set `STAGE_METRO_HOST` to the Mac's LAN hostname or IP. Keep `127.0.0.1` for local iOS Simulators.
