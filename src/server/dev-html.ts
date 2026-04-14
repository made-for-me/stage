import { previewFrameDocument } from "../preview/frame.js";
import { STAGE_VERSION } from "../version.js";

export function devShellHtml(options: {
  frameSrc: string;
  projectRoot: string;
  targetLabel: string;
}): string {
  const { frameSrc, projectRoot, targetLabel } = options;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stage</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top, rgba(86, 150, 255, 0.16), transparent 24%),
          linear-gradient(180deg, #0b1017 0%, #091119 50%, #060d14 100%);
        color: #ecf2fa;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        grid-template-rows: auto auto 1fr;
      }
      header {
        padding: 18px 22px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
      .brand {
        display: grid;
        gap: 6px;
      }
      .eyebrow {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: #8db3ff;
      }
      .headline {
        font-size: 28px;
        font-weight: 700;
        letter-spacing: -0.03em;
      }
      .subhead {
        margin: 0;
        color: #c7d2e4;
        line-height: 1.5;
        max-width: 68ch;
      }
      .meta {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .badge, code {
        border-radius: 999px;
        padding: 8px 12px;
        font-size: 12px;
      }
      .badge {
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.04);
      }
      .badge[data-state="loading"] { color: #ffd779; }
      .badge[data-state="mounted"] { color: #8bedb6; }
      .badge[data-state="failed"] { color: #ff9a85; }
      .surface {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 18px;
        padding: 18px 22px 24px;
      }
      .panel {
        display: grid;
        gap: 8px;
        padding: 16px 18px;
        border-radius: 18px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(8, 14, 22, 0.72);
      }
      .panel strong { font-size: 13px; }
      .panel span, .panel code {
        color: #c4cfde;
      }
      .panel-note {
        color: #b6c4d7;
        line-height: 1.55;
      }
      code {
        display: inline-flex;
        align-items: center;
        padding-inline: 10px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      iframe {
        width: 100%;
        min-height: 720px;
        border: 0;
        border-radius: 24px;
        background: #050b11;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
      }
      @media (max-width: 860px) {
        header {
          grid-template-columns: 1fr;
          align-items: start;
        }
        iframe {
          min-height: 560px;
        }
      }
    </style>
  </head>
  <body>
    <header>
      <div class="brand">
        <span class="eyebrow">Stage OSS</span>
        <span class="headline">iPhone-like browser preview</span>
        <p class="subhead">Stage is running in <strong>ios-preview</strong> mode: it resolves a local Expo route, builds a browser VFS with browser-metro, and mounts the screen in an isolated frame that intentionally looks like an iPhone while staying honest about fidelity gaps.</p>
      </div>
      <div class="meta">
        <span class="badge" id="preview-status" data-state="loading">ios-preview · loading</span>
        <code>v${escapeHtml(STAGE_VERSION)}</code>
      </div>
    </header>
    <div class="surface">
      <section class="panel">
        <strong>Target</strong>
        <span>${escapeHtml(targetLabel)}</span>
      </section>
      <section class="panel">
        <strong>Project root</strong>
        <code>${escapeHtml(projectRoot)}</code>
      </section>
      <section class="panel">
        <strong>Fidelity note</strong>
        <span class="panel-note">This shell is designed to feel iPhone-like for layout and review work, but native-only controls, fonts, gesture physics, and device APIs can still differ from a real device or Expo Go.</span>
      </section>
      <iframe title="Stage iOS preview shell" src="${escapeHtml(frameSrc)}"></iframe>
    </div>
    <script>
      window.addEventListener("message", (event) => {
        if (event.origin !== window.location.origin) {
          return;
        }
        if (!event.data || event.data.source !== "stage-preview") {
          return;
        }
        const badge = document.getElementById("preview-status");
        if (!badge || !event.data.state) {
          return;
        }
        badge.dataset.state = event.data.state.kind;
        badge.textContent = "ios-preview · " + event.data.state.kind;
      });
    </script>
  </body>
</html>`;
}

export function devFrameHtml(): string {
  return previewFrameDocument({
    title: "Stage iOS preview frame",
    scriptUrl: "/preview/assets/app.js",
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
