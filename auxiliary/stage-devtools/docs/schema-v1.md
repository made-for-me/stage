# Stage DevTools schema v1

This document defines the data shape consumed by the browser viewer and the review workflows.
The goal is to keep the contract explicit, versioned, and easy to extend without breaking older exports.

## Versioning

- `screen-map.v1` describes route, screenshot, and journey evidence exported from `stage`.
- `session-ref.v1` describes a running or recorded session exported from `stage-runner`.
- New versions must add a new suffix instead of mutating these shapes in place.

## `ScreenMapV1`

`ScreenMapV1` is the preview map for a single app and target platform.

Required top-level fields:

- `schemaVersion`: literal string `screen-map.v1`
- `app`: app metadata and preview source
- `platform`: device and viewport context
- `screens`: ordered list of screen entries
- `transitions`: route-to-route interactions
- `journeys`: user-facing flows to validate
- `diagnostics`: preview warnings and errors

Recommended shape:

```json
{
  "schemaVersion": "screen-map.v1",
  "app": {
    "name": "stage-demo",
    "slug": "stage-demo",
    "framework": "expo-router",
    "entryRoute": "/(tabs)/home"
  },
  "platform": {
    "name": "ios",
    "deviceType": "iPhone 15 Pro",
    "viewport": { "width": 393, "height": 852 }
  },
  "screens": [],
  "transitions": [],
  "journeys": [],
  "diagnostics": []
}
```

Screen entries should include:

- `id`: stable screen identifier
- `title`: human-readable label
- `route`: Expo Router route or equivalent preview route
- `status`: `supported`, `partial`, or `blocked`
- `screenshot`: relative path to the captured image or diff asset
- `notes`: short viewer-facing explanation

Transition entries should include:

- `from`: source screen id
- `event`: human-readable trigger such as `tap:Settings`
- `to`: destination screen id
- `evidence`: screenshot or artifact references

Journey entries should include:

- `id`: stable flow identifier
- `title`: user-oriented name
- `steps`: ordered list of screen or action steps
- `assertions`: optional acceptance checks for the flow

Diagnostics should be viewer-safe and concise:

- `level`: `info`, `warning`, or `error`
- `code`: stable machine-readable reason
- `message`: short explanation
- `file`: optional source file or route reference

## `SessionRef`

`SessionRef` is the runtime handle for a live or recorded device session.

Required top-level fields:

- `schemaVersion`: literal string `session-ref.v1`
- `id`: session identifier
- `platform`: `ios` or `android`
- `deviceType`: human-readable device model
- `status`: `queued`, `running`, `stopped`, or `failed`
- `streamUrl`: browser stream endpoint
- `controlUrl`: action/control endpoint

Recommended extras:

- `recordingUrl`: post-run evidence recording
- `buildId`: linked build identifier
- `previewRoute`: route tied to the session
- `startedAt` and `endedAt`: timestamps for evidence timelines

## Consumption rules

- The viewer reads `ScreenMapV1` first to build the route catalog.
- The viewer uses `SessionRef` to decide whether a live stream, replay, or static screenshot should be shown.
- Missing artifacts should degrade to a visible placeholder, not a blank page.
- Diagnostics should be surfaced inline with the screen list and the evidence panel.
