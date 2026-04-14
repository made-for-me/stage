import path from "node:path";
import { describe, expect, it } from "vitest";
import { createLocalPreviewTarget } from "../../src/adapters/local.js";
import {
  buildPreviewManifest,
  createScreenMapV1,
  describePreviewPipeline,
} from "../../src/core/pipeline.js";

const fixtureRoot = path.resolve(process.cwd(), "test/fixtures/expo-managed-app");

describe("preview pipeline", () => {
  it("resolves an Expo fixture route and produces a stable pipeline label", async () => {
    const target = await createLocalPreviewTarget({ cwd: fixtureRoot });

    expect(target.provider).toBe("expo-router");
    expect(target.previewMode).toBe("ios-preview");
    expect(target.route).toBe("app/index.tsx");
    expect(target.entryFile).toContain("app/index.tsx");
    expect(target.routeTitle).toBe("Home");
    expect(target.availableVariants).toEqual(["default", "review"]);
    expect(target.selectedVariant?.params.user).toBe("guest");
    expect(describePreviewPipeline(target)).toContain("expo-router:app/index.tsx");
  });

  it("builds a manifest with shims, local files, and a versioned screen map", async () => {
    const target = await createLocalPreviewTarget({ cwd: fixtureRoot, variant: "review" });
    const manifest = await buildPreviewManifest(target);

    expect(manifest.version).toBe("1");
    expect(manifest.entryPath).toBe("/__stage__/preview-entry.tsx");
    expect(manifest.previewContext.variant).toBe("review");
    expect(manifest.previewContext.params.user).toBe("reviewer");
    expect(manifest.previewContext.mockData.headline).toBe("Visual review preset enabled.");
    expect(manifest.files["/__stage__/shims/expo-router.tsx"]).toContain("useRouter");
    expect(manifest.files["/project/app/index.tsx"]).toContain("GreetingCard");
    expect(manifest.files["/project/src/components/GreetingCard.tsx"]).toContain("fixtureCopy");
    expect(manifest.files["/project/src/stage-preview.ts"]).toContain("__STAGE_PREVIEW_CONTEXT__");
    expect(manifest.target.pathAliases).toEqual([
      { find: "@/", replacement: "/project/src/", exact: false },
    ]);
    expect(manifest.compatibility["expo-router"]?.status).toBe("shimmed");
    expect(manifest.compatibility["react-native-maps"]?.status).toBe("unsupported");
    expect(manifest.screenMap.version).toBe("1");
    expect(manifest.screenMap.screens).toEqual([
      {
        id: "app/index.tsx#review",
        title: "Home",
        route: "app/index.tsx",
        status: "ready",
      },
    ]);
  });

  it("records diagnostics for unresolved routes, unsupported imports, and missing assets", async () => {
    const unresolvedTarget = await createLocalPreviewTarget({
      cwd: fixtureRoot,
      route: "missing-screen",
    });
    expect(
      unresolvedTarget.diagnostics.some((diagnostic) => diagnostic.code === "ROUTE_NOT_FOUND"),
    ).toBe(true);
    expect(
      unresolvedTarget.diagnostics.some((diagnostic) => diagnostic.code === "ASSET_ROOT_MISSING"),
    ).toBe(true);

    const unsupportedTarget = await createLocalPreviewTarget({
      cwd: fixtureRoot,
      route: "unsupported",
    });
    const unsupportedManifest = await buildPreviewManifest(unsupportedTarget);

    expect(
      unsupportedManifest.target.diagnostics.some(
        (diagnostic) => diagnostic.code === "MODULE_UNSUPPORTED",
      ),
    ).toBe(true);
    expect(
      unsupportedManifest.target.diagnostics.some(
        (diagnostic) => diagnostic.code === "MODULE_SHIMMED",
      ),
    ).toBe(false);
  });

  it("falls back to the default variant when an unknown variant is requested", async () => {
    const target = await createLocalPreviewTarget({ cwd: fixtureRoot, variant: "unknown" });

    expect(target.variant).toBe("unknown");
    expect(target.selectedVariant?.title).toBe("Logged out");
    expect(target.selectedVariant?.params.user).toBe("guest");
  });

  it("exports a screen map contract from the target state", async () => {
    const target = await createLocalPreviewTarget({ cwd: fixtureRoot });
    const screenMap = createScreenMapV1(target);

    expect(screenMap.app.name).toBe("fixture-expo-stage-preview");
    expect(screenMap.journeys).toEqual([
      {
        id: "preview:default",
        screenIds: ["app/index.tsx#default"],
      },
    ]);
  });
});
