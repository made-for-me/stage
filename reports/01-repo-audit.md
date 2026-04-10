# Repo audit

## Executive read

`stage` is a coherent bootstrap, not yet a working Day 1 preview runtime.

The repo already has the right public story:

- browser-first preview for React Native / Expo
- local loop via `pnpm dev`
- goal of rendering one real screen in a browser frame

But the current implementation still stops at the shell stage.

## What exists now

### 1. Clear public framing

The README already positions Stage as browser-first preview infrastructure and documents the local loop through `pnpm dev`. It also says the current scope is the first visible app screen in a browser frame. 

### 2. Coherent initial architecture

The docs already split the system into `core`, `adapters`, `preview`, `server`, `types`, `utils`, and `scripts`. That is a good Day 1 boundary map.

### 3. Real dev shell and preview route

The dev server serves:

- `/` for the shell
- `/preview/frame` for the iframe surface
- `/health` for smoke checks

So the outer loop already exists.

## What is still missing

### 1. Local project input is not real yet

`src/adapters/local.ts` does not resolve an app entry, project root metadata, or platform assumptions. It only returns a label.

### 2. Pipeline is still descriptive, not operational

`src/core/pipeline.ts` currently only returns a string label. There is no preview planning, manifest building, or diagnostic contract.

### 3. The iframe does not mount a real app screen

`src/server/dev-html.ts` still returns placeholder copy for the frame body. That is the main Day 1 gap.

### 4. The roadmap promise is still ahead of the code

The roadmap says Milestone 1 is rendering one real screen from a local app entry, but the listed deliverables are still unchecked.

## What the repo lacks as documentation

The current docs are good public docs, but they are still missing the internal execution pack needed by an implementation agent:

- exact Day 1 contract
- preview runtime contract
- manifest / bundling risk map
- UI state spec for success, loading, and failure
- strict agent brief with anti-goals
- validation checklist for merge readiness

That is why this `/reports` folder exists.

## Current assessment

The repo quality is good for a bootstrap.

The repo readiness for Day 1 delivery is incomplete.

The next step is not “more architecture”.
The next step is to replace the placeholder preview with a thin, deterministic path that renders one real screen from a local project input.

## Recommended immediate focus

1. Make the local adapter resolve a real target.
2. Introduce a stable preview manifest / runtime contract.
3. Make the server expose whatever the frame needs to mount that target.
4. Replace the placeholder frame body with a real render path.
5. Add explicit diagnostics for unsupported / broken targets.

## Note on inputs we could not validate here

The following artifacts were referenced for this supervision pass, but were not retrievable in this session as uploaded files:

- `stage-codex-seed.zip`
- `stage-codex-seed.patch`
- `apply-stage-codex-seed.sh`

So this audit is grounded in the live repo state plus prior exploration context, not a direct line-by-line review of those seed artifacts.
