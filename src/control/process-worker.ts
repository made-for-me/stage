import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { verifyExecutionTarget, workerEnvironment } from "./execution-target.js";
import type { Quest } from "./ops-store.js";

type Capture = { route: string; title: string; imagePath: string };
type WorkerResult = {
  summary: string;
  sha: string;
  provenance: "worker-reported" | "simulated";
  captures: Capture[];
};
export type WorkerOptions = {
  url: string;
  token: string;
  agentId: string;
  cwd: string;
  command: string[];
  simulation?: boolean;
  heartbeatMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
};

/** A fixed local command supplies work. Quest text is JSON input, never a shell command. */
export async function runWorkerOnce(
  options: WorkerOptions,
): Promise<"idle" | "review" | "blocked"> {
  if (process.platform === "win32")
    throw new Error("The bounded local worker requires POSIX process groups (macOS or Linux).");
  const url = new URL(options.url);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("Use a Stage HTTP(S) origin without credentials or query parameters.");
  if (!options.token || !options.agentId.trim() || !options.command[0])
    throw new Error("Set a worker token, agent ID and fixed executable command.");
  const cwd = await realpath(options.cwd);
  if (!(await stat(cwd)).isDirectory()) throw new Error("Worker workspace must be a directory.");
  const controller = new AbortController();
  const signal = options.signal
    ? AbortSignal.any([controller.signal, options.signal])
    : controller.signal;
  async function request(endpoint: string, body?: unknown) {
    const response = await fetch(new URL(endpoint, url), {
      method: body === undefined ? "GET" : "POST",
      headers: { authorization: `Bearer ${options.token}`, "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
    });
    const result = (await response.json()) as Record<string, unknown>;
    if (!response.ok)
      throw new Error(
        typeof result.error === "string" ? result.error : `Stage returned HTTP ${response.status}.`,
      );
    return result;
  }
  const capabilities = await request("/api/ops/capabilities");
  if (capabilities.version !== 2)
    throw new Error(
      "Upgrade the Stage host to operations contract version 2 before running this worker.",
    );
  if (![1, 2].includes(capabilities.executionPinVersion as number))
    throw new Error(
      "Upgrade the Stage host to support pinned executor checkouts before running this worker.",
    );
  const claimed = await request("/api/ops/actions", {
    action: "claim",
    agentId: options.agentId,
    instanceId: randomUUID(),
  });
  const quest = claimed.quest as Quest | null;
  if (!quest) return "idle";
  if (!quest.lease?.token || !Number.isInteger(quest.revision))
    throw new Error("The host must support the revision-aware operations contract (version 2).");
  const ownership = { questId: quest.id, agentId: options.agentId, leaseToken: quest.lease.token };
  const action = (body: Record<string, unknown>) =>
    request("/api/ops/actions", { ...ownership, ...body });
  let heartbeatFailure: unknown;
  let heartbeat: Promise<void> | undefined;
  const tick = () => {
    if (heartbeat || signal.aborted) return;
    heartbeat = action({ action: "heartbeat" })
      .then(() => {})
      .catch((error: unknown) => {
        heartbeatFailure = error;
        controller.abort(new Error("Worker lost its Stage lease; local execution stopped."));
      })
      .finally(() => {
        heartbeat = undefined;
      });
  };
  const interval = setInterval(tick, options.heartbeatMs ?? 30_000);
  try {
    if (quest.executionTarget?.worktree && capabilities.executionPinVersion !== 2)
      throw new Error("Managed execution sessions require execution pin version 2.");
    const verifiedTarget = await verifyExecutionTarget(cwd, quest, signal);
    await action({
      action: "progress",
      message: options.simulation
        ? `Starting simulated local driver for revision ${quest.revision}.`
        : `Starting configured local worker for revision ${quest.revision}.`,
    });
    if (quest.executionTarget?.worktree) await action({ action: "execution-preflight" });
    const { lease: _lease, ...brief } = quest;
    const result = await execute(
      options.command,
      cwd,
      {
        version: 1,
        quest: brief,
        verifiedTarget,
        simulation: Boolean(options.simulation),
        instruction:
          "Return one JSON result with summary, actual captured commit sha, provenance, and captures [{route,title,imagePath}]. Preserve quest reviews and prior submissions as context. Never fabricate real captures.",
      },
      signal,
      options.timeoutMs ?? 30 * 60_000,
    );
    validateResult(result);
    if (!options.simulation && result.provenance === "simulated")
      throw new Error("A simulated driver requires --simulation; no evidence was submitted.");
    if (heartbeat) await heartbeat;
    signal.throwIfAborted();
    const capture = await action({ action: "capture" });
    if (result.sha !== (capture.capture as { sha: string }).sha)
      throw new Error(
        "Worker captures do not match the current branch commit. Capture the current build.",
      );
    const sceneIds: string[] = [];
    for (const item of result.captures) {
      // Recheck ownership before each write; cancellation stops subsequent uploads and submission.
      await action({ action: "heartbeat" });
      const file = await realpath(path.resolve(cwd, item.imagePath));
      const relative = path.relative(cwd, file);
      if (
        !relative ||
        relative.startsWith(`..${path.sep}`) ||
        relative === ".." ||
        path.isAbsolute(relative)
      )
        throw new Error("Capture files must stay inside the configured worker workspace.");
      const info = await stat(file);
      if (!info.isFile() || info.size > 8 * 1024 * 1024)
        throw new Error("Each capture must be a file smaller than 8 MB.");
      const mime = (
        {
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".webp": "image/webp",
        } as Record<string, string>
      )[path.extname(file).toLowerCase()];
      if (!mime) throw new Error("Use PNG, JPEG or WebP capture files.");
      const scene = await request("/api/ops/scenes", {
        ...ownership,
        revision: quest.revision,
        sha: result.sha,
        route: item.route,
        title: item.title,
        imageDataUrl: `data:${mime};base64,${(await readFile(file)).toString("base64")}`,
      });
      sceneIds.push(scene.id as string);
    }
    await action({
      action: "submit",
      revision: quest.revision,
      provenance: options.simulation ? "simulated" : result.provenance,
      summary: result.summary,
      sceneIds,
    });
    return "review";
  } catch (error) {
    if (signal.aborted || heartbeatFailure) throw heartbeatFailure ?? error;
    // A failure is an actionable blocker, never a successful result. A fenced worker cannot write it.
    await action({
      action: "block",
      message: error instanceof Error ? error.message.slice(0, 4000) : "Local worker failed.",
    });
    return "blocked";
  } finally {
    clearInterval(interval);
    if (heartbeat) await heartbeat;
    controller.abort();
  }
}

function validateResult(value: unknown): asserts value is WorkerResult {
  if (!value || typeof value !== "object")
    throw new Error("Worker output must be one JSON result.");
  const r = value as WorkerResult;
  if (
    typeof r.summary !== "string" ||
    !r.summary.trim() ||
    r.summary.length > 4000 ||
    typeof r.sha !== "string" ||
    !/^[a-f0-9]{40,64}$/.test(r.sha) ||
    !["worker-reported", "simulated"].includes(r.provenance) ||
    !Array.isArray(r.captures) ||
    !r.captures.length ||
    r.captures.length > 20 ||
    r.captures.some(
      (c) => !c || [c.route, c.title, c.imagePath].some((s) => typeof s !== "string" || !s.trim()),
    )
  )
    throw new Error(
      "Worker result needs summary, commit sha, explicit provenance and 1–20 captures.",
    );
}

function execute(
  command: string[],
  cwd: string,
  brief: unknown,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<unknown> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const env = workerEnvironment();
    const grouped = process.platform !== "win32";
    const child = spawn(command[0], command.slice(1), {
      cwd,
      env,
      shell: false,
      detached: grouped,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let output = "";
    let error: Error | undefined;
    let killer: ReturnType<typeof setTimeout> | undefined;
    const kill = (kind: NodeJS.Signals) => {
      try {
        if (grouped && child.pid) process.kill(-child.pid, kind);
        else child.kill(kind);
      } catch {
        /* The process group already exited. */
      }
    };
    const stop = (reason: Error) => {
      error ??= reason;
      kill("SIGTERM");
      killer ??= setTimeout(() => kill("SIGKILL"), 2000);
    };
    const abort = () =>
      stop(new Error("Local worker stopped because its run was cancelled or disconnected."));
    signal.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(
      () => stop(new Error("Local worker timed out. Inspect the command before retrying.")),
      timeoutMs,
    );
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (text: string) => {
      output += text;
      if (Buffer.byteLength(output) > 128_000)
        stop(new Error("Worker JSON output exceeds 128 KB."));
    });
    child.stderr.resume(); // Do not forward potentially secret tool logs into the operations journal.
    child.stdin.on("error", () => {});
    child.on("error", () => {
      error = new Error("Could not start the configured worker executable.");
    });
    // No background service may outlive this bounded command, even after successful output.
    child.on("exit", () => kill("SIGKILL"));
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (killer) clearTimeout(killer);
      signal.removeEventListener("abort", abort);
      if (error) {
        kill("SIGKILL");
        return reject(error);
      }
      if (code !== 0)
        return reject(
          new Error(`Worker command exited with code ${code}. Inspect its local logs.`),
        );
      try {
        resolve(JSON.parse(output));
      } catch {
        reject(new Error("Worker command did not return one valid JSON result."));
      }
    });
    child.stdin.end(JSON.stringify(brief));
  });
}

export async function runWorker(options: WorkerOptions & { once?: boolean }) {
  do {
    const outcome = await runWorkerOnce(options);
    if (options.once) return outcome;
    await delay(10_000, undefined, { signal: options.signal });
  } while (!options.signal?.aborted);
}
