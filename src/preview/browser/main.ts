/// <reference lib="dom" />

import type { PreviewManifest, PreviewUiState } from "../../types/index.js";
import { renderPreviewState } from "../frame.js";

type WorkerSuccess = { ok: true; code: string };
type WorkerFailure = { ok: false; error: string };

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing #root for Stage iOS preview frame.");
}

const root = rootElement;

const initialState: PreviewUiState = { kind: "loading" };
render(initialState);
notifyParent(initialState);

void boot();

async function boot(): Promise<void> {
  let worker: Worker | null = null;
  let bundleUrl: string | null = null;

  try {
    const manifest = await loadManifest();
    const targetLabel = manifest.target.label;

    render({
      kind: "loading",
      targetLabel,
    });
    notifyParent({
      kind: "loading",
      targetLabel,
    });

    if (!manifest.entryPath) {
      throw new Error(formatDiagnostics(manifest));
    }

    worker = new Worker("/preview/assets/worker.js", { type: "module" });
    const result = await bundleInWorker(worker, manifest);

    if (!result.ok) {
      throw new Error(result.error);
    }

    bundleUrl = URL.createObjectURL(
      new Blob([result.code], {
        type: "application/javascript",
      }),
    );

    renderMounted(bundleUrl, targetLabel);
    notifyParent({
      kind: "mounted",
      targetLabel,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    render({
      kind: "failed",
      message,
    });
    notifyParent({
      kind: "failed",
      message,
    });
  } finally {
    worker?.terminate();
    window.addEventListener("beforeunload", () => {
      if (bundleUrl) {
        URL.revokeObjectURL(bundleUrl);
      }
    });
  }
}

async function loadManifest(): Promise<PreviewManifest> {
  const response = await fetch(`/preview/manifest${window.location.search}`);

  if (!response.ok) {
    throw new Error(`Failed to load Stage manifest (${response.status}).`);
  }

  return (await response.json()) as PreviewManifest;
}

function bundleInWorker(
  worker: Worker,
  manifest: PreviewManifest,
): Promise<WorkerSuccess | WorkerFailure> {
  return new Promise((resolve, reject) => {
    worker.addEventListener(
      "message",
      (event: MessageEvent<WorkerSuccess | WorkerFailure>) => {
        resolve(event.data);
      },
      { once: true },
    );
    worker.addEventListener(
      "error",
      (event) => {
        reject(new Error(event.message || "Stage preview worker crashed."));
      },
      { once: true },
    );
    worker.postMessage({
      entryPath: manifest.entryPath,
      files: manifest.files,
      shimMap: manifest.shimMap,
      pathAliases: manifest.target.pathAliases,
      packageServerUrl: "https://esm.reactnative.run",
      assetPublicPath: "/preview/project",
    });
  });
}

function render(state: PreviewUiState): void {
  root.innerHTML = renderPreviewState(state);
}

function renderMounted(bundleUrl: string, targetLabel: string): void {
  root.innerHTML = renderPreviewState({
    kind: "mounted",
    targetLabel,
  });

  const slot = root.querySelector<HTMLElement>("[data-stage-slot='preview']");

  if (!slot) {
    throw new Error("Missing preview slot for Stage iOS preview frame.");
  }

  const frame = document.createElement("iframe");
  frame.title = "Stage iOS preview runtime";
  frame.sandbox.add("allow-scripts", "allow-same-origin");
  frame.style.width = "100%";
  frame.style.height = "100%";
  frame.style.border = "0";
  frame.style.display = "block";
  frame.style.background = "#f2f4f8";
  frame.srcdoc = buildIframeDocument(bundleUrl);

  slot.appendChild(frame);
}

function buildIframeDocument(bundleUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body, #root {
        margin: 0;
        width: 100%;
        height: 100%;
        background: #f2f4f8;
      }
      body {
        overflow: auto;
        color: #0b1017;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script src="${bundleUrl}"></script>
  </body>
</html>`;
}

function formatDiagnostics(manifest: PreviewManifest): string {
  const lines = manifest.target.diagnostics.map((diagnostic) => {
    return `[${diagnostic.level}] ${diagnostic.code}: ${diagnostic.message}`;
  });

  if (lines.length === 0) {
    return "Stage could not create a preview manifest.";
  }

  return lines.join("\n");
}

function notifyParent(state: PreviewUiState): void {
  window.parent.postMessage(
    {
      source: "stage-preview",
      state,
    },
    window.location.origin,
  );
}
