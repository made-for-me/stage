/**
 * Browser iframe / blob URL assembly for isolated previews.
 */

export function previewFrameDocument(options: { title: string; bodyHtml: string }): string {
  const { title, bodyHtml } = options;
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      html, body { height: 100%; margin: 0; font-family: system-ui, sans-serif; }
      #root { min-height: 100%; display: grid; place-items: center; padding: 1rem; }
    </style>
  </head>
  <body>
    <div id="root">${bodyHtml}</div>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
