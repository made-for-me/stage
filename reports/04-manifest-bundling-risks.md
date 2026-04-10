# Manifest and bundling risks

## Why this report exists

The fastest way to fail Day 1 is to jump straight into “full bundling” without first defining the runtime contract.

Day 1 needs a visible screen, not a perfect compiler story.

## Core principle

Define the preview contract first.
Then choose the thinnest viable load path that can satisfy it.

## Primary risks

### Risk 1: solving too much of Expo / React Native at once

If Stage tries to become a universal browser executor immediately, the Day 1 milestone will drift.

**Correct response:** constrain the first supported target shape and fail explicitly outside it.

### Risk 2: blank iframe failure

The worst UX outcome is a blank preview with no explanation.

**Correct response:** route runtime failures into a visible error panel inside the frame and, if useful, into shell diagnostics.

### Risk 3: no manifest contract

Without an explicit manifest or preview plan, the frame, server, and adapter will start encoding assumptions in scattered places.

**Correct response:** introduce a stable Day 1 runtime input, even if minimal.

### Risk 4: asset/import optimism

Fonts, images, aliases, env assumptions, and native-only imports can easily break the first render.

**Correct response:** support a narrow slice and log unsupported patterns clearly.

## What the manifest should answer

A Day 1 preview manifest should answer at least:

- what is being previewed?
- where is the boot entry?
- what should the frame title/status say?
- what assumptions or warnings apply?
- what error should appear if boot cannot proceed?

## Bundling decision filter

Choose the path that best satisfies all of the following:

1. can be explained in one screenful of code/docs
2. preserves `pnpm dev` as the entrypoint
3. can render one real screen quickly
4. degrades into explicit diagnostics
5. does not force premature package or infra expansion

## Diagnostic requirements

The runtime should surface these classes of failure distinctly:

- target resolution failure
- unsupported project shape
- unsupported import/module pattern
- mount/runtime exception
- missing generated asset / boot artifact

## Logging guidance

### In shell

The shell should show a compact preview status:

- loading
- mounted
- failed

### In frame

The frame should show the human-readable failure details.

### In server logs

The server should emit enough structured information to debug the failing path without reverse engineering the code.

## Recommendation for Day 1

Do not optimize for “smart graphing” first.

The recommended order is:

1. resolve target
2. define manifest
3. expose manifest/boot path from the server
4. mount something real in the frame
5. tighten edge-case handling after the first visible success

## Anti-patterns to avoid

- building a generic plugin ecosystem first
- supporting multiple preview modes before one works end-to-end
- hiding errors behind placeholders
- over-abstracting bundling before a real render path exists
- letting docs promise support broader than the implementation actually provides
