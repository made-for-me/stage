import path from "node:path";
import { readFile } from "node:fs/promises";

export interface BuildManifestOptions {
  projectRoot: string;
  screen?: string;
}

export interface Day1Manifest {
  projectRoot: string;
  entryPath: string;
  screenPath: string;
  assetRoots: string[];
  warnings: string[];
  shimMap: Record<string, string>;
  files: Record<string, string>;
}

const DEFAULT_SCREEN = "app/(auth)/welcome.tsx";

// Regular expression to capture static import/export statements
const IMPORT_RE =
  /(?:import\s+(?:.+?\s+from\s+)?|export\s+(?:.+?\s+from\s+)?)\"([^\"]+)\"|'([^']+)'/g;

function normalizeSlashes(value: string): string {
  return value.split(path.sep).join("/");
}

function toProjectPath(projectRoot: string, absolutePath: string): string {
  const relative = normalizeSlashes(path.relative(projectRoot, absolutePath));
  return `/project/${relative}`;
}

function isRelativeImport(specifier: string): boolean {
  return specifier.startsWith("./") || specifier.startsWith("../");
}

function resolveCandidates(fromFile: string, specifier: string): string[] {
  const base = path.resolve(path.dirname(fromFile), specifier);
  return [
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
}

async function tryResolveImport(fromFile: string, specifier: string): Promise<string | null> {
  for (const candidate of resolveCandidates(fromFile, specifier)) {
    try {
      await readFile(candidate, "utf8");
      return candidate;
    } catch {
      // continue
    }
  }
  return null;
}

async function scanLocalGraph(entryAbsPath: string): Promise<Map<string, string>> {
  const visited = new Map<string, string>();
  async function visit(fileAbsPath: string): Promise<void> {
    if (visited.has(fileAbsPath)) return;
    const source = await readFile(fileAbsPath, "utf8");
    visited.set(fileAbsPath, source);
    const imports = Array.from(source.matchAll(IMPORT_RE)).flatMap((match) =>
      match[1] ? [match[1]] : match[2] ? [match[2]] : [],
    );
    for (const specifier of imports) {
      if (!isRelativeImport(specifier)) continue;
      const resolved = await tryResolveImport(fileAbsPath, specifier);
      if (!resolved) continue;
      await visit(resolved);
    }
  }
  await visit(entryAbsPath);
  return visited;
}

async function readOptionalUtf8(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

// Helper to read injected files relative to this repository structure
async function readInjectedFile(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

export async function buildManifest(options: BuildManifestOptions): Promise<Day1Manifest> {
  const screen = options.screen ?? DEFAULT_SCREEN;
  const warnings: string[] = [];

  const screenAbsPath = path.resolve(options.projectRoot, screen);
  const scanned = await scanLocalGraph(screenAbsPath);

  // compute injected file directory relative to this patch directory
  const injectedRoot = path.resolve(
    process.cwd(),
    "stage_day1/browser-metro/example/src/day1-preview/injected",
  );

  const files: Record<string, string> = {
    "/__preview__/preview-entry.tsx": await readInjectedFile(
      path.join(injectedRoot, "preview-entry.tsx"),
    ),
    "/__preview__/expo-router.ts": await readInjectedFile(
      path.join(injectedRoot, "expo-router.ts"),
    ),
    "/__preview__/expo-symbols.tsx": await readInjectedFile(
      path.join(injectedRoot, "expo-symbols.tsx"),
    ),
    "/__preview__/expo-splash-screen.ts": await readInjectedFile(
      path.join(injectedRoot, "expo-splash-screen.ts"),
    ),
    "/__preview__/expo-haptics.ts": await readInjectedFile(
      path.join(injectedRoot, "expo-haptics.ts"),
    ),
  };

  // Add scanned local project files into /project namespace
  for (const [absolutePath, source] of scanned.entries()) {
    files[toProjectPath(options.projectRoot, absolutePath)] = source;
  }

  // Optionally include package.json and app.json at root of /project
  const packageJson = await readOptionalUtf8(
    path.resolve(options.projectRoot, "package.json"),
  );
  if (packageJson) {
    files["/package.json"] = packageJson;
  } else {
    warnings.push("Missing apps/mobile/package.json");
  }
  const appJson = await readOptionalUtf8(path.resolve(options.projectRoot, "app.json"));
  if (appJson) {
    files["/app.json"] = appJson;
  } else {
    warnings.push("Missing apps/mobile/app.json");
  }

  return {
    projectRoot: normalizeSlashes(options.projectRoot),
    entryPath: "/__preview__/preview-entry.tsx",
    screenPath: `/project/${normalizeSlashes(screen)}`,
    assetRoots: ["/project/assets"],
    warnings,
    shimMap: {
      "expo-router": "/__preview__/expo-router.ts",
      "expo-symbols": "/__preview__/expo-symbols.tsx",
      "expo-splash-screen": "/__preview__/expo-splash-screen.ts",
      "expo-haptics": "/__preview__/expo-haptics.ts",
    },
    files,
  };
}