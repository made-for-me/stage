# Stage: an operating workspace for ClubHall

Stage connects an intention to actual agent work and an inspectable app result. Its native app and desktop workspace read the same durable state. Grok, Codex, or another trusted worker uses the operations API; the UI does not impersonate an agent.

## Experience

1. Arthur creates a quest with an outcome, success criteria, branch, and assigned worker.
2. The worker claims the quest and reports progress while it uses its existing coding and device tools.
3. Stage starts compatible preview sessions or queues captures on the quest's branch.
4. The worker uploads actual screens and submits a summary against the current commit.
5. Arthur inspects the result, accepts it, or requests changes. Feedback returns to the same quest.

The home shows assigned quests and actual worker presence. The quest detail centers captured screens, criteria, and a chronological action history. Disconnected workers and offline hosts remain explicit. Existing local missions are available under Previous local missions; their old local status does not become execution evidence. Branch previews retain the existing EAS switching path.

## What we take from Expo Device Hub

[Expo Device Hub](https://github.com/expo/expo-device-hub) provides a shared device surface: streams, touch/keyboard input, simulator management, and platform-specific control behind a shared client abstraction. The UI puts the running app between selection and inspection.

Stage adopts that separation: quest selection, an inspectable result, and agent/device context. It connects to the existing Hub through a configured host, probes its documented source-level `/api/devices` route, and opens the real Hub dashboard. We do not copy the simulator transport or claim a screenshot is a live stream. This adapter is based on upstream commit `3d13723ab8951a693cdd693b6f453b84880e2aaa`; the internal endpoint may change.

## Implemented in this slice

- Persistent shared quests, progress history, worker presence, blocked/review/accepted states.
- Atomic queue writes and serialized claims, 90-second leases, reclaiming disconnected work, cancellation fencing.
- Agent/operator roles, runtime pairing in native SecureStore, no provider secrets in bundles.
- Branch-bound capture and preview actions; current-commit scene evidence required for review.
- Native operations screens and a desktop operations workspace. Original desktop branch library at `/branches`.
- Provider-neutral JSON tool adapter in `scripts/stage-agent.mjs`.

## Boundaries and next integration

The Grok worker itself is not included: we have not been given its runtime, launch command, or tool registration configuration. The contract is ready for it to claim work and post results. No model API key is needed by Stage. A worker must bring its coding/browser/simulator tools and run a polling or event-driven loop. The included adapter performs requests; it is not an autonomous coding agent.

The Device Hub host must run where devices exist (macOS + Xcode for iOS, Android SDK for Android). This change does not provision that host, proxy video, install Hub into ClubHall, publish an OTA, or produce a TestFlight build. A successful iOS bundle export is not on-device validation.

Use one Stage process per state directory. Operators and workers are trusted within this local workspace. The agent token is a worker-pool credential; agent IDs are labels, not individual identities. Internet-facing multi-user hosting needs per-worker credentials, an authenticated gateway, durable transactional storage, and a separate execution service. Remote connections require bearer tokens; browser use without pairing is confined to same-origin loopback. Use HTTPS or a private encrypted network for remote operation. Do not expose Metro or Device Hub publicly.

Acceptance means Arthur reviewed the captured result; it does not automatically prove every criterion passed. Automatic device navigation, code-changing workers, continuous event delivery, and on-device build validation remain separate integrations.
