# Minimal viewer flow

This is the browser-first validation path for Stage DevTools.

## Inputs

- `sample-data/screen-map.v1.json`
- `sample-data/session-ref.v1.json`
- `sample-data/screens/*.json`

## Flow

1. Open the static viewer shell.
2. Load the screen map and session reference.
3. Render a route catalog on the left.
4. Render the selected screen metadata in the center.
5. Render session and evidence metadata on the right.
6. Fall back to static screenshots when no live session exists.

## Viewer responsibilities

- Make the preview structure understandable without the browser devtools open.
- Show unsupported or partially supported screens clearly.
- Keep route, session, and evidence references visible at all times.
- Prefer static JSON and images over app-specific runtime code.

## Non-goals

- No custom backend is required for the sample viewer.
- No native device control lives in this package.
- No business logic for preview generation belongs here.
