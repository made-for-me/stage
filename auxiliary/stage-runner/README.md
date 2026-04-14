# stage-runner blueprint

Self-hosted remote execution service for Stage. The runner exists to turn a build artifact into a browser-viewable device session with deterministic control, capture, and teardown semantics.

## Product boundary

- It runs real mobile runtimes on owned hardware.
- It does not emulate iOS in the browser.
- It does not try to replace Expo web or Stage's browser-first preview.
- Its job is to make final validation, recording, and remote collaboration reliable.

## Core resources

### `BuildRef`

Represents an uploaded artifact that can be installed on a worker.

```json
{
  "id": "bld_01H...",
  "platform": "ios",
  "kind": "ios-simulator-app",
  "source": {
    "type": "upload",
    "uri": "s3://stage/builds/bld_01H.../app.zip",
    "checksum": "sha256:..."
  },
  "status": "ready",
  "createdAt": "2026-04-14T10:15:00Z",
  "expiresAt": "2026-04-21T10:15:00Z"
}
```

Required fields:

- `id`: stable build identifier
- `platform`: `ios` or `android`
- `kind`: `ios-simulator-app`, `android-emulator-apk`, or `android-emulator-aab` if a later installer step is added
- `source`: upload or external artifact reference

Recommended fields:

- `status`: `queued`, `uploading`, `ready`, `failed`, `expired`
- `createdAt` and `expiresAt`

### `SessionRef`

Represents one live device session backed by a worker.

```json
{
  "id": "ses_01H...",
  "buildId": "bld_01H...",
  "platform": "ios",
  "deviceType": "ios-simulator",
  "status": "ready",
  "streamUrl": "https://runner.stage.local/sessions/ses_01H.../stream",
  "controlUrl": "wss://runner.stage.local/sessions/ses_01H.../control",
  "startedAt": "2026-04-14T10:18:00Z",
  "lastHeartbeatAt": "2026-04-14T10:18:14Z",
  "capabilities": {
    "touch": true,
    "keyboard": true,
    "screenshot": true,
    "clipboard": false,
    "rotation": true
  }
}
```

Required fields:

- `id`: stable session identifier
- `buildId`: associated build
- `platform`: `ios` or `android`
- `deviceType`: `ios-simulator` or `android-emulator`
- `status`: lifecycle state
- `streamUrl`: browser viewer entrypoint
- `controlUrl`: websocket control entrypoint

Recommended fields:

- `startedAt`, `lastHeartbeatAt`, `endedAt`
- `capabilities`
- `failureReason` when `status` is `failed`

Lifecycle states:

- `queued`
- `provisioning`
- `booting`
- `installing`
- `ready`
- `streaming`
- `busy`
- `stopped`
- `failed`
- `expired`

### `ActionCommand`

Represents one deterministic action requested against a session.

```json
{
  "id": "cmd_01H...",
  "type": "tap",
  "target": {
    "label": "Continue"
  },
  "meta": {
    "source": "ui",
    "traceId": "trace_01H..."
  }
}
```

Required field:

- `type`

Supported `type` values:

- `tap`
- `doubleTap`
- `longPress`
- `swipe`
- `drag`
- `type`
- `key`
- `home`
- `back`
- `launch`
- `screenshot`
- `rotate`
- `wait`

Common payload fields:

- `id`: client-generated id for idempotency and acknowledgements
- `target`: semantic target descriptor, usually one of `label`, `accessibilityId`, `testId`, or `role`
- `coordinates`: `{ "x": number, "y": number }`
- `text`: string payload for `type`
- `key`: key name for `key`
- `durationMs`: gesture duration
- `direction`: `up`, `down`, `left`, or `right`
- `bundleId`: app bundle identifier for `launch`

Validation rules:

- `tap`, `doubleTap`, and `longPress` require `target` or `coordinates`
- `swipe` and `drag` require a start and end coordinate pair
- `type` requires `text`
- `key` requires `key`
- `launch` may include `bundleId`
- `screenshot` and `wait` do not require any additional fields

## API surface

- `POST /builds` registers a build artifact and returns `BuildRef`.
- `POST /sessions` provisions a session for one build and returns `SessionRef`.
- `GET /sessions/:id` returns the current session metadata and lifecycle state.
- `GET /sessions/:id/stream` returns the stream descriptor used by the browser viewer.
- `WS /sessions/:id/control` is the low-latency bidirectional control channel.
- `POST /sessions/:id/actions` accepts one action or a batch of actions for queued execution.

### Stream model

`GET /sessions/:id/stream` returns the viewer contract for a live session, not raw media bytes.

The transport model is:

- worker publishes frames and device state to the runner
- runner exposes the session to the browser as a WebRTC viewer
- the browser subscribes to the stream using the returned descriptor

The stream descriptor should include:

- `transport`: `webrtc`
- `sessionId`
- `viewerToken`
- `iceServers`
- `signalingUrl`
- `media`: `video-only` for v1

### Control model

`WS /sessions/:id/control` is used for interactive operations that need quick round-trip timing.

Message flow:

- client sends `subscribe`, `action`, `screenshot`, `ping`, or `setViewport`
- server replies with `ready`, `ack`, `state`, `frame`, `log`, `error`, or `pong`
- action acknowledgements always include the `ActionCommand.id` when supplied

HTTP `POST /sessions/:id/actions` is the fallback for queued or batched automation.

Recommended semantics:

- websocket control for human-in-the-loop interaction
- HTTP batch actions for automation and PR review jobs
- the same validation rules apply to both transports

## Worker responsibilities

### iOS simulator worker

- boot a macOS host and create or reuse a clean Simulator profile
- install the uploaded `ios-simulator-app`
- launch the app with deterministic environment variables
- attach the control bridge used for taps, typing, screenshots, and lifecycle events
- publish frame updates, device logs, and session state
- reset simulator state between sessions
- destroy or recycle the simulator based on retention policy

### Android emulator worker

- boot an emulator image on Linux or macOS
- install the uploaded APK
- launch the target activity
- bridge control through adb or an equivalent input layer
- publish frames, logs, and session state
- reset emulator state between sessions
- recycle or snapshot the emulator based on retention policy

### Shared worker rules

- workers must be stateless between sessions except for cached images
- every session must have a heartbeat
- workers must emit explicit failure reasons
- every session must clean up artifacts, temp files, and device state
- workers should expose screenshots even when the live stream is not yet established

## Queueing

Use upstream Hatchet when orchestration durability is needed. Do not fork the Revyl Hatchet repo as product code.

## Smoke-test expectations

See [smoke-tests.md](./smoke-tests.md) for the release checklist and contract-level checks that should pass before the runner is considered usable.
