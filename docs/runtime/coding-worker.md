# Bounded local coding worker

`node scripts/stage-coding-worker.mjs /absolute/path/contracts.json` connects a trusted local coding executor to the existing Stage operations API. It claims one quest and attempts it once. It does not poll forever, silently retry model calls, merge, push, deploy, or mark its own result accepted.

The operator supplies `STAGE_URL`, `STAGE_AGENT_TOKEN`, `STAGE_WORKER_ID`, and a local JSON object keyed by quest ID:

```json
{
  "quest-id-from-stage": {
    "repository": "/absolute/path/repo",
    "runRoot": "/absolute/path/outside-repo/stage-runs",
    "baseSha": "40-character-commit-sha",
    "ownedPaths": ["src/feature.ts", "test/feature.test.ts"],
    "dependencies": [],
    "executor": ["codex", "exec", "--ephemeral", "-s", "workspace-write", "-"],
    "verify": ["pnpm", "test"],
    "evidence": ["node", "/absolute/path/capture-current-preview.mjs"],
    "timeoutMs": 180000
  }
}
```

Use an existing **unoccupied local task branch**, never `main` or `master`. Quest text cannot change executor commands, ownership, base, timeout, or dependencies. Commands are argument arrays; the prompt goes through stdin. The adapter strips Stage operator/worker credentials from all subprocess environments. The configured executor must supply its own valid provider authentication. CLI installation or `login status` is not proof of usable inference.

The worker creates a detached worktree outside the repository, checks current branch/base and accepted dependencies, and holds a lock in the common Git directory. Repository-level locking conservatively prevents overlapping workers even if they use different branch names or run roots. Independent repositories can run concurrently. Scheduling nonoverlapping paths concurrently **inside one repository remains open**.

Execution and verification are bounded by the configured timeout. Heartbeats run every 20 seconds. Cancellation or lost ownership terminates the active process group, escalating to SIGKILL after one second. Output is capped at 8 MiB per command; logs and receipts have private filesystem permissions. Ownership is checked after execution and verification, then Stage advances the dedicated branch using compare-and-swap **inside its lease transaction**, serialized with cancellation and revision. The original checkout and dirty files are not reset. Native project changes still require the existing runtime compatibility gates.

The evidence command receives `{questId, runId, sha, branch, worktree}` on stdin and must emit JSON:

```json
{
  "sha": "exact-commit-sha",
  "summary": "What was actually observed, including limitations",
  "scenes": [{
    "title": "Current preview",
    "route": "/",
    "imageDataUrl": "data:image/png;base64,<actual screenshot>"
  }]
}
```

Use a real capture tool against that worktree's exact build. The worker rejects an altered worktree after capture, uploads scenes using its own Stage token, and submits the IDs through the existing current-commit evidence checks. Stage then waits for operator review. A static screenshot is not a running native preview. A deterministic fixture is not model inference. If no evidence command is configured, verified code remains available and the quest is blocked with an explicit capture action.

## Failure, restart, and revision

Each attempt retains a private `receipt.json`, worktree, executor log, verification log, and optional evidence log under `runRoot/runId`. Receipts contain no lease/provider tokens. A failed command, missing executor, drift, ownership violation, missing dependency, or capture error blocks the quest. Failed/cancelled work is never reset or deleted.

Review/revise requeues the **same quest**, with prior feedback in the next prompt. After inspecting partial work and current branch state, the operator updates that quest's contract to the actual current base and launches a new attempt. A completed code commit followed by failed capture requires that new base. Do not blindly rerun against the original base. There is no automatic restart of partially completed inference.

A process crash can leave `.git/stage-coding-worker.lock` (in the common Git directory). It deliberately blocks new execution. Verify the recorded PID/run and stop any surviving process before removing that specific stale lock. A receipt documents the next action; PID reuse and automatic stale-lock deletion are not trusted. Use one Stage server per state directory, as before.

This is a trusted local executor, **not an OS security sandbox**. Owned paths gate promotion, not filesystem syscalls. Executor/test/capture tools must be trusted, and an executor's own sandbox should restrict writes. A malicious executable can bypass this adapter; public untrusted job hosting is not supported. Logs may contain task source/output and stay private on the host.

## Sprint evidence, 29 October 2026

Source base: Stage PR #4 `cc6565271191ddb964a6978fc8730bf05e421be5`, stacked on PR #3 `138ed5dfdd8249dce525684789fae0d96eee9baf`. Reused `OpsStore`, authentication, scene storage, current-commit review, native operations, and branch preview infrastructure. No replacement queue, account system, or native dependency.

- Baseline: 28 tests passed locally. Candidate: 34 tests, TypeScript checks, and Biome lint passed. Tests perform real local subprocess writes/commits and verify same-quest revision, original-checkout preservation, wrong base, missing dependencies, owned paths, repository lock conflicts, cancellation, timeout, stripped Stage credentials, current-lease HTTP branch advancement, and stale-lease rejection. They use deterministic fixture executors, not a model.
- Real Codex attempt `74b3c0f2-4c70-42d7-a8e5-e9104e548ec2` on fixture base `0dfadd10c9c0e6350f35548c1729952d035bdeb0` failed before changes. Codex 0.163.0 returned HTTP 401 for models/responses: `Could not parse your authentication token`; final error: `Your access token could not be refreshed because you have since logged out or signed in to another account.` Inherited MCP startup also returned HTTP 451 `no_biscuit_no_service`. No model-produced code, preview, or successful AI worker cycle is claimed. Correct the executor's runtime authentication through the supported environment setup before retrying.
- Authenticated HTTP fixture attempt `f4b6f3b7-fe7d-4e0b-b670-cabb8c5e5bb4` wrote and verified a deterministic HTML change and advanced its task branch to `3cb6fa4b1ffaae5a8b1e75a74f3629e0ab866832`. Chromium capture timed out; a separate isolated-profile diagnostic also timed out. No fabricated image was submitted. Code is retained; quest is blocked. Logs/receipts are under `/workspace/sprint/stage-fixture-proof` and `/workspace/sprint/stage-proof` in this execution workspace; they are not portable repository artifacts.
- Capture recovery: the reviewer supplied a known-working Playwright route. Browser `file://` navigation is administratively blocked here; normal localhost HTTP preview with Playwright worked. A new deterministic subprocess fixture completed both actual captures and scripted review → revision → acceptance on quest `4cf86f42-c34a-4f4b-b90f-a463a03fd0a4`. Preview commits: `4602c95b859f6331a354dda3d10373691157caa8` then `c251b3a2f159f63d5921b0ead084ea172bc466fb`, using Stage source `ca720fac42b3620278fccae1c4179f7348bd4d01`. [Portable evidence and fixture source](../evidence/worker-20261029/README.md) include real screenshots and a Git bundle. This resolves the fixture capture blocker only; the actual Codex 401 remains.
- The historical October 16 local read-only Git-runner patch is unavailable on this Linux host. PR #3's checked-in supervisor remains a distinct device-local prototype; no equivalence is assumed.
- Physical phone, reachable Mac Device Hub, native branch delivery, and current EAS/TestFlight distribution have not been verified by this worker.

| Sprint task | Current disposition / next action |
| --- | --- |
| T-F01 | PR #3/#4 inspected and reused; recover October 16 local patch on Mac to finish reconciliation. |
| T-F02 | Subprocess executor connected; real Codex inference blocked by observed HTTP 401. Repair runtime auth, run a bounded real coding task. |
| T-F03 | Isolated worktrees, base/path checks, accepted dependencies, lease fencing and repository exclusion tested. Fine-grained concurrent scheduling within a repo remains open. |
| T-F04 | Real subprocess cancellation/timeout and durable retained attempts tested. Inference restart blocked until executable auth works; stale locks require operator inspection. |
| T-F05 | Exact SHA receipts and scene gates implemented; real HTTP fixture captures and source bundle recorded. No native build produced; capture still required for real model output. |
| T-F06 | Integrated deterministic subprocess → real HTTP capture → review → same-quest revision proof passed. Real-inference gate remains open. |
| T-F07 | Blocked: no connected Mac/iPhone; no build/channel mapping proof. |
| T-F08 | Wrong base, dependency, ownership, lock, cancellation, timeout and stale-lease checks pass. Re-run real model worker with the verified localhost HTTP/Playwright capture path after auth repair. |
