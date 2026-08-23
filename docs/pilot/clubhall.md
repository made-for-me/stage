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

Open `http://127.0.0.1:3847`. `Compare` starts web sessions. `Open` starts a development-client session and deep-links the shared ClubHall development client.

Before using a physical iPhone, set `STAGE_METRO_HOST` to the Mac's LAN hostname or IP. Keep `127.0.0.1` for local iOS Simulators.
