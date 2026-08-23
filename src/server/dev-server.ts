import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import {
  type CreateLocalPreviewTargetOptions,
  createLocalPreviewTarget,
} from "../adapters/local.js";
import { loadStageConfig } from "../control/config.js";
import { StageSessionManager } from "../control/session-manager.js";
import { buildPreviewManifest } from "../core/pipeline.js";
import type { StageSessionTarget } from "../types/index.js";
import { branchStudioHtml, devFrameHtml, devShellHtml } from "./dev-html.js";

export type StageDevServerOptions = {
  cwd: string;
  projectRoot: string;
  route?: string;
  variant?: string;
  port: number;
  configPath?: string;
};

export async function startStageDevServer(options: StageDevServerOptions): Promise<Server> {
  const browserAssets = await buildBrowserAssets();
  const loadedConfig = await loadStageConfig(options.cwd, options.configPath);
  const sessionManager = loadedConfig ? new StageSessionManager(loadedConfig.config) : null;

  const server = createServer(async (req, res) => {
    const requestUrl = new URL(req.url ?? "/", `http://127.0.0.1:${options.port}`);

    if (requestUrl.pathname === "/" || requestUrl.pathname === "/index.html") {
      if (sessionManager) {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(branchStudioHtml());
        return;
      }
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

    if (requestUrl.pathname === "/api/stage" && req.method === "GET" && sessionManager) {
      try {
        sendJson(res, 200, await sessionManager.snapshot());
      } catch (error) {
        sendJson(res, 500, { error: errorMessage(error) });
      }
      return;
    }

    if (requestUrl.pathname === "/api/sessions" && req.method === "POST" && sessionManager) {
      try {
        const body = await readJsonBody(req);
        const target: StageSessionTarget = body.target === "web" ? "web" : "dev-client";
        const session = await sessionManager.startSession({
          projectId: requiredString(body.projectId, "projectId"),
          branch: requiredString(body.branch, "branch"),
          target,
        });
        sendJson(res, 201, session);
      } catch (error) {
        sendJson(res, 400, { error: errorMessage(error) });
      }
      return;
    }

    if (requestUrl.pathname === "/api/scenes" && req.method === "POST" && sessionManager) {
      try {
        const body = await readJsonBody(req, 12 * 1024 * 1024);
        const projectId = requiredString(body.projectId, "projectId");
        const branchName = requiredString(body.branch, "branch");
        const snapshot = await sessionManager.snapshot();
        const branch = snapshot.branches.find(
          (candidate) => candidate.projectId === projectId && candidate.name === branchName,
        );
        if (!branch?.sha) {
          throw new Error(`Branch ${branchName} is not available for scene capture.`);
        }
        const requestedSha = optionalString(body.sha);
        if (requestedSha && requestedSha !== branch.sha) {
          throw new Error(
            `Scene SHA ${requestedSha} is stale; ${branchName} is currently ${branch.sha}.`,
          );
        }
        const scene = await sessionManager.scenes.save({
          projectId,
          branch: branchName,
          sha: branch.sha,
          title: requiredString(body.title, "title"),
          route: requiredString(body.route, "route"),
          imageDataUrl: requiredString(body.imageDataUrl, "imageDataUrl"),
          width: optionalPositiveInteger(body.width),
          height: optionalPositiveInteger(body.height),
        });
        sendJson(res, 201, scene);
      } catch (error) {
        sendJson(res, 400, { error: errorMessage(error) });
      }
      return;
    }

    if (
      requestUrl.pathname.startsWith("/api/scenes/") &&
      requestUrl.pathname.endsWith("/image") &&
      req.method === "GET" &&
      sessionManager
    ) {
      const encodedId = requestUrl.pathname.slice("/api/scenes/".length, -"/image".length);
      const image = await sessionManager.scenes.readImage(decodeURIComponent(encodedId));
      if (!image) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("Scene not found");
        return;
      }
      res.writeHead(200, {
        "content-type": image.mimeType,
        "cache-control": "private, max-age=31536000, immutable",
      });
      res.end(image.content);
      return;
    }

    if (
      requestUrl.pathname.startsWith("/api/sessions/") &&
      req.method === "DELETE" &&
      sessionManager
    ) {
      try {
        const sessionId = decodeURIComponent(requestUrl.pathname.slice("/api/sessions/".length));
        sendJson(res, 200, sessionManager.stopSession(sessionId));
      } catch (error) {
        sendJson(res, 404, { error: errorMessage(error) });
      }
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
      res.end(JSON.stringify({ ok: true, mode: sessionManager ? "branch-studio" : "preview" }));
      return;
    }

    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  });

  await new Promise<void>((resolve) => {
    server.listen(options.port, resolve);
  });

  server.on("close", () => sessionManager?.stopAll());

  return server;
}

async function readJsonBody(
  req: IncomingMessage,
  maxBytes = 64 * 1024,
): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let byteLength = 0;
  for await (const chunk of req) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    chunks.push(value);
    byteLength += value.length;
    if (byteLength > maxBytes) {
      throw new Error("Request body is too large.");
    }
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as Record<string, unknown>;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalPositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }
  return value;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body, null, 2));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
