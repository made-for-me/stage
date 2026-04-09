# ADR 0001: Single package first

## Status

Accepted

## Context

Stage needs a fast preview loop for React Native / Expo UIs. Early structure churn is costly; monorepo tooling pays off mainly when multiple artifacts (SDK, web app, worker, CLI) need **independent versioning and publishing**.

## Decision

Ship as **one TypeScript package** with internal folders (`core`, `adapters`, `preview`, `server`). No `packages/*` layout yet.

## Consequences

- **Pros:** Simpler CI, faster clone-to-dev, fewer cross-package versioning puzzles.
- **Cons:** If the CLI or web surface later need distinct release cycles, we will split with clearer boundaries.

## Review

Revisit when a subtree clearly needs its own npm package or release train.
