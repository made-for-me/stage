# Roadmap

## Milestone 1 (current)

**Given a local app entry, Stage renders one real screen in a browser frame with a reproducible dev command.**

Deliverables:

- [ ] Resolve a local entry (adapter stub → real resolution).
- [ ] Bundle or load path that produces one screen in the iframe (not just placeholder HTML).
- [ ] `pnpm dev` remains the single entry for contributors.

## Next

- Smarter dependency / import graph for preview slices.
- Adapters for Expo and bare React Native layouts.
- Optional shareable preview URLs (out of scope until local loop is solid).

## Principles

- One package until a folder needs its own release cadence.
- Docs stay small: architecture here, sharp choices in `docs/decisions/`.
- Every merge keeps `pnpm dev`, `pnpm test`, and `pnpm typecheck` green.
