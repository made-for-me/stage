# Agent brief

## Mission

Replace the current placeholder preview with the smallest coherent implementation that renders **one real screen** from a local project inside the Stage browser frame.

## Project reality

You are not starting from zero.

The repo already has:

- a public product framing
- a single-package architecture
- a shell route
- a preview frame route
- a health route

But it does **not** yet have a real preview runtime.

Your job is to close that gap without expanding the scope.

## Primary objective

Get from:

`local project input -> resolved target -> preview runtime contract -> browser frame -> one real mounted screen`

## Non-negotiables

1. Preserve the single-package structure.
2. Preserve `pnpm dev` as the contributor entrypoint.
3. Keep the implementation centered on Milestone 1 only.
4. Make failures visible and explicit.
5. Do not introduce architecture churn unrelated to the first real screen.

## Implementation order

### Step 1

Upgrade the local adapter so it resolves a meaningful preview target.

At minimum, the adapter should stop returning only a label and instead produce the metadata needed for preview boot.

### Step 2

Create a minimal preview manifest or plan in `src/core`.

This is the contract between resolution and runtime.

### Step 3

Update the dev server so it can serve the preview shell plus whatever route or asset the frame needs to boot the real target.

### Step 4

Replace the placeholder frame content with a real runtime path that attempts a mount.

### Step 5

Add explicit error handling for:

- missing target
- unsupported target shape
- runtime boot failure

### Step 6

Add or update tests for the new contract where the repo already has natural coverage points.

## Constraints

- Prefer a narrow supported slice over a broad fragile abstraction.
- Prefer explicit diagnostics over silent fallback.
- Prefer code that is easy to follow over code that is over-generalized for future use.

## Do not do these things

- do not split into `packages/*`
- do not build remote preview infra
- do not chase full Expo/Metro compatibility
- do not add ornamental UI work that does not improve Day 1 validation
- do not leave placeholder copy in the success path
- do not return a blank iframe on failure

## Required output quality

Your implementation is only acceptable if a reviewer can quickly see:

- where the target is resolved
- where the preview plan is built
- where the frame gets its boot input
- where the real mount happens
- where preview failures are surfaced

## Definition of done

Done means:

- `pnpm dev` starts the shell
- `/health` still works
- the preview frame mounts one real screen
- broken targets produce visible errors
- docs remain aligned with reality

Not done means:

- the repo still shows placeholder preview text
- the system works only through hidden manual steps
- the runtime path is too implicit to debug
- the change introduces new architecture that Day 1 does not yet need
