#!/usr/bin/env node
// Provider-neutral tool adapter. JSON goes through stdin, credentials through the environment.
const base = process.env.STAGE_URL ?? "http://127.0.0.1:3847";
const token = process.env.STAGE_AGENT_TOKEN;
if (!token) {
  process.stderr.write("Set STAGE_AGENT_TOKEN for the worker.\n");
  process.exit(1);
}
const command = process.argv[2] ?? "capabilities";
try {
  let body;
  if (command === "action" || command === "scene") {
    const chunks = [];
    let size = 0;
    for await (const chunk of process.stdin) {
      size += chunk.length;
      if (size > 12 * 1024 * 1024) throw new Error("Input exceeds 12 MB.");
      chunks.push(chunk);
    }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }
  const paths = {
    capabilities: "/api/ops/capabilities",
    snapshot: "/api/ops",
    devices: "/api/ops/devices",
    action: "/api/ops/actions",
    scene: "/api/scenes",
  };
  if (!Object.hasOwn(paths, command))
    throw new Error("Use capabilities, snapshot, devices, action, or scene.");
  const response = await fetch(new URL(paths[command], base), {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(command === "action" ? 300000 : 30000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `Stage returned HTTP ${response.status}.`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "Stage request failed."}\n`);
  process.exitCode = 1;
}
