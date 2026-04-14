import { createServer } from "node:http";
import { buildManifest } from "./build-manifest";

export interface PreviewServerOptions {
  projectRoot: string;
  screen: string;
  port: number;
}

const ALLOWED_ORIGIN = "http://localhost:5201";

function setCorsHeaders(res: import("node:http").ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export async function startServer(options: PreviewServerOptions) {
  const server = createServer(async (req, res) => {
    setCorsHeaders(res);

    if (!req.url) {
      res.statusCode = 400;
      res.end("Missing URL");
      return;
    }

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === "GET" && req.url === "/manifest") {
      try {
        const manifest = await buildManifest({
          projectRoot: options.projectRoot,
          screen: options.screen,
        });

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(manifest, null, 2));
      } catch (error) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(
          JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
      return;
    }

    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found");
  });

  await new Promise<void>((resolve) => {
    server.listen(options.port, () => resolve());
  });

  console.log(`local-preview manifest server: http://localhost:${options.port}/manifest`);
}