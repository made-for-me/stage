# Coding-worker integration fixture

Stage source: `ca720fac42b3620278fccae1c4179f7348bd4d01`.

This is a deterministic **code-changing subprocess fixture**, not a model, the CLUBHall product, a native preview, or human acceptance. It exercises real bearer-authenticated Stage HTTP actions, a detached Git worktree, code verification, lease-fenced task-branch advancement, temporary localhost HTTP preview, real Playwright/Chromium capture, submission, scripted review feedback, a second code revision on the same quest, and scripted acceptance.

`result.json` preserves task/run/base/result IDs, screenshot hashes and actual durable events. `first.png` and `revision.png` are actual 390 × 844 browser captures. Temporary preview servers were stopped after capture. The ignored Stage token values were generated for this local proof and are not stored here.

The source of both preview commits is preserved in `fixture.bundle`. Inspect without overwriting an existing checkout:

```bash
git clone docs/evidence/worker-20261029/fixture.bundle /tmp/stage-worker-fixture-review
git -C /tmp/stage-worker-fixture-review show 4602c95b859f6331a354dda3d10373691157caa8:index.html
git -C /tmp/stage-worker-fixture-review show c251b3a2f159f63d5921b0ead084ea172bc466fb:index.html
```

The separate actual Codex attempt failed HTTP 401 before code changes. See [coding-worker runtime notes](../../runtime/coding-worker.md) for that blocker and the remaining real-model, Mac/iPhone and distribution gates. The successful deterministic fixture does not close those gates.
