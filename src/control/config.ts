import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import type { StageConfig } from "../types/index.js";

const CONFIG_NAMES = [
  "stage.config.ts",
  "stage.config.mjs",
  "stage.config.js",
  "stage.config.json",
];

export function defineStageConfig(config: StageConfig): StageConfig {
  return config;
}

export async function loadStageConfig(
  cwd: string,
  explicitPath?: string,
): Promise<{ config: StageConfig; path: string } | null> {
  const configPath = explicitPath
    ? path.resolve(cwd, explicitPath)
    : CONFIG_NAMES.map((name) => path.resolve(cwd, name)).find((candidate) =>
        existsSync(candidate),
      );

  if (!configPath) {
    return null;
  }

  const config = configPath.endsWith(".json")
    ? (JSON.parse(await readFile(configPath, "utf8")) as StageConfig)
    : await importConfigModule(configPath);

  validateConfig(config, configPath);

  const configRoot = path.dirname(configPath);
  return {
    path: configPath,
    config: {
      ...config,
      workspaceRoot: config.workspaceRoot
        ? path.resolve(configRoot, config.workspaceRoot)
        : path.resolve(configRoot, ".stage-worktrees"),
      projects: config.projects.map((project) => ({
        ...project,
        localRoot: path.resolve(configRoot, project.localRoot),
      })),
    },
  };
}

async function importConfigModule(configPath: string): Promise<StageConfig> {
  if (!configPath.endsWith(".ts")) {
    const imported = (await import(`${pathToFileURL(configPath).href}?stage=${Date.now()}`)) as {
      default?: StageConfig;
    };
    return imported.default ?? (imported as unknown as StageConfig);
  }

  const result = await build({
    entryPoints: [configPath],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node20",
    write: false,
  });
  const output = result.outputFiles[0];
  if (!output) {
    throw new Error(`Unable to compile ${configPath}`);
  }
  const imported = (await import(
    `data:text/javascript;base64,${Buffer.from(output.text).toString("base64")}`
  )) as { default?: StageConfig };
  return imported.default ?? (imported as unknown as StageConfig);
}

function validateConfig(config: StageConfig, configPath: string): void {
  if (!config || !Array.isArray(config.projects) || config.projects.length === 0) {
    throw new Error(`${configPath} must export at least one Stage project.`);
  }

  const ids = new Set<string>();
  for (const project of config.projects) {
    if (!project.id || !project.name || !project.localRoot || !project.appRoot) {
      throw new Error(`${configPath} contains an incomplete project definition.`);
    }
    if (ids.has(project.id)) {
      throw new Error(`${configPath} contains duplicate project id ${project.id}.`);
    }
    ids.add(project.id);
  }
}
