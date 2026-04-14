import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import type {
  PreviewDiagnostic,
  PreviewPathAlias,
  PreviewProvider,
  PreviewTarget,
  PreviewVariant,
} from "../types/index.js";

const DEFAULT_ROUTE_CANDIDATES = ["app/index.tsx", "app/(auth)/welcome.tsx"];
const DEFAULT_SHIMS = ["expo-router", "expo-haptics", "expo-splash-screen", "expo-symbols"];

export type CreateLocalPreviewTargetOptions = {
  cwd: string;
  route?: string;
  variant?: string;
};

type PackageJsonShape = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type StagePreviewConfig = {
  previewMode?: "ios-preview";
  routes?: Record<
    string,
    {
      title?: string;
      variants?: Record<
        string,
        {
          title?: string;
          params?: Record<string, string>;
          mockData?: Record<string, unknown>;
          notes?: string;
        }
      >;
    }
  >;
};

export async function createLocalPreviewTarget(
  options: CreateLocalPreviewTargetOptions,
): Promise<PreviewTarget> {
  const projectRoot = path.resolve(options.cwd);
  const diagnostics: PreviewDiagnostic[] = [];
  const packageJsonPath = path.join(projectRoot, "package.json");
  const packageJson = await readJsonFile<PackageJsonShape>(packageJsonPath);

  if (!packageJson) {
    diagnostics.push({
      level: "error",
      code: "PACKAGE_JSON_MISSING",
      message: "Could not find package.json in the target project root.",
      file: packageJsonPath,
    });
  }

  const provider = detectProvider(packageJson);

  if (provider !== "expo-router") {
    diagnostics.push({
      level: "error",
      code: "PROVIDER_UNSUPPORTED",
      message:
        "Stage v1 only supports Expo managed projects that use expo-router and React Native Web.",
      file: packageJsonPath,
    });
  }

  const entryFile = await resolveRouteFile(projectRoot, options.route);

  if (!entryFile) {
    diagnostics.push({
      level: "error",
      code: "ROUTE_NOT_FOUND",
      message: `Could not resolve a preview route${
        options.route ? ` for "${options.route}"` : ""
      }.`,
      file: path.join(projectRoot, "app"),
    });
  }

  const appAssetsRoot = path.join(projectRoot, "assets");
  const assetRoots = [];

  if (await pathExists(appAssetsRoot)) {
    assetRoots.push("/preview/project/assets");
  } else {
    diagnostics.push({
      level: "warning",
      code: "ASSET_ROOT_MISSING",
      message: "No assets/ directory was found. Static asset imports may fail in preview.",
      file: appAssetsRoot,
    });
  }

  const pathAliases = await readPathAliases(projectRoot);
  const route = entryFile
    ? normalizeSlashes(path.relative(projectRoot, entryFile))
    : (options.route ?? "");
  const previewConfig = await readJsonFile<StagePreviewConfig>(
    path.join(projectRoot, "stage.preview.json"),
  );
  const routeConfig = previewConfig?.routes?.[route];
  const variant = options.variant ?? "default";
  const selectedVariant = resolveVariant(variant, routeConfig);
  const label = `${packageJson?.name ?? path.basename(projectRoot)}:${route || "unresolved"}`;

  return {
    label,
    appName: packageJson?.name ?? path.basename(projectRoot),
    projectRoot: normalizeSlashes(projectRoot),
    provider,
    platform: "web",
    previewMode: previewConfig?.previewMode ?? "ios-preview",
    route,
    routeTitle: routeConfig?.title ?? path.basename(route || "preview"),
    entryFile: entryFile ? normalizeSlashes(entryFile) : null,
    variant,
    selectedVariant,
    availableVariants: Object.keys(routeConfig?.variants ?? {}),
    shims: DEFAULT_SHIMS,
    assetRoots,
    pathAliases,
    diagnostics,
  };
}

function detectProvider(packageJson: PackageJsonShape | null): PreviewProvider {
  const deps = {
    ...packageJson?.dependencies,
    ...packageJson?.devDependencies,
  };

  if (deps.expo && deps["expo-router"]) {
    return "expo-router";
  }

  return "unknown";
}

async function resolveRouteFile(projectRoot: string, route?: string): Promise<string | null> {
  const candidates = route ? resolveRouteCandidates(projectRoot, route) : [];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  if (route) {
    return null;
  }

  for (const candidate of DEFAULT_ROUTE_CANDIDATES.map((value) => path.join(projectRoot, value))) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return findFirstRouteFile(path.join(projectRoot, "app"));
}

function resolveRouteCandidates(projectRoot: string, route: string): string[] {
  const normalizedRoute = route.replace(/^\/+/, "");
  const prefixedRoute = normalizedRoute.startsWith("app/")
    ? normalizedRoute
    : `app/${normalizedRoute}`;
  const base = path.join(projectRoot, prefixedRoute);

  return [
    base,
    `${base}.tsx`,
    `${base}.ts`,
    path.join(base, "index.tsx"),
    path.join(base, "index.ts"),
  ];
}

async function findFirstRouteFile(appRoot: string): Promise<string | null> {
  if (!(await pathExists(appRoot))) {
    return null;
  }

  const queue = [appRoot];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      continue;
    }

    const entries = await readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const absolute = path.join(current, entry.name);

      if (entry.isDirectory()) {
        queue.push(absolute);
        continue;
      }

      if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
        return absolute;
      }
    }
  }

  return null;
}

async function readPathAliases(projectRoot: string): Promise<PreviewPathAlias[]> {
  const tsconfigPath = path.join(projectRoot, "tsconfig.json");
  const tsconfig = await readJsonFile<{
    compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> };
  }>(tsconfigPath);

  const baseUrl = tsconfig?.compilerOptions?.baseUrl ?? ".";
  const baseRoot = path.resolve(projectRoot, baseUrl);
  const paths = tsconfig?.compilerOptions?.paths ?? {};

  return Object.entries(paths).flatMap(([find, values]) => {
    const replacement = values[0];

    if (!replacement) {
      return [];
    }

    const exact = !find.includes("*");
    const normalizedFind = exact ? find : find.replace("*", "");
    const normalizedReplacement = exact
      ? toProjectFilePath(baseRoot, replacement)
      : ensureTrailingSlash(toProjectFilePath(baseRoot, replacement.replace("*", "")));

    return [
      {
        find: normalizedFind,
        replacement: normalizedReplacement,
        exact,
      },
    ];
  });
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function toProjectFilePath(projectRoot: string, filePath: string): string {
  const absolute = path.resolve(projectRoot, filePath);
  return `/project/${normalizeSlashes(path.relative(projectRoot, absolute))}`;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function resolveVariant(
  variant: string,
  routeConfig:
    | {
        title?: string;
        variants?: Record<
          string,
          {
            title?: string;
            params?: Record<string, string>;
            mockData?: Record<string, unknown>;
            notes?: string;
          }
        >;
      }
    | undefined,
): PreviewVariant | null {
  const variantConfig = routeConfig?.variants?.[variant] ?? routeConfig?.variants?.default;

  if (!variantConfig) {
    return null;
  }

  return {
    name: variant,
    title: variantConfig.title ?? variant,
    params: variantConfig.params ?? {},
    mockData: variantConfig.mockData ?? {},
    notes: variantConfig.notes,
  };
}

function normalizeSlashes(value: string): string {
  return value.split(path.sep).join("/");
}
