import React, { useEffect, useMemo, useRef, useState } from "react";
import { PhoneFrame } from "./PhoneFrame";
import { loadProjectManifest } from "./load-project";
import { makeVfs } from "./make-vfs";

type State =
  | { kind: "loading" }
  | { kind: "ready"; srcDoc: string }
  | { kind: "failed"; error: string };

function buildIframeDocument(jsBlobUrl: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body, #root {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #0a0a0b;
      }
      body {
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script src="${jsBlobUrl}"></script>
  </body>
</html>`;
}

export function App() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const currentBundleUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const worker = new Worker(new URL("./preview.worker.ts", import.meta.url), {
      type: "module",
    });

    const cleanupBundleUrl = () => {
      if (currentBundleUrlRef.current) {
        URL.revokeObjectURL(currentBundleUrlRef.current);
        currentBundleUrlRef.current = null;
      }
    };

    worker.onmessage = (
      event: MessageEvent<{ ok: true; code: string } | { ok: false; error: string }>,
    ) => {
      if (disposed) return;
      if (!event.data.ok) {
        cleanupBundleUrl();
        setState({ kind: "failed", error: event.data.error });
        return;
      }
      cleanupBundleUrl();
      const jsBlob = new Blob([event.data.code], { type: "application/javascript" });
      const jsBlobUrl = URL.createObjectURL(jsBlob);
      currentBundleUrlRef.current = jsBlobUrl;
      setState({ kind: "ready", srcDoc: buildIframeDocument(jsBlobUrl) });
    };

    worker.onerror = (error) => {
      if (disposed) return;
      cleanupBundleUrl();
      setState({ kind: "failed", error: error.message || "Preview worker crashed" });
    };

    async function boot() {
      try {
        const manifest = await loadProjectManifest();
        const packageServerUrl = import.meta.env.VITE_PACKAGE_SERVER_URL || window.location.origin;
        const workerInput = makeVfs(manifest, packageServerUrl);
        worker.postMessage(workerInput);
      } catch (error) {
        if (disposed) return;
        cleanupBundleUrl();
        setState({ kind: "failed", error: error instanceof Error ? error.message : String(error) });
      }
    }

    void boot();
    return () => {
      disposed = true;
      worker.terminate();
      cleanupBundleUrl();
    };
  }, []);

  const body = useMemo(() => {
    if (state.kind === "loading") {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "grid",
            placeItems: "center",
            background: "#0a0a0b",
            color: "#f5f5f5",
            fontSize: 14,
          }}
        >
          Loading preview…
        </div>
      );
    }
    if (state.kind === "failed") {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            padding: 16,
            boxSizing: "border-box",
            background: "#0a0a0b",
            color: "#f5f5f5",
            fontSize: 12,
            whiteSpace: "pre-wrap",
            overflow: "auto",
          }}
        >
          {state.error}
        </div>
      );
    }
    return (
      <iframe
        title="day1-preview"
        srcDoc={state.srcDoc}
        sandbox="allow-scripts allow-same-origin"
        style={{ width: "100%", height: "100%", border: 0, display: "block", background: "#0a0a0b" }}
      />
    );
  }, [state]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#111318",
      }}
    >
      <PhoneFrame>{body}</PhoneFrame>
    </div>
  );
}