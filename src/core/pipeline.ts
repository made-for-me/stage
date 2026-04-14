import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  PreviewDiagnostic,
  PreviewManifest,
  PreviewPathAlias,
  PreviewTarget,
  ScreenMapV1,
} from "../types/index.js";
import { getCompatibilityRegistry, getModuleSupport } from "./compatibility.js";

const IMPORT_RE =
  /(?:import\s+(?:.+?\s+from\s+)?|export\s+(?:.+?\s+from\s+)?)["']([^"']+)["']|require\((?:["'])([^"']+)(?:["'])\)/g;

export async function buildPreviewManifest(target: PreviewTarget): Promise<PreviewManifest> {
  const diagnostics = [...target.diagnostics];
  const files: Record<string, string> = {};

  if (target.entryFile) {
    const entryAbsolute = toAbsoluteProjectPath(target.projectRoot, target.entryFile);
    const graph = await scanLocalGraph(
      entryAbsolute,
      target.projectRoot,
      target.pathAliases,
      diagnostics,
    );

    for (const [absolutePath, content] of graph.entries()) {
      files[toProjectPath(target.projectRoot, absolutePath)] = content;
    }

    files["/__stage__/preview-entry.tsx"] = createPreviewEntrySource(target);
    files["/__stage__/shims/expo-router.tsx"] = createExpoRouterShim();
    files["/__stage__/shims/expo-haptics.ts"] = createExpoHapticsShim();
    files["/__stage__/shims/expo-splash-screen.ts"] = createExpoSplashScreenShim();
    files["/__stage__/shims/expo-symbols.tsx"] = createExpoSymbolsShim();

    await maybeAddJsonFile(target.projectRoot, "package.json", files);
    await maybeAddJsonFile(target.projectRoot, "app.json", files);
    await maybeAddJsonFile(target.projectRoot, "tsconfig.json", files);
  }

  return {
    version: "1",
    generatedAt: new Date().toISOString(),
    target: {
      ...target,
      diagnostics,
    },
    entryPath: target.entryFile ? "/__stage__/preview-entry.tsx" : null,
    previewContext: {
      route: target.route,
      routeTitle: target.routeTitle,
      variant: target.variant,
      previewMode: target.previewMode,
      params: target.selectedVariant?.params ?? {},
      mockData: target.selectedVariant?.mockData ?? {},
    },
    files,
    shimMap: {
      "expo-router": "/__stage__/shims/expo-router.tsx",
      "expo-haptics": "/__stage__/shims/expo-haptics.ts",
      "expo-splash-screen": "/__stage__/shims/expo-splash-screen.ts",
      "expo-symbols": "/__stage__/shims/expo-symbols.tsx",
    },
    assetRoots: target.assetRoots,
    compatibility: getCompatibilityRegistry(),
    warnings: diagnostics.filter((diagnostic) => diagnostic.level !== "error"),
    screenMap: createScreenMapV1({
      ...target,
      diagnostics,
    }),
  };
}

export function createScreenMapV1(target: PreviewTarget): ScreenMapV1 {
  return {
    version: "1",
    app: {
      name: target.appName,
      platform: target.platform,
      provider: target.provider,
    },
    screens: [
      {
        id: buildScreenId(target),
        title: target.routeTitle,
        route: target.route,
        status: target.diagnostics.some((diagnostic) => diagnostic.level === "error")
          ? "broken"
          : "ready",
      },
    ],
    transitions: [],
    journeys: [
      {
        id: `preview:${target.variant}`,
        screenIds: [buildScreenId(target)],
      },
    ],
    diagnostics: target.diagnostics,
  };
}

export function describePreviewPipeline(target: PreviewTarget): string {
  return `${target.provider}:${target.route || "unresolved"} -> ${
    target.entryFile ? "/__stage__/preview-entry.tsx" : "unavailable"
  }`;
}

async function scanLocalGraph(
  entryAbsolute: string,
  projectRoot: string,
  pathAliases: PreviewPathAlias[],
  diagnostics: PreviewDiagnostic[],
): Promise<Map<string, string>> {
  const visited = new Map<string, string>();

  async function visit(absolutePath: string): Promise<void> {
    if (visited.has(absolutePath)) {
      return;
    }

    const source = await readFile(absolutePath, "utf8");
    visited.set(absolutePath, source);

    for (const specifier of collectImportSpecifiers(source)) {
      const support = getModuleSupport(specifier);

      if (support?.status === "unsupported") {
        diagnostics.push({
          level: "error",
          code: "MODULE_UNSUPPORTED",
          message: support.reason,
          file: normalizeSlashes(absolutePath),
        });
        continue;
      }

      if (support?.status === "shimmed") {
        diagnostics.push({
          level: "info",
          code: "MODULE_SHIMMED",
          message: `${specifier} is running through a Stage preview shim.`,
          file: normalizeSlashes(absolutePath),
        });
      }

      const resolved = await resolveImport({
        fromFile: absolutePath,
        projectRoot,
        specifier,
        pathAliases,
      });

      if (!resolved) {
        continue;
      }

      await visit(resolved);
    }
  }

  await visit(entryAbsolute);
  return visited;
}

function collectImportSpecifiers(source: string): string[] {
  return Array.from(source.matchAll(IMPORT_RE)).flatMap((match) => {
    const value = match[1] ?? match[2];
    return value ? [value] : [];
  });
}

async function resolveImport(options: {
  fromFile: string;
  projectRoot: string;
  specifier: string;
  pathAliases: PreviewPathAlias[];
}): Promise<string | null> {
  const { fromFile, projectRoot, specifier, pathAliases } = options;

  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    return tryResolve(path.resolve(path.dirname(fromFile), specifier));
  }

  const aliasTarget = resolvePathAlias(specifier, pathAliases);

  if (aliasTarget) {
    return tryResolve(toAbsoluteProjectPath(projectRoot, aliasTarget));
  }

  return null;
}

function resolvePathAlias(specifier: string, pathAliases: PreviewPathAlias[]): string | null {
  for (const alias of pathAliases) {
    if (alias.exact) {
      if (specifier === alias.find) {
        return alias.replacement;
      }

      continue;
    }

    if (specifier.startsWith(alias.find)) {
      return `${alias.replacement}${specifier.slice(alias.find.length)}`;
    }
  }

  return null;
}

async function tryResolve(base: string): Promise<string | null> {
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    path.join(base, "index.js"),
    path.join(base, "index.jsx"),
  ];

  for (const candidate of candidates) {
    try {
      await readFile(candidate, "utf8");
      return candidate;
    } catch {}
  }

  return null;
}

async function maybeAddJsonFile(
  projectRoot: string,
  relativePath: string,
  files: Record<string, string>,
): Promise<void> {
  try {
    const absolute = path.join(projectRoot, relativePath);
    const content = await readFile(absolute, "utf8");
    files[`/${normalizeSlashes(relativePath)}`] = content;
  } catch {
    // Optional project metadata.
  }
}

function createPreviewEntrySource(target: PreviewTarget): string {
  const screenPath = target.entryFile ? toProjectPath(target.projectRoot, target.entryFile) : "";
  const previewContext = JSON.stringify({
    route: target.route,
    routeTitle: target.routeTitle,
    variant: target.variant,
    previewMode: target.previewMode,
    params: target.selectedVariant?.params ?? {},
    mockData: target.selectedVariant?.mockData ?? {},
    notes: target.selectedVariant?.notes ?? null,
  });

  return `import React from "react";
import { AppRegistry, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Screen from "${screenPath}";

globalThis.__STAGE_PREVIEW_CONTEXT__ = ${previewContext};

function StagePreviewApp() {
  return React.createElement(
    SafeAreaProvider,
    null,
    React.createElement(
      View,
      { style: { flex: 1, backgroundColor: "#ffffff" } },
      React.createElement(Screen, null),
    ),
  );
}

const rootTag = document.getElementById("root");

if (!rootTag) {
  throw new Error("Missing #root for Stage preview.");
}

AppRegistry.registerComponent("StagePreviewApp", () => StagePreviewApp);
AppRegistry.runApplication("StagePreviewApp", { rootTag, initialProps: {} });
`;
}

function createExpoRouterShim(): string {
  return `import React from "react";

function passthrough(props) {
  return React.createElement(React.Fragment, null, props.children ?? null);
}

export const Stack = passthrough;
export const Tabs = passthrough;
export const Slot = passthrough;
export const Redirect = () => null;
export function Link(props) {
  const { href = "#", children, ...rest } = props ?? {};
  return React.createElement("a", { href: String(href), ...rest }, children ?? String(href));
}
export function useRouter() {
  return { push() {}, replace() {}, back() {}, canGoBack() { return false; } };
}
export function useLocalSearchParams() {
  return globalThis.__STAGE_PREVIEW_CONTEXT__?.params ?? {};
}
export function useSegments() {
  return [];
}
export function usePathname() {
  return globalThis.__STAGE_PREVIEW_CONTEXT__?.route ?? "/";
}
`;
}

function createExpoHapticsShim(): string {
  return `export async function impactAsync() {}
export async function notificationAsync() {}
export async function selectionAsync() {}
`;
}

function createExpoSplashScreenShim(): string {
  return `export async function hideAsync() {}
export async function preventAutoHideAsync() {}
`;
}

function createExpoSymbolsShim(): string {
  return `import React from "react";
export function SymbolView(props) {
  return React.createElement("span", props, props?.children ?? "symbol");
}
`;
}

function toProjectPath(projectRoot: string, absolutePath: string): string {
  return `/project/${normalizeSlashes(path.relative(projectRoot, absolutePath))}`;
}

function toAbsoluteProjectPath(projectRoot: string, projectPath: string): string {
  return path.resolve(projectRoot, projectPath.replace(/^\/?project\//, ""));
}

function buildScreenId(target: PreviewTarget): string {
  return `${target.route || "unresolved"}#${target.variant}`;
}

function normalizeSlashes(value: string): string {
  return value.split(path.sep).join("/");
}
