# Session model

A `StageSessionRef` is the stable browser contract for a running preview.

```json
{
  "id": "clubhall-ar2-arena-ui-sdk57-dev-client",
  "projectId": "clubhall",
  "branch": "ar2/arena-ui-sdk57-e69f",
  "sha": "d4e5f6g",
  "target": "dev-client",
  "status": "live",
  "port": 8081,
  "worktreeRoot": "/workspace/.stage-worktrees/clubhall/ar2-arena-ui-sdk57-e69f",
  "previewUrl": "http://127.0.0.1:8081",
  "devClientUrl": "clubhall://expo-development-client/?url=...",
  "sdkVersion": "57.0.11",
  "runtimeFingerprint": "9cdb24b84fd1",
  "compatibility": "compatible"
}
```

Lifecycle: `preparing` → `starting` → `live` → `stopped`, with `failed` available from any active state.

Stage retains worktrees after stop so dependency links and Metro caches can be reused. A session never mutates the branch ref: worktrees are detached at the selected ref.

## Scene model

AR2 publishes each captured screen to `POST /api/scenes` with the project, branch, current SHA,
route, title, dimensions, and a base64 PNG, JPEG, or WebP data URL. Stage rejects stale SHAs and stores
one current image per branch + commit + route. `GET /api/stage` returns only scenes matching each
branch's current SHA, so a new commit immediately presents an empty capture queue until AR2 refreshes
the configured routes.

The image bytes are served from `/api/scenes/:id/image`. Historical commit assets remain on disk for
future visual diffs but do not appear in the current branch shelf.
