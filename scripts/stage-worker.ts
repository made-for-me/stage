import { runWorker } from "../src/control/process-worker.js";

const args = process.argv.slice(2);
const separator = args.indexOf("--");
const flags = args.slice(0, separator < 0 ? args.length : separator);
const command = separator < 0 ? [] : args.slice(separator + 1);
const controller = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => controller.abort());
try {
  if (flags.some((f) => !["--once", "--simulation"].includes(f)) || !command.length)
    throw new Error(
      "Usage: STAGE_WORKER_CWD=/workspace STAGE_AGENT_ID=worker pnpm worker [--once] [--simulation] -- executable [args...]",
    );
  const outcome = await runWorker({
    url: process.env.STAGE_URL ?? "http://127.0.0.1:3847",
    token: process.env.STAGE_AGENT_TOKEN ?? "",
    agentId: process.env.STAGE_AGENT_ID ?? "",
    cwd: process.env.STAGE_WORKER_CWD ?? process.cwd(),
    command,
    once: flags.includes("--once"),
    simulation: flags.includes("--simulation"),
    signal: controller.signal,
  });
  if (outcome) process.stdout.write(`Stage worker: ${outcome}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "Worker stopped."}\n`);
  process.exitCode = controller.signal.aborted ? 130 : 1;
}
