# Bounded local worker

`pnpm worker` connects Stage quests to a command you configure on your own machine. It claims work,
keeps the lease alive, starts that command with a JSON briefing, uploads its capture files, and
submits a result for human review. This is a process adapter, not an included language model.

## Run

Use macOS or Linux, the operations v2 Stage host, and one unique agent ID per worker process.
Set `STAGE_URL`, `STAGE_AGENT_TOKEN`, `STAGE_AGENT_ID` and `STAGE_WORKER_CWD` in the environment.
Keep Stage credentials out of shell history. Then run from this repository:

```sh
pnpm worker --once -- /absolute/path/to/your-driver argument
```

Omit `--once` to poll every ten seconds. Add `--simulation` for a rehearsal. Simulation is recorded
in the journal and on evidence, and cannot be accepted. The bridge never invokes a shell or treats
quest text as a command. Its executable, arguments and working directory come only from this
configuration. The driver has its normal operating-system permissions; this adapter is not a sandbox.
Each quest revision pins the **target project's configured `localRoot`**, named branch and full
current commit. Before starting the command, Stage resolves canonical Git roots and requires the
configured worker directory to belong to that exact checkout, on that branch and SHA, with no staged,
unstaged or untracked changes. An unrelated clone is rejected even when its commit matches. Inherited
`GIT_*` variables are removed so they cannot redirect preflight or the child into another repository.
Dirty work is preserved and becomes a blocker; the bridge never checks out, resets, stages or commits.

This first slice supports the explicitly configured source checkout only. Point the target project's
`localRoot` at a clean isolated checkout when that is the authorized executor. Stage's cached detached
preview worktrees are **not** automatically approved as executor roots and will be rejected. No
worktree is created, reset or reused by this bridge. Ignored files are outside Git's dirty-state check.
These checks run immediately before launch; they are not a filesystem lock, OS sandbox, or restriction
on the trusted command's later edits. A concurrent external editor can still change the checkout.

The driver receives one JSON object on stdin:

```json
{"version":1,"quest":{"id":"…","revision":2,"objective":"…","criteria":["…"],"reviews":[],"submissions":[]},"simulation":false,"instruction":"…"}
```

The actual quest includes `executionTarget: {repositoryRoot, branch, sha}`, its branch, project,
complete structured feedback, past submissions and
activity. Its private lease and Stage bearer tokens are withheld from the driver. Use your existing
coding, browser or device tools inside the driver. It must finish with exactly one JSON object on
stdout:

```json
{
  "summary":"What changed, what was tested, and remaining limitations.",
  "sha":"full actual captured Git commit SHA",
  "provenance":"worker-reported",
  "captures":[{"route":"/replay","title":"Replay","imagePath":"captures/replay.png"}]
}
```

Capture files must resolve inside the configured workspace, including through symlinks. PNG, JPEG
and WebP are accepted, at most 8 MB each and 20 files per result. The captured SHA must match the
quest branch when uploading. `worker-reported` describes the source, not independent verification
of the image or acceptance criteria. The human reviewer remains responsible for acceptance.

## Lifecycle and interruption

- Heartbeats run every 30 seconds during the command. Missing or rejected heartbeats stop the run.
- Every bridge run claims with a unique process instance ID. Another instance using the same agent
  ID receives no work while the first lease is valid. After interruption, a fresh instance can
  reclaim only when the persisted lease expires; the old token cannot upload or submit.
- The command has a 30-minute deadline and a 128 KB JSON-output limit. Failures become blockers.
- Cancellation fences later progress, uploads and submissions. An upload already in progress
  completes before a serialized cancellation; external command effects already performed are not rolled back.
- The POSIX process group is terminated on cancellation, failure, timeout **and successful exit**.
  Drivers must not detach themselves into new sessions. Start retained preview services separately
  through Stage's session tools; background services are not part of the bounded-driver contract.
- Stage tokens are not passed to the child. Raw stderr is not copied to the operator journal.
- A revision keeps the quest ID, increments `revision`, archives the prior evidence and records
  structured feedback. The next claim receives this context even when the worker/tool changes.
- Operator revision pins the current configured checkout/branch commit again. A restarted worker
  uses that persisted revision pin; if HEAD subsequently advances, it blocks before running a command.
  Historical submissions retain their original execution pin separately from the resulting commit.

## Operations v2 and persistence

`submit` now requires `revision` and `provenance: worker-reported | simulated`. `review` requires the
displayed `revision` and `evidenceId` (or `null`). These values are checked in the store transaction,
so a stale review cannot accidentally accept a later result. Upgrade clients and host together.

The `scene` adapter now posts to `/api/ops/scenes` with `questId`, `agentId`, `leaseToken`, `revision`,
`sha`, `route`, `title`, and `imageDataUrl`. The server derives project and branch from the quest and
checks the lease inside the serialized operation. The older `/api/scenes` remains the standalone
Branch Studio ingestion API; the local worker uses the fenced endpoint.

Old operations files load additively. Unpinned legacy quests require an operator revision before a
local command can run. Legacy evidence stays visible but requires a fresh revision before acceptance.
Historical captures have content-addressed IDs; recapturing a route preserves
prior image bytes. `GET /api/ops` returns referenced archived captures in `evidenceScenes` separately
from current branch scenes. Existing image URLs continue to work.
Bytes overwritten by a pre-upgrade recapture cannot be recovered retrospectively.

## Verified scope

Tests run real local child processes against the real operations, capture and image stores via an
in-process API adapter. They cover feedback continuity, cancellation, descendant cleanup, immutable
capture bytes, stale reviews, migration, simulation, failures and workspace escape rejection. Git
fixtures prove wrong-root/branch/SHA rejection, dirty-edit preservation, revision pins across restart,
and an explicit configured command changing and committing a file in its isolated fixture only.
Their images are synthetic fixtures. No model API, Grok runtime, live device or release is implied.
The current restricted environment forbids socket binding, so HTTP transport and visual interaction
must still be checked on a host that permits loopback listeners.
