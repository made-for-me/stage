# stage-devtools scaffold

Browser-first validation tooling that sits on top of `stage` and `stage-runner`.

## What lives here

- `docs/schema-v1.md`: versioned contract for `ScreenMapV1` and `SessionRef`
- `docs/viewer-flow.md`: minimal browser viewer flow for static preview data
- `viewer/index.html`: tiny static viewer shell that consumes the sample data
- `sample-data/`: example `screen-map.v1.json`, `session-ref.v1.json`, and screen metadata
- `prompts/review-pr.md`: PR review worker outline
- `prompts/visual-diff.md`: screenshot regression worker outline

## Intended workflow

1. Export preview data from `stage` into `sample-data`-shaped files.
2. Open `viewer/index.html` in a browser or static host.
3. Inspect route metadata, screenshots, and session references side by side.
4. Use the prompts for automated review and visual-diff jobs.

## Contract boundary

- `stage` owns preview generation and `ScreenMapV1` emission.
- `stage-runner` owns session execution, stream URLs, and control channels.
- `stage-devtools` only reads those artifacts and turns them into reviewable evidence.
