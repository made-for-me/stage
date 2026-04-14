import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { type Server, createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import {
  type CreateLocalPreviewTargetOptions,
  createLocalPreviewTarget,
} from "../adapters/local.js";
import { buildPreviewManifest } from "../core/pipeline.js";
import { devFrameHtml, devShellHtml } from "./dev-html.js";

export type StageDevServerOptions = {
  cwd: string;
  projectRoot: string;
  route?: string;
  variant?: string;
  port: number;
};

export async function startStageDevServer(options: StageDevServerOptions): Promise<Server> {
  const browserAssets = await buildBrowserAssets();

  const server = createServer(async (req, res) => {
    const requestUrl = new URL(req.url ?? "/", `http://127.0.0.1:${options.port}`);

    if (requestUrl.pathname === "/" || requestUrl.pathname === "/index.html") {
      const target = await createTargetFromRequest(options, requestUrl);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(
        devShellHtml({
          frameSrc: `/preview/frame${requestUrl.search}`,
          projectRoot: target.projectRoot,
          targetLabel: target.label,
        }),
      );
      return;
    }

    if (requestUrl.pathname === "/preview/frame") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(devFrameHtml());
      return;
    }

    if (requestUrl.pathname === "/preview/manifest") {
      const target = await createTargetFromRequest(options, requestUrl);
      const manifest = await buildPreviewManifest(target);
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(manifest, null, 2));
      return;
    }

    if (requestUrl.pathname === "/preview/screen-map") {
      const target = await createTargetFromRequest(options, requestUrl);
      const manifest = await buildPreviewManifest(target);
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(manifest.screenMap, null, 2));
      return;
    }

    if (requestUrl.pathname === "/preview/assets/app.js") {
      res.writeHead(200, { "content-type": "application/javascript; charset=utf-8" });
      res.end(browserAssets.app);
      return;
    }

    if (requestUrl.pathname === "/preview/assets/worker.js") {
      res.writeHead(200, { "content-type": "application/javascript; charset=utf-8" });
      res.end(browserAssets.worker);
      return;
    }

    if (requestUrl.pathname.startsWith("/preview/project/")) {
      const filePath = resolvePreviewProjectFile(options.projectRoot, requestUrl.pathname);

      if (!filePath) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      try {
        const content = await readFile(filePath);
        res.writeHead(200, {
          "content-type": contentTypeFromPath(filePath),
        });
        res.end(content);
      } catch {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("Not found");
      }
      return;
    }

    if (requestUrl.pathname === "/health") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, mode: "preview" }));
      return;
    }

    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  });

  await new Promise<void>((resolve) => {
    server.listen(options.port, resolve);
  });

  return server;
}

async function createTargetFromRequest(options: StageDevServerOptions, requestUrl: URL) {
  const route = requestUrl.searchParams.get("screen") ?? options.route;
  const variant = requestUrl.searchParams.get("variant") ?? options.variant;
  const projectRoot = requestUrl.searchParams.get("projectRoot") ?? options.projectRoot;

  return createLocalPreviewTarget({
    cwd: projectRoot,
    route: route ?? undefined,
    variant: variant ?? undefined,
  });
}

async function buildBrowserAssets(): Promise<{ app: string; worker: string }> {
  const [app, worker] = await Promise.all([buildBrowserAsset("app"), buildBrowserAsset("worker")]);

  return { app, worker };
}

async function buildBrowserAsset(kind: "app" | "worker"): Promise<string> {
  const entryPoint = resolveBrowserEntry(kind);
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    sourcemap: "inline",
    write: false,
    jsx: "automatic",
    define: {
      "process.env.NODE_ENV": JSON.stringify("development"),
    },
  });

  const output = result.outputFiles[0];

  if (!output) {
    throw new Error(`Failed to build Stage browser ${kind} asset.`);
  }

  return output.text;
}

function resolveBrowserEntry(kind: "app" | "worker"): string {
  const filename = kind === "app" ? "main" : "worker";
  const root = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(root, "..", "preview", "browser", `${filename}.js`),
    path.join(root, "..", "preview", "browser", `${filename}.ts`),
  ];

  const resolved = candidates.find((candidate) => existsSync(candidate));

  if (!resolved) {
    throw new Error(`Could not resolve Stage browser asset entry for ${kind}.`);
  }

  return resolved;
}

function resolvePreviewProjectFile(projectRoot: string, pathname: string): string | null {
  const relative = pathname.replace("/preview/project/", "");
  const absolute = path.resolve(projectRoot, relative);
  const normalizedRoot = path.resolve(projectRoot);

  if (!absolute.startsWith(normalizedRoot)) {
    return null;
  }

  return absolute;
}

function contentTypeFromPath(filePath: string): string {
  if (filePath.endsWith(".png")) {
    return "image/png";
  }
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (filePath.endsWith(".svg")) {
    return "image/svg+xml";
  }
  if (filePath.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }
  return "application/octet-stream";
}
