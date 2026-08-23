# Native compatibility

One development client can load many JavaScript branches only when their native runtimes are compatible.

Stage performs a fast preflight fingerprint over the app package, Expo config, lockfile, and native project tree hashes. This catches SDK, dependency, config-plugin, and checked-in native-project divergence before launch. It is intentionally called the **Stage runtime fingerprint** and does not replace Expo's authoritative fingerprint during EAS Build or Update.

The ClubHall development client must use Expo's `runtimeVersion.policy = "fingerprint"`. If a branch changes native dependencies or configuration, create a new development build for that runtime instead of forcing its update into the existing client.

Compatibility values:

- `compatible`: Stage fingerprint equals the configured baseline branch.
- `incompatible`: fingerprints differ. Web comparison may still work; the baseline development client may not.
- `unknown`: repository, branch, or fingerprint input is unavailable.
