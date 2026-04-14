import type { PreviewUiState } from "../types/index.js";

export function previewFrameDocument(options: { title: string; scriptUrl: string }): string {
  const { title, scriptUrl } = options;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: dark;
        --stage-surface: #07111b;
        --stage-surface-2: #0a1320;
        --stage-surface-3: #11192a;
        --stage-panel: rgba(8, 14, 24, 0.88);
        --stage-panel-border: rgba(255, 255, 255, 0.1);
        --stage-text: #ecf2fa;
        --stage-text-muted: #b9c6d7;
        --stage-accent: #8db3ff;
        --stage-warning: #ffd779;
        --stage-danger: #ff9a85;
      }
      html,
      body {
        height: 100%;
        margin: 0;
        background:
          radial-gradient(circle at top, rgba(86, 150, 255, 0.12), transparent 28%),
          linear-gradient(180deg, #08111a 0%, #050b12 54%, #04080e 100%);
      }
      body {
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--stage-text);
      }
      #root {
        height: 100%;
      }
      .stage-preview-shell {
        min-height: 100%;
        display: grid;
        place-items: center;
        padding: 24px;
      }
      .stage-device {
        width: min(100%, 460px);
        display: grid;
        gap: 14px;
      }
      .stage-device__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 0 6px;
      }
      .stage-chip,
      .stage-status,
      .stage-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 30px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.05);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }
      .stage-chip {
        color: var(--stage-accent);
      }
      .stage-status {
        color: var(--stage-text-muted);
      }
      .stage-status[data-state="loading"] {
        color: var(--stage-warning);
      }
      .stage-status[data-state="mounted"] {
        color: #8bedb6;
      }
      .stage-status[data-state="failed"] {
        color: var(--stage-danger);
      }
      .stage-phone {
        position: relative;
        padding: 14px;
        border-radius: 34px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.1), transparent 18%),
          linear-gradient(180deg, #1d2432 0%, #0b1018 100%);
        box-shadow:
          0 26px 90px rgba(0, 0, 0, 0.48),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
      }
      .stage-phone::before {
        content: "";
        position: absolute;
        inset: 8px 96px auto;
        height: 26px;
        border-radius: 999px;
        background: rgba(4, 8, 14, 0.94);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.28);
      }
      .stage-screen {
        position: relative;
        min-height: min(80vh, 780px);
        border-radius: 26px;
        overflow: hidden;
        background:
          radial-gradient(circle at top, rgba(255, 255, 255, 0.06), transparent 34%),
          linear-gradient(180deg, #f7f8fc 0%, #eef2f8 100%);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      .stage-screen[data-stage-state="loading"] {
        background:
          radial-gradient(circle at top, rgba(141, 179, 255, 0.18), transparent 28%),
          linear-gradient(180deg, #0d1520 0%, #0a111a 100%);
      }
      .stage-screen[data-stage-state="failed"] {
        background:
          radial-gradient(circle at top, rgba(255, 154, 133, 0.16), transparent 28%),
          linear-gradient(180deg, #140d12 0%, #0d1017 100%);
      }
      .stage-state {
        min-height: 100%;
        padding: 30px;
        display: grid;
        align-content: center;
        justify-items: center;
        gap: 12px;
        text-align: center;
      }
      .stage-state--mounted {
        justify-items: stretch;
        text-align: left;
        align-content: stretch;
        grid-template-rows: auto auto auto 1fr;
      }
      .stage-kicker {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--stage-accent);
      }
      .stage-title {
        margin: 0;
        font-size: 24px;
        line-height: 1.1;
        letter-spacing: -0.04em;
        color: #f5f8fc;
      }
      .stage-screen[data-stage-state="mounted"] .stage-title {
        color: #0b1017;
      }
      .stage-copy {
        margin: 0;
        max-width: 30ch;
        line-height: 1.6;
        color: var(--stage-text-muted);
      }
      .stage-screen[data-stage-state="mounted"] .stage-copy {
        color: #38455a;
        max-width: none;
      }
      .stage-copy strong {
        color: inherit;
      }
      .stage-pills {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
        margin-top: 4px;
      }
      .stage-state--mounted .stage-pills {
        justify-content: flex-start;
      }
      .stage-pill {
        color: var(--stage-text-muted);
        letter-spacing: 0.08em;
      }
      .stage-screen[data-stage-state="mounted"] .stage-pill {
        color: #495569;
      }
      .stage-pre {
        width: min(100%, 100%);
        margin: 4px 0 0;
        padding: 14px;
        border-radius: 14px;
        overflow: auto;
        text-align: left;
        background: rgba(255, 255, 255, 0.06);
        color: var(--stage-danger);
        font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .stage-screen[data-stage-state="mounted"] .stage-pre {
        background: rgba(12, 18, 28, 0.06);
        color: #5a6678;
      }
      .stage-slot {
        position: absolute;
        inset: 0;
      }
      .stage-state--mounted .stage-slot {
        position: relative;
        inset: auto;
        min-height: 420px;
        overflow: hidden;
        border-radius: 18px;
        box-shadow: inset 0 0 0 1px rgba(12, 18, 28, 0.08);
      }
      .stage-slot iframe {
        display: block;
        width: 100%;
        height: 100%;
        border: 0;
        background: #f2f4f8;
      }
      .stage-footer {
        display: grid;
        gap: 6px;
        padding: 0 6px;
        color: var(--stage-text-muted);
        font-size: 12px;
        line-height: 1.5;
      }
      .stage-footer strong {
        color: var(--stage-text);
        font-weight: 600;
      }
      @media (max-width: 640px) {
        .stage-preview-shell {
          padding: 0;
        }

        .stage-device {
          width: 100%;
        }

        .stage-phone {
          border-radius: 0;
          padding: 0;
        }

        .stage-phone::before {
          inset: 12px 96px auto;
        }

        .stage-screen {
          min-height: calc(100vh - 110px);
          border-radius: 0;
          border-left: 0;
          border-right: 0;
        }
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${escapeHtml(scriptUrl)}"></script>
  </body>
</html>`;
}

export function renderPreviewState(state: PreviewUiState): string {
  if (state.kind === "loading") {
    return createPreviewShell({
      stateKind: "loading",
      title: "Loading iOS preview…",
      copy: state.targetLabel
        ? `Preparing ${escapeHtml(state.targetLabel)} inside the browser-first iOS preview shell.`
        : "Preparing your Expo route inside the browser-first iOS preview shell.",
      pills: ["ios-preview", "Expo web", "best-effort fidelity"],
    });
  }

  if (state.kind === "mounted") {
    return createPreviewShell({
      stateKind: "mounted",
      title: "Preview mounted",
      copy: `${escapeHtml(state.targetLabel)} is running in the iOS-preview shell.`,
      pills: ["ios-preview", "mounted", "compare with Expo Go"],
      slot: true,
    });
  }

  return createPreviewShell({
    stateKind: "failed",
    title: "Preview failed",
    copy: escapeHtml(state.message),
    detail: state.code ? `Code: ${escapeHtml(state.code)}` : undefined,
    pills: ["ios-preview", "check shims", "native-only APIs"],
  });
}

function createPreviewShell(options: {
  stateKind: "loading" | "mounted" | "failed";
  title: string;
  copy: string;
  pills: string[];
  detail?: string;
  slot?: boolean;
}): string {
  const { stateKind, title, copy, pills, detail, slot } = options;
  const content = slot
    ? `<div class="stage-state stage-state--mounted">
        <span class="stage-kicker">iOS Preview</span>
        <h1 class="stage-title">${escapeHtml(title)}</h1>
        <p class="stage-copy">${copy}</p>
        <div class="stage-slot" data-stage-slot="preview"></div>
      </div>`
    : `<div class="stage-state">
        <span class="stage-kicker">iOS Preview</span>
        <h1 class="stage-title">${escapeHtml(title)}</h1>
        <p class="stage-copy">${copy}</p>
        ${
          detail
            ? `<pre class="stage-pre">${detail}</pre>`
            : `<p class="stage-copy">Browser rendering is best effort. Compare against Expo Go for native fidelity checks.</p>`
        }
      </div>`;

  return `<div class="stage-preview-shell" data-state="${stateKind}">
    <section class="stage-device">
      <div class="stage-device__header">
        <span class="stage-chip">ios-preview</span>
        <span class="stage-status" data-state="${stateKind}">${escapeHtml(stateKind)}</span>
      </div>
      <div class="stage-phone">
        <div class="stage-screen" data-stage-state="${stateKind}">
          ${content}
        </div>
      </div>
      <div class="stage-footer">
        <strong>Browser-first Expo preview.</strong>
        <span>Fidelity is intentionally iPhone-like, but native-only controls, fonts, and gestures can still diverge from a physical device.</span>
        <div class="stage-pills">
          ${pills.map((pill) => `<span class="stage-pill">${escapeHtml(pill)}</span>`).join("")}
        </div>
      </div>
    </section>
  </div>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
