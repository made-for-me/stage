# Validation checklist

Use this as the merge gate for Day 1 work.

## Command checks

Run all of these:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

## Route checks

### Health

- [ ] `/health` returns a healthy JSON response

### Shell

- [ ] `/` renders the Stage shell
- [ ] the shell clearly shows preview status

### Frame

- [ ] `/preview/frame` no longer represents success with placeholder copy
- [ ] the frame can enter a visible loading state
- [ ] the frame can enter a visible mounted state
- [ ] the frame can enter a visible error state

## Functional checks

- [ ] a real local target can be resolved
- [ ] one real screen becomes visible in the frame
- [ ] the preview path is reproducible from a clean contributor setup
- [ ] unsupported or broken targets fail explicitly

## Code review checks

- [ ] adapter logic stays in `src/adapters`
- [ ] planning/contract logic stays in `src/core`
- [ ] serving logic stays in `src/server`
- [ ] browser mount logic stays in `src/preview`
- [ ] no unrelated package split or infra expansion was introduced

## UX checks

- [ ] a contributor can tell in under 2 seconds whether preview is loading, mounted, or broken
- [ ] the success state is a real screen, not placeholder text
- [ ] the failure state provides actionable debugging information

## Documentation checks

- [ ] public docs do not overstate support beyond what now works
- [ ] any newly introduced runtime contract is documented clearly enough for the next contributor

## Final Day 1 question

If someone clones the repo and runs `pnpm dev`, can they understand how to get to one real visible screen without reverse engineering the entire codebase?

If the answer is no, Day 1 is not complete.
