# Preview runtime internals

## Purpose

This document sharpens the intended responsibility of each internal folder so Day 1 implementation does not collapse into a single vague blob.

## Internal responsibility map

### `src/adapters`

Own project-shape detection and target resolution.

For Day 1, `src/adapters/local.ts` should evolve from:

- `cwd -> label`

into something closer to:

- `cwd -> resolved preview target`

The adapter is allowed to inspect local files and infer project conventions.

It should not own browser runtime behavior.

### `src/core`

Own the preview planning contract.

Core should take a resolved target and produce a structured plan or manifest for preview boot.

Core should stay free of framework-specific HTTP serving details and browser DOM concerns.

### `src/server`

Own the shell HTML, dev routes, and stable URL surface.

The server should be the single source of truth for:

- where the shell is served
- where the frame is served
- where any preview manifest or boot assets are served
- how preview errors are exposed back to the shell

### `src/preview`

Own iframe/runtime assembly and browser-side mount orchestration.

`src/preview` should not guess local filesystem state.
It should consume explicit runtime inputs from the server/core contract.

### `src/types`

Own small shared public contracts.

Right now the public types are too thin for Day 1.
They should be extended carefully only when the runtime contract is real.

## Suggested Day 1 types

These are not mandatory names, but they show the missing contract.

```ts
export type PreviewTarget = {
  label: string;
  cwd: string;
  entryFile: string;
  adapter: "local-expo" | "local-react-native" | "unknown";
};

export type PreviewManifest = {
  title: string;
  targetLabel: string;
  entryUrl: string | null;
  diagnostics: PreviewDiagnostic[];
};

export type PreviewDiagnostic = {
  level: "info" | "warning" | "error";
  code: string;
  message: string;
};
```

The exact shape can differ, but Day 1 needs an explicit structure like this.

## Data flow for Day 1

1. User starts `pnpm dev`.
2. Server bootstraps the shell.
3. Local adapter resolves the preview target.
4. Core converts the target into a manifest/runtime plan.
5. Server serves that plan to the frame.
6. Preview runtime tries to mount the target.
7. The frame shows either:
   - real screen
   - loading state
   - structured error state

## Hard boundary rules

### Rule 1

Do not let the iframe invent its own world.
It should receive explicit runtime input.

### Rule 2

Do not put filesystem logic into `core`.
Adapters resolve. Core plans.

### Rule 3

Do not make `server` do silent magic.
If assumptions are made, surface them through diagnostics.

### Rule 4

Do not make public types broad “just in case”.
Add only the fields needed for the actual Day 1 path.

## Day 1 internal success test

The internals are shaped correctly if a new contributor can answer these questions quickly:

- where is the local target resolved?
- where is the preview plan built?
- where is the preview route served?
- where is the iframe mount logic?
- where do preview failures become visible?

If those answers are blurry, the architecture is still too loose.
