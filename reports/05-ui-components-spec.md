# UI and component spec

## Objective

Stage Day 1 does not need a fancy product shell.
It needs a shell that makes preview state obvious.

## Core UI states

### 1. Shell loaded

The main Stage page should communicate:

- project identity (`Stage`)
- current status of the preview loop
- a clear viewport containing the frame

### 2. Frame loading

Before mount completes, the user should see an intentional loading state.

### 3. Frame mounted

When preview succeeds, the real screen should occupy the viewport cleanly.

### 4. Frame failed

If preview fails, the error must be visible in the frame, not hidden in logs.

## Recommended Day 1 shell components

### Header

Minimal information only:

- product name
- version
- preview status badge
- optional target label/path once that exists

### Preview viewport

A stable container for the iframe.

### Error summary area

Optional but useful if the frame crashes before it can render an error view.

## Recommended Day 1 frame components

### Loading state

Simple, explicit, and temporary.

### Preview root

The container where the real screen mounts.

### Error state

Should include:

- plain-English summary
- a short technical code if available
- one or two likely causes if known

## Design guidance

### Keep presentation subordinate to function

A decorative iPhone frame is acceptable later, but it should not become part of the Day 1 success criteria.

Day 1 success is a real mounted screen.
Not a pretty mock device.

### Error states must be first-class

The user should never need browser devtools just to understand why preview failed.

### Status should not lie

Do not leave “experimental preview shell” messaging unchanged if the implementation evolves and better status is available.
Expose real state.

## Suggested state model

```ts
export type PreviewUiState =
  | { kind: "loading" }
  | { kind: "mounted"; targetLabel: string }
  | { kind: "failed"; message: string; code?: string };
```

## Copy guidance

Use copy that helps action, not copy that narrates ambition.

Good:

- `Loading preview…`
- `Preview mounted`
- `Could not resolve app entry`
- `Unsupported import in preview target`

Avoid:

- vague placeholder copy
- aspirational text where diagnostics should exist

## Merge bar for UI

The UI is good enough for Day 1 when:

- a contributor can tell whether preview is loading, mounted, or broken in under 2 seconds
- the success state is a real screen, not a demo paragraph
- the failure state gives an actionable next debugging step
