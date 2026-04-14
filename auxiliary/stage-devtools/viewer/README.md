# Viewer shell

This is the minimal browser-first viewer for `stage-devtools`.

## Purpose

- Load the versioned preview data from `../sample-data`.
- Show the route catalog, session reference, and evidence bundle in one browser page.
- Provide a stable place to attach a richer React or framework-based viewer later.

## Expected inputs

- `../sample-data/screen-map.v1.json`
- `../sample-data/session-ref.v1.json`
- `../sample-data/screens/*.json`

## Interaction model

- Select a screen from the catalog.
- Inspect the screen metadata and diagnostics.
- Review the session status and evidence references.
- Swap in a live stream URL when the session exists.
