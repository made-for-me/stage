# Day 1 spec

## Goal

Get from:

`local project input -> stage dev server -> isolated browser frame -> one real app screen visible`

with the smallest implementation slice that is honest, reproducible, and easy to debug.

## The Day 1 product cut

Stage Day 1 is **not** a generalized cloud preview system.

Stage Day 1 is a local browser-first preview loop that can load one real React Native / Expo screen from a local project and show it inside the Stage frame.

## In scope

- local project input only
- one real screen visible in the browser frame
- stable contributor entrypoint: `pnpm dev`
- clear failure state if the target cannot be resolved or mounted
- deterministic behavior over flexibility

## Out of scope

- remote preview URLs
- team sharing / auth / cloud execution
- full Metro parity for every project shape
- full navigation testing
- deep device APIs and full native module compatibility
- monorepo/package splitting

## Minimum functional contract

### Input

A local project target that Stage can resolve into:

- project root
- app type or adapter type
- chosen entry file or screen entry
- enough metadata to attempt a browser preview

### Output

A Stage browser page where:

- the outer shell loads
- the iframe loads
- the iframe shows a real app screen instead of static placeholder text
- errors are visible in the UI if preview boot fails

## Acceptance criteria

Day 1 is successful only if all of the following are true:

1. `pnpm dev` still starts the Stage shell.
2. `/health` still returns a healthy response.
3. The preview route renders a real screen, not a placeholder paragraph.
4. A broken or missing target produces an explicit error state.
5. The path from input to render is understandable from the code layout.
6. The implementation does not introduce architecture churn unrelated to the milestone.

## Required code outcomes

### Adapter outcome

The local adapter must return more than a label. It must resolve a meaningful preview target.

### Core outcome

Core must own the preview planning contract, not just a string formatter.

### Server outcome

The server must expose the shell plus whatever runtime/manifest route the iframe needs.

### Preview outcome

The preview layer must consume a real runtime input and attempt a real mount.

### UX outcome

The user must be able to distinguish among:

- loading
- mounted preview
- broken preview
- unsupported preview target

## What not to optimize for yet

Do not spend Day 1 trying to solve all project shapes, all imports, all assets, or all native behavior.

The correct Day 1 bias is:

- narrow support
- explicit assumptions
- obvious diagnostics
- visible success fast

## Decision filter

When two paths compete, choose the one that most directly increases the probability of **one real screen visible inside the frame** while preserving a clean upgrade path later.
