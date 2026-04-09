import { createServer } from "node:http";
import { devFrameHtml, devShellHtml } from "../src/server/dev-html.js";

const PORT = Number(process.env.PORT ?? 3847);

const server = createServer((req, res) => {
  const url = req.url ?? "/";

  if (url === "/" || url === "/index.html") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(devShellHtml());
    return;
  }

  if (url === "/preview/frame" || url.startsWith("/preview/frame?")) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(devFrameHtml());
    return;
  }

  if (url === "/health") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`Stage dev server http://127.0.0.1:${PORT}`);
});
