# stage-runner smoke tests

These are the release checks for the runner blueprint. They are written as contract-level expectations so the implementation can be exercised with fake workers first and then with real iOS and Android workers.

## Build intake

- `POST /builds` accepts an iOS simulator app upload and returns a `BuildRef` with a stable id.
- `POST /builds` accepts an Android emulator APK upload and returns a `BuildRef` with a stable id.
- invalid platform, kind, or source payloads fail with a validation error.
- build records are readable and retain their checksum, source, and expiry metadata.

## Session lifecycle

- `POST /sessions` creates a session from an existing build and returns a `SessionRef`.
- session state transitions are observable in order: `queued` -> `provisioning` -> `booting` -> `installing` -> `ready`.
- the session enters `streaming` after the browser viewer connects.
- the session reaches `stopped` on graceful shutdown and `failed` on worker or install failure.
- `GET /sessions/:id` matches the latest session state and heartbeat timestamps.

## Stream contract

- `GET /sessions/:id/stream` returns a WebRTC viewer descriptor.
- the stream descriptor includes a session id, signaling URL, viewer token, and ICE servers.
- the browser can connect using the descriptor and render the first frame.
- the stream remains usable after a reconnect if the session is still alive.
- a missing or expired session returns a clear 404 or 410.

## Control contract

- `WS /sessions/:id/control` accepts `subscribe` and emits `ready` before any interactive commands are sent.
- `ActionCommand.id` is echoed in the acknowledgement when present.
- `tap`, `type`, `swipe`, `drag`, `home`, `back`, `launch`, and `screenshot` all round-trip through the control plane.
- invalid actions fail with a typed error instead of a silent drop.
- action latency is observable so automation can detect timeouts.

## Capture and evidence

- screenshot requests succeed even when the stream is not yet attached.
- the runner can store or return a screenshot artifact for every successful capture.
- device logs are attached to the session or the action receipt.
- failures include a readable reason and the last known session state.

## Worker cleanup

- every ended session releases the device lease.
- simulator or emulator state is reset between sessions.
- temp files, logs, and capture artifacts are cleaned up according to retention policy.
- a worker crash or lost heartbeat marks the session as failed and prevents stale reuse.

## Acceptance threshold

The blueprint is considered ready when:

- the contract can be exercised locally with fake workers
- one iOS simulator smoke path and one Android emulator smoke path pass end to end
- a browser client can create a session, see the stream descriptor, connect to the stream, send at least one action, and receive a screenshot or frame update
