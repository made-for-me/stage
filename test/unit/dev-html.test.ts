import { describe, expect, it } from "vitest";
import { renderPreviewState } from "../../src/preview/frame.js";
import { devFrameHtml, devShellHtml } from "../../src/server/dev-html.js";

describe("dev HTML", () => {
  it("renders the shell with ios-preview language and fidelity notes", () => {
    const html = devShellHtml({
      frameSrc: "/preview/frame?screen=app/index",
      projectRoot: "/tmp/app",
      targetLabel: "fixture-expo-stage-preview:app/index.tsx",
    });

    expect(html).toContain('id="preview-status"');
    expect(html).toContain("ios-preview · loading");
    expect(html).toContain("/preview/frame?screen=app/index");
    expect(html).toContain("fixture-expo-stage-preview:app/index.tsx");
    expect(html).toContain("Fidelity note");
    expect(html).toContain("iPhone-like browser preview");
  });

  it("renders the frame document with the app runtime entrypoint", () => {
    const html = devFrameHtml();

    expect(html).toContain("/preview/assets/app.js");
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain("Stage iOS preview frame");
  });

  it("renders the preview shell states with iOS-preview chrome", () => {
    const loading = renderPreviewState({
      kind: "loading",
      targetLabel: "fixture-expo-stage-preview:app/index.tsx",
    });
    const mounted = renderPreviewState({
      kind: "mounted",
      targetLabel: "fixture-expo-stage-preview:app/index.tsx",
    });
    const failed = renderPreviewState({
      kind: "failed",
      message: "Native module unavailable",
      code: "MODULE_UNSUPPORTED",
    });

    expect(loading).toContain("Loading iOS preview");
    expect(loading).toContain("ios-preview");
    expect(loading).toContain("best-effort fidelity");

    expect(mounted).toContain('data-stage-slot="preview"');
    expect(mounted).toContain("Preview mounted");
    expect(mounted).toContain("compare with Expo Go");

    expect(failed).toContain("Preview failed");
    expect(failed).toContain("Native module unavailable");
    expect(failed).toContain("native-only APIs");
  });
});
