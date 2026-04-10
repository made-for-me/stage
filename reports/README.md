# Reports

This folder converts our early exploration into a Day 1 execution pack for `stage`.

## Reading order

1. [`01-repo-audit.md`](./01-repo-audit.md)
2. [`02-day-one-spec.md`](./02-day-one-spec.md)
3. [`03-preview-runtime-internals.md`](./03-preview-runtime-internals.md)
4. [`04-manifest-bundling-risks.md`](./04-manifest-bundling-risks.md)
5. [`05-ui-components-spec.md`](./05-ui-components-spec.md)
6. [`06-agent-brief.md`](./06-agent-brief.md)
7. [`07-validation-checklist.md`](./07-validation-checklist.md)
8. [`08-gap-log.md`](./08-gap-log.md)

## Why this exists

The repo already has a strong public framing, but Day 1 still needs sharper operational guidance:

- what exists right now
- what is missing for the first real screen
- how the internals should be divided
- what the agent should and should not do
- how we validate the work before calling it done

## Intended use

- Read `01` and `02` before touching code.
- Use `03` and `04` while shaping the preview path.
- Use `05` to avoid vague UX drift.
- Hand `06` directly to Codex / the implementation agent.
- Use `07` as the merge gate.
- Track unresolved questions in `08`.

## Principle

Day 1 is not about building a universal preview platform.

Day 1 is about getting from:

`local project input -> stage dev server -> isolated browser frame -> one real app screen visible`

with the smallest coherent implementation slice.
