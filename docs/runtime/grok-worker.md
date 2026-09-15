# Connect Grok to Stage

Use the current Stage branch and existing ClubHall checkout on the host that runs your workers. Install with `pnpm install`. Stage does not require a Grok API key: your existing bot remains the executor.

## Host configuration

Set these in your host's secret/environment manager (never put tokens in a URL or `EXPO_PUBLIC_*`):

- `STAGE_CLUBHALL_ROOT`: ClubHall checkout.
- `STAGE_AGENT_TOKEN`: a strong random worker-pool token.
- `STAGE_OPERATOR_TOKEN`: a different strong random token for Arthur's app.
- `STAGE_DEVICE_HUB_URL`: optional full Hub base URL, e.g. `http://localhost:8081/_expo/plugins/expo-device-hub`.

Run `pnpm dev`. Open `http://127.0.0.1:3847` on the host. On the Stage phone app, select Connect host and enter the reachable Stage origin and operator token. Phone requests must reach the same server as the worker. Use a secure private connection or HTTPS gateway. A phone's localhost is the phone, not your Mac.

Run the Hub on the device machine using its official instructions: `npx expo-device-hub` standalone, or `npx expo install expo-device-hub` within an Expo SDK 57+ project followed by `npx expo start`. Set Stage's Hub URL to the actual address printed by that process. If opened from a phone, the configured Hub URL must be reachable from that phone as well.

## Tool adapter

Give the Grok worker `STAGE_URL` and `STAGE_AGENT_TOKEN` through its runtime configuration. Register `node scripts/stage-agent.mjs` as a tool with these modes:

| Mode | Input | Result |
| --- | --- | --- |
| `capabilities` | none | Action names, roles, fields, lifecycle |
| `snapshot` | none | Quests, agents, current branch and scene state |
| `devices` | none | Real Hub connectivity and device list |
| `action` | JSON on stdin | Claim, heartbeat, progress, capture, session, submit, block |
| `scene` | JSON on stdin | Upload a real captured image to the existing scene API |

Example request bodies (passed via stdin, not shell interpolation):

```json
{"action":"claim","agentId":"grok"}
```

The response is `{ "quest": null }` when no work is assigned. Otherwise retain `quest.id` and the private `quest.lease.token` in the worker's run state. Never put the lease token into a progress message.

```json
{"action":"progress","questId":"<id>","agentId":"grok","leaseToken":"<lease>","message":"Inspecting Replay's moment navigation."}
```

Use the same ownership fields for `heartbeat`, `capture`, and `session`. Send a heartbeat every 30 seconds, including during code/tool work. Poll for a new claim every 10 seconds when idle. On lease rejection, stop publishing updates from that run; claim again and inspect existing events before resuming. A repeated valid claim returns the existing run, avoiding duplicate work. Every process using the same agent ID is the same logical worker; use a unique ID for each independent worker.

Capture returns an exact commit and route plan. Navigate and capture using your own device tools, then upload each scene:

```json
{"projectId":"clubhall","branch":"<quest branch>","sha":"<actual captured commit>","title":"Replay","route":"/replay","imageDataUrl":"data:image/png;base64,<actual capture>"}
```

Then submit the returned scene IDs:

```json
{"action":"submit","questId":"<id>","agentId":"grok","leaseToken":"<lease>","summary":"Describe the actual changes and observed test results, including limitations.","sceneIds":["<scene id>"]}
```

`submit` moves the quest to review, not done. Arthur accepts or requests changes in Stage. Missing repo, simulator, credentials, or build prerequisites should become `block` with an actionable `message`. Do not claim completion without evidence. Stage deliberately has no publish, merge, or deployment action.

## Suggested bot instruction

> Use Stage as the source of work. Read its capabilities, claim a quest assigned to your worker ID, and keep the lease alive. Inspect the repository's operating instructions. Carry out the quest using your existing tools. Report concrete progress, use Stage preview/capture operations, and attach actual captured screens from the current branch commit. Submit a result for review with what changed and what was tested. If blocked, report what is missing. Treat feedback as the next revision of the same quest. Never invent a successful action or mark a result accepted yourself.

## Validation performed

Automated tests exercise concurrent claims, lease expiry and cancellation, persistence, malformed-state handling, auth/origin rejection, real HTTP capture requests, evidence submission, agent/operator separation, stale-commit rejection, feedback requeue, and acceptance. The native TypeScript project and iOS bundle export are checked separately. Actual Grok execution and a Mac/iPhone device session still need the user's host connection.
