# Gap log

This log captures unresolved questions and known missing validation points after the report pass.

## 1. Seed artifacts were referenced but not retrievable here

### Missing direct review

The following were referenced but not available as retrievable files in this session:

- `stage-codex-seed.zip`
- `stage-codex-seed.patch`
- `apply-stage-codex-seed.sh`

### Impact

This means the current report pack validates the live repo and prior exploration context, but not the exact seed artifact contents.

### Recommendation

If those seed files contain implementation details not yet merged, compare them against this `/reports` pack before execution begins.

## 2. Exact local target format is still open

### Question

Will Day 1 preview:

- app root entry
- a specific screen entry
- or a generated preview shim entry?

### Recommendation

Choose the narrowest path that gets one real screen visible fastest.

## 3. Bundling/runtime path is still open

### Question

Will Stage use:

- a thin custom boot path
- an existing local bundling path
- or a generated intermediary preview artifact?

### Recommendation

Do not optimize this as a theoretical architecture decision.
Choose the thinnest path that works for the first supported project shape.

## 4. Native compatibility boundary is undefined

### Question

How much native-only behavior must be tolerated in Day 1?

### Recommendation

Define a narrow compatibility boundary and fail loudly outside it.

## 5. Preview diagnostics contract does not yet exist in code

### Impact

Without a diagnostic contract, failures risk turning into vague runtime behavior.

### Recommendation

Introduce a minimal structured diagnostic shape as part of the preview plan.

## 6. Public docs are slightly ahead of implementation intent

### Impact

The repo framing is strong, but if the implementation changes introduce sharper constraints, the docs should be tightened to match.

### Recommendation

Once the real screen path lands, update only the docs needed to keep the repo honest.

## 7. Decorative device chrome should remain optional

### Risk

It is easy to spend time on a browser phone frame before the preview runtime is real.

### Recommendation

Treat any iPhone-like shell as optional presentation. The Day 1 acceptance remains: one real mounted screen.
