import { previewFrameDocument } from "../preview/frame.js";
import { STAGE_VERSION } from "../version.js";

export function devShellHtml(): string {
  const frameSrc = "/preview/frame";
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stage — dev</title>
    <style>
      :root { color-scheme: dark light; font-family: system-ui, sans-serif; }
      body { margin: 0; display: grid; grid-template-rows: auto 1fr; min-height: 100vh; }
      header { padding: 12px 16px; border-bottom: 1px solid #ccc; display: flex; align-items: center; gap: 12px; }
      iframe { width: 100%; height: 100%; border: 0; background: #111; }
      code { font-size: 13px; }
    </style>
  </head>
  <body>
    <header>
      <strong>Stage</strong>
      <span>v${escapeHtml(STAGE_VERSION)}</span>
      <span style="opacity:.7">experimental preview shell</span>
    </header>
    <iframe title="Stage preview" src="${frameSrc}"></iframe>
  </body>
</html>`;
}

export function devFrameHtml(): string {
  return previewFrameDocument({
    title: "Stage preview",
    bodyHtml: `<p>Preview surface placeholder. Next: mount a real screen from your app entry.</p>
      <p><small>Stage v${escapeHtml(STAGE_VERSION)}</small></p>`,
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
