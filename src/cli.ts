#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createLocalPreviewTarget } from "./adapters/local.js";
import { buildPreviewManifest } from "./core/pipeline.js";
import { startStageDevServer } from "./server/dev-server.js";

type CommandOptions = {
  command: string;
  port: number;
  projectRoot: string;
  route?: string;
  variant?: string;
  json: boolean;
};

export async function runStageCli(argv = process.argv.slice(2)): Promise<number> {
  const options = parseArgs(argv);
  const projectRoot = resolveProjectRoot(options.projectRoot);

  if (options.command === "doctor") {
    const target = await createLocalPreviewTarget({
      cwd: projectRoot,
      route: options.route,
      variant: options.variant,
    });
    printDoctor(target, options.json);
    return target.diagnostics.some((diagnostic) => diagnostic.level === "error") ? 1 : 0;
  }

  if (options.command === "manifest") {
    const target = await createLocalPreviewTarget({
      cwd: projectRoot,
      route: options.route,
      variant: options.variant,
    });
    const manifest = await buildPreviewManifest(target);
    process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
    return manifest.target.diagnostics.some((diagnostic) => diagnostic.level === "error") ? 1 : 0;
  }

  if (options.command === "preview" || options.command === "dev") {
    const server = await startStageDevServer({
      cwd: process.cwd(),
      projectRoot,
      route: options.route,
      variant: options.variant,
      port: options.port,
    });

    process.stdout.write(`Stage dev server http://127.0.0.1:${options.port}\n`);

    const closeServer = async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    };

    process.on("SIGINT", () => {
      void closeServer().finally(() => process.exit(0));
    });
    process.on("SIGTERM", () => {
      void closeServer().finally(() => process.exit(0));
    });

    return 0;
  }

  printHelp();
  return 1;
}

function parseArgs(argv: string[]): CommandOptions {
  const command = argv[0] ?? "dev";
  let port = Number(process.env.PORT ?? 3847);
  let projectRoot = process.env.STAGE_PROJECT_ROOT ?? process.cwd();
  let route: string | undefined;
  let variant: string | undefined;
  let json = false;

  for (let index = 1; index < argv.length; index += 1) {
    const current = argv[index];

    if (!current) {
      continue;
    }

    if (current === "--json") {
      json = true;
      continue;
    }

    if (current === "--port") {
      const value = argv[index + 1];
      if (value) {
        port = Number(value);
        index += 1;
      }
      continue;
    }

    if (current === "--project-root") {
      const value = argv[index + 1];
      if (value) {
        projectRoot = value;
        index += 1;
      }
      continue;
    }

    if (current === "--screen" || current === "--route") {
      const value = argv[index + 1];
      if (value) {
        route = value;
        index += 1;
      }
    }

    if (current === "--variant") {
      const value = argv[index + 1];
      if (value) {
        variant = value;
        index += 1;
      }
    }
  }

  return {
    command,
    port,
    projectRoot,
    route,
    variant,
    json,
  };
}

function resolveProjectRoot(projectRoot: string): string {
  if (process.env.STAGE_PROJECT_ROOT) {
    return process.env.STAGE_PROJECT_ROOT;
  }

  if (projectRoot !== process.cwd()) {
    return projectRoot;
  }

  if (looksLikeStageRepo(process.cwd())) {
    const fixtureRoot = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "test/fixtures/expo-managed-app",
    );

    if (existsSync(fixtureRoot)) {
      return fixtureRoot;
    }
  }

  return projectRoot;
}

function printDoctor(
  target: Awaited<ReturnType<typeof createLocalPreviewTarget>>,
  json: boolean,
): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(target, null, 2)}\n`);
    return;
  }

  process.stdout.write("Stage doctor\n");
  process.stdout.write(`  app: ${target.appName}\n`);
  process.stdout.write(`  provider: ${target.provider}\n`);
  process.stdout.write(`  projectRoot: ${target.projectRoot}\n`);
  process.stdout.write(`  route: ${target.route || "(unresolved)"}\n`);
  process.stdout.write(`  variant: ${target.variant}\n`);
  process.stdout.write(`  previewMode: ${target.previewMode}\n`);

  if (target.diagnostics.length === 0) {
    process.stdout.write("  diagnostics: none\n");
    return;
  }

  process.stdout.write("  diagnostics:\n");

  for (const diagnostic of target.diagnostics) {
    process.stdout.write(
      `    - [${diagnostic.level}] ${diagnostic.code}: ${diagnostic.message}${
        diagnostic.file ? ` (${diagnostic.file})` : ""
      }\n`,
    );
  }
}

function printHelp(): void {
  process.stdout.write(`Usage: stage <dev|preview|doctor|manifest> [options]

Options:
  --project-root <path>  Override the local project root
  --screen <route>       Preview a specific Expo route
  --variant <name>       Select a route variant from stage.preview.json
  --port <number>        Port for the Stage dev server (default: 3847)
  --json                 JSON output for doctor/manifest
`);
}

function looksLikeStageRepo(cwd: string): boolean {
  try {
    const packageJsonPath = path.join(cwd, "package.json");
    if (!existsSync(packageJsonPath)) {
      return false;
    }
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      name?: string;
    };
    return packageJson.name === "stage";
  } catch {
    return false;
  }
}

if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) {
  void runStageCli().then((code) => {
    if (code !== 0) {
      process.exitCode = code;
    }
  });
}
