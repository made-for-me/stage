#!/usr/bin/env node
/** Trusted local executor. Contracts are operator-owned, never taken from quest text. */
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function validateContract(c) {
  if (!c || !path.isAbsolute(c.repository ?? "") || !path.isAbsolute(c.runRoot ?? ""))
    throw new Error("repository and runRoot must be absolute paths");
  if (!/^[0-9a-f]{40}$/.test(c.baseSha ?? "")) throw new Error("Pin a full baseSha");
  if (
    !Array.isArray(c.ownedPaths) ||
    !c.ownedPaths.length ||
    c.ownedPaths.some(
      (p) =>
        typeof p !== "string" ||
        !p ||
        path.isAbsolute(p) ||
        p.split("/").some((s) => !s || s === ".." || s === ".git"),
    )
  )
    throw new Error("ownedPaths must contain safe relative files or directories");
  for (const key of ["executor", "verify"]) {
    if (!Array.isArray(c[key]) || !c[key].length || c[key].some((s) => typeof s !== "string" || !s))
      throw new Error(`${key} must be an argument array`);
  }
  if (
    c.evidence &&
    (!Array.isArray(c.evidence) ||
      !c.evidence.length ||
      c.evidence.some((s) => typeof s !== "string" || !s))
  )
    throw new Error("evidence must be an argument array");
  if (!Number.isInteger(c.timeoutMs) || c.timeoutMs < 100 || c.timeoutMs > 30 * 60_000)
    throw new Error("timeoutMs must be between 100 and 1800000");
  if (
    c.dependencies &&
    (!Array.isArray(c.dependencies) || c.dependencies.some((s) => typeof s !== "string"))
  )
    throw new Error("dependencies must be quest IDs");
  const relative = path.relative(c.repository, c.runRoot);
  if (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))
    throw new Error("runRoot must be outside repository");
  return c;
}
export function assertOwned(files, owned) {
  const outside = files.filter(
    (file) => !owned.some((p) => file === p || file.startsWith(`${p}/`)),
  );
  if (outside.length) throw new Error(`Changes outside ownedPaths: ${outside.join(", ")}`);
}

export async function runCommand(
  args,
  { cwd, signal, timeoutMs = 30_000, input, log, env = process.env } = {},
) {
  signal?.throwIfAborted();
  const childEnv = Object.fromEntries(
    Object.entries(env).filter(
      ([key]) => !["STAGE_AGENT_TOKEN", "STAGE_OPERATOR_TOKEN"].includes(key),
    ),
  );
  const handle = log ? await open(log, "a", 0o600) : null;
  return new Promise((resolve, reject) => {
    const child = spawn(args[0], args.slice(1), {
      cwd,
      env: childEnv,
      detached: process.platform !== "win32",
      stdio: ["pipe", "pipe", "pipe"],
    });
    let output = "";
    let outputBytes = 0;
    let logWrites = Promise.resolve();
    let failure;
    let killTimer;
    const stop = (reason) => {
      if (failure) return;
      failure = reason;
      const kill = (sig) => {
        try {
          process.platform === "win32" ? child.kill(sig) : process.kill(-child.pid, sig);
        } catch {}
      };
      kill("SIGTERM");
      killTimer = setTimeout(() => kill("SIGKILL"), 1000);
    };
    const aborted = () => stop(new Error("Execution cancelled or lease lost"));
    signal?.addEventListener("abort", aborted, { once: true });
    if (signal?.aborted) aborted();
    const timer = setTimeout(() => stop(new Error("Execution timed out")), timeoutMs);
    for (const stream of [child.stdout, child.stderr])
      stream.on("data", (chunk) => {
        outputBytes += chunk.length;
        if (outputBytes > 8 * 1024 * 1024) {
          stop(new Error("Executor output exceeds 8 MiB"));
          return;
        }
        if (handle)
          logWrites = logWrites
            .then(() => handle.write(chunk))
            .catch(() => stop(new Error("Could not persist executor log")));
        output += chunk.toString();
      });
    child.stdin.on("error", () => {});
    child.stdin.end(input);
    const cleanup = async () => {
      clearTimeout(timer);
      clearTimeout(killTimer);
      signal?.removeEventListener("abort", aborted);
      await logWrites;
      await handle?.close();
    };
    child.once("error", async (error) => {
      await cleanup();
      reject(error);
    });
    child.once("close", async (code) => {
      await cleanup();
      if (failure) reject(failure);
      else if (code !== 0)
        reject(new Error(`Command ${args[0]} exited ${code}; inspect retained logs`));
      else resolve(output.trim());
    });
  });
}

export function stageClient(base, token) {
  const origin = new URL(base);
  if (
    origin.protocol !== "https:" &&
    !(origin.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname))
  )
    throw new Error("Use HTTPS for a remote Stage host");
  return async (body, endpoint = body ? "/api/ops/actions" : "/api/ops") => {
    const response = await fetch(new URL(endpoint, origin), {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(10_000),
    });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error ?? `Stage HTTP ${response.status}`);
    return value;
  };
}

/** One attempt only: retries require operator review/requeue, preserving the same quest. */
export async function runQuest({ quest, contract, request, signal, heartbeatMs = 20_000 }) {
  const c = validateContract(contract);
  if (!quest.lease?.token) throw new Error("Claim a lease before execution");
  if (
    quest.branch === "main" ||
    quest.branch === "master" ||
    !quest.branch ||
    quest.branch.startsWith("-")
  )
    throw new Error("Use a dedicated task branch");
  const abort = new AbortController();
  const externalAbort = () => abort.abort();
  signal?.addEventListener("abort", externalAbort, { once: true });
  if (signal?.aborted) abort.abort();
  const action = (name, data = {}) =>
    request({
      action: name,
      questId: quest.id,
      agentId: quest.lease.agentId,
      leaseToken: quest.lease.token,
      ...data,
    });
  let beating = false;
  let leaseError;
  const beat = async () => {
    if (beating) return;
    beating = true;
    try {
      await action("heartbeat");
    } catch (error) {
      leaseError = error;
      abort.abort();
    } finally {
      beating = false;
    }
  };
  const timer = setInterval(beat, heartbeatMs);
  const runId = randomUUID();
  const root = path.join(c.runRoot, runId);
  const worktree = path.join(root, "worktree");
  const receipt = {
    version: 1,
    questId: quest.id,
    runId,
    baseSha: c.baseSha,
    branch: quest.branch,
    worktree,
    status: "preparing",
    startedAt: new Date().toISOString(),
  };
  const save = () =>
    writeFile(path.join(root, "receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`, {
      mode: 0o600,
    });
  const git = (args, cwd = c.repository) =>
    runCommand(["git", ...args], { cwd, signal: abort.signal });
  let lock;
  let published = false;
  try {
    await mkdir(root, { recursive: true, mode: 0o700 });
    await save();
    // Never silently reclaim a process lock after a crash: the operator verifies old processes first.
    const lockPath = path.join(
      await git(["rev-parse", "--path-format=absolute", "--git-common-dir"]),
      "stage-coding-worker.lock",
    );
    lock = await open(lockPath, "wx", 0o600);
    await lock.writeFile(JSON.stringify({ pid: process.pid, runId, questId: quest.id }));
    receipt.lockPath = lockPath;
    await action("heartbeat");
    const snapshot = await request();
    for (const id of c.dependencies ?? []) {
      if (!snapshot.quests.some((q) => q.id === id && q.status === "done"))
        throw new Error(`Dependency ${id} is not accepted`);
    }
    await git(["check-ref-format", "--branch", quest.branch]);
    const worktrees = await git(["worktree", "list", "--porcelain"]);
    if (worktrees.split("\n").includes(`branch refs/heads/${quest.branch}`))
      throw new Error(
        "Task branch is checked out; select an unoccupied branch to preserve dirty work",
      );
    const actual = await git(["rev-parse", `refs/heads/${quest.branch}`]);
    if (actual !== c.baseSha)
      throw new Error("Branch drift: contract baseSha differs from current branch");
    await git(["worktree", "add", "--detach", worktree, c.baseSha]);
    receipt.status = "executing";
    await save();
    await action("progress", {
      message: `Coding run ${runId} at ${c.baseSha}; isolated worktree. Logs remain on the host.`,
    });
    const prompt = [
      "Complete this bounded Stage quest. Read repository instructions. Do not spawn additional agents, commit, publish, or change branch.",
      `Owned paths only: ${JSON.stringify(c.ownedPaths)}. Preserve all unrelated files.`,
      `Objective: ${quest.objective}`,
      `Acceptance: ${JSON.stringify(quest.criteria)}`,
      `Review history: ${JSON.stringify(quest.events.filter((e) => e.actor === "operator").map((e) => e.message))}`,
    ].join("\n");
    await runCommand(c.executor, {
      cwd: worktree,
      signal: abort.signal,
      timeoutMs: c.timeoutMs,
      input: prompt,
      log: path.join(root, "executor.log"),
    });
    if ((await git(["rev-parse", "HEAD"], worktree)) !== c.baseSha)
      throw new Error("Executor changed HEAD; refusing promotion");
    const changed = (await git(["diff", "--name-only", "-z", "HEAD"], worktree))
      .split("\0")
      .filter(Boolean);
    const untracked = (await git(["ls-files", "--others", "--exclude-standard", "-z"], worktree))
      .split("\0")
      .filter(Boolean);
    assertOwned([...changed, ...untracked], c.ownedPaths);
    if (!changed.length && !untracked.length) throw new Error("Executor produced no code change");
    receipt.status = "verifying";
    await save();
    await runCommand(c.verify, {
      cwd: worktree,
      signal: abort.signal,
      timeoutMs: c.timeoutMs,
      log: path.join(root, "verify.log"),
    });
    // Verification commands can also write files. Check the final tree again.
    assertOwned(
      (await git(["diff", "--name-only", "-z", "HEAD"], worktree)).split("\0").filter(Boolean),
      c.ownedPaths,
    );
    assertOwned(
      (await git(["ls-files", "--others", "--exclude-standard", "-z"], worktree))
        .split("\0")
        .filter(Boolean),
      c.ownedPaths,
    );
    await git(["add", "--", ...c.ownedPaths], worktree);
    await git(["commit", "-m", `feat: Stage quest ${quest.id} run ${runId}`], worktree);
    receipt.sha = await git(["rev-parse", "HEAD"], worktree);
    await action("heartbeat");
    abort.signal.throwIfAborted();
    await action("advance", { baseSha: c.baseSha, sha: receipt.sha });
    published = true;
    receipt.status = "code_ready";
    await save();
    await action("progress", {
      message: `Verified code commit ${receipt.sha} from ${c.baseSha}. Run ${runId}; awaiting current preview evidence.`,
    });
    if (!c.evidence) {
      await action("block", {
        message: `Code ${receipt.sha} verified. Capture current preview and configure evidence command before review. Run ${runId}.`,
      });
      return receipt;
    }
    const output = await runCommand(c.evidence, {
      cwd: worktree,
      signal: abort.signal,
      timeoutMs: c.timeoutMs,
      log: path.join(root, "evidence.log"),
      input: JSON.stringify({
        questId: quest.id,
        runId,
        sha: receipt.sha,
        branch: quest.branch,
        worktree,
      }),
    });
    if (await git(["status", "--porcelain"], worktree))
      throw new Error("Evidence command changed the captured working tree");
    const evidence = JSON.parse(output);
    if (
      evidence.sha !== receipt.sha ||
      !Array.isArray(evidence.scenes) ||
      !evidence.scenes.length ||
      typeof evidence.summary !== "string"
    )
      throw new Error("Evidence must return exact sha, captured scenes and summary");
    if ((await git(["rev-parse", `refs/heads/${quest.branch}`])) !== receipt.sha)
      throw new Error("Branch changed during preview capture");
    const sceneIds = [];
    for (const scene of evidence.scenes) {
      const stored = await request(
        { ...scene, projectId: quest.projectId, branch: quest.branch, sha: receipt.sha },
        "/api/scenes",
      );
      sceneIds.push(stored.id);
    }
    await action("submit", {
      sceneIds,
      summary: `Run ${runId}, ${receipt.sha}. ${evidence.summary}`,
    });
    receipt.status = "review";
    await save();
    return receipt;
  } catch (error) {
    receipt.status = "blocked";
    receipt.error = (leaseError ?? error).message;
    if (receipt.sha) {
      try {
        published =
          (await runCommand(["git", "rev-parse", `refs/heads/${quest.branch}`], {
            cwd: c.repository,
          })) === receipt.sha;
      } catch {
        /* Preserve the last confirmed advancement state if inspection fails. */
      }
    }
    receipt.codePromoted = published;
    await save().catch(() => {});
    if (!leaseError)
      await action("block", {
        message: `Run ${runId} blocked: ${receipt.error}. Partial work and logs retained.`,
      }).catch(() => {});
    throw error;
  } finally {
    clearInterval(timer);
    signal?.removeEventListener("abort", externalAbort);
    await lock?.close();
    if (lock && receipt.lockPath) {
      const { unlink } = await import("node:fs/promises");
      await unlink(receipt.lockPath);
    }
  }
}

async function main() {
  const token = process.env.STAGE_AGENT_TOKEN;
  if (!token || !process.env.STAGE_WORKER_ID || !process.argv[2])
    throw new Error("Set STAGE_AGENT_TOKEN, STAGE_WORKER_ID and provide a contracts JSON file");
  const contracts = JSON.parse(await readFile(process.argv[2], "utf8"));
  const request = stageClient(process.env.STAGE_URL ?? "http://127.0.0.1:3847", token);
  const { quest } = await request({ action: "claim", agentId: process.env.STAGE_WORKER_ID });
  if (!quest) {
    process.stdout.write("No assigned quest.\n");
    return;
  }
  if (!contracts[quest.id]) {
    await request({
      action: "block",
      questId: quest.id,
      agentId: quest.lease.agentId,
      leaseToken: quest.lease.token,
      message: "Missing operator-owned execution contract for this quest.",
    });
    throw new Error("Missing quest contract");
  }
  const abort = new AbortController();
  process.once("SIGINT", () => abort.abort());
  process.once("SIGTERM", () => abort.abort());
  const result = await runQuest({
    quest,
    contract: contracts[quest.id],
    request,
    signal: abort.signal,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
