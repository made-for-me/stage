# Native compatibility

One native Stage build can load many JavaScript branches only when their native runtimes are compatible.

Stage performs a fast preflight fingerprint over the app package, Expo config, lockfile, and native project tree hashes. This catches SDK, dependency, config-plugin, and checked-in native-project divergence before launch. It is intentionally called the **Stage runtime fingerprint** and does not replace Expo's authoritative fingerprint during EAS Build or Update.

The ClubHall TestFlight shell uses the explicit runtime `stage-clubhall-sdk57-v1`. Its native
dependency surface mirrors the SDK 57 baseline and adds `expo-updates`. If a branch changes native
dependencies or configuration, create a new Stage runtime/build instead of forcing its update into
the installed shell. Stage's preflight remains a conservative gate; EAS runtime matching is the
authoritative final gate.

Compatibility values:

- `compatible`: Stage fingerprint equals the configured baseline branch.
- `incompatible`: fingerprints differ. Web comparison may still work; the baseline development client may not.
- `unknown`: repository, branch, or fingerprint input is unavailable.
