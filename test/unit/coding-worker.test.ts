import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  type StageRequest,
  assertOwned,
  runCommand,
  runQuest,
  stageClient,
  validateContract,
} from "../../scripts/stage-coding-worker.mjs";
import { OpsStore } from "../../src/control/ops-store.js";

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "stage-worker-"));
  const repository = path.join(root, "repo");
  await mkdir(repository);
  const git = (args: string[]) => runCommand(["git", ...args], { cwd: repository });
  await git(["init", "-b", "main"]);
  await git(["config", "user.name", "Stage Test"]);
  await git(["config", "user.email", "stage@example.test"]);
  await git(["commit", "--allow-empty", "-m", "base"]);
  const baseSha = await git(["rev-parse", "HEAD"]);
  await git(["branch", "task/test"]);
  const store = new OpsStore(path.join(root, "ops"));
  await store.create({
    title: "Change",
    objective: "Write feature",
    criteria: ["Feature exists"],
    projectId: "test",
    branch: "task/test",
    assignedTo: "worker",
  });
  const quest = await store.claim("worker");
  if (!quest) throw new Error("Missing fixture quest");
  const request = async (body?: {
    action: string;
    questId: string;
    agentId: string;
    leaseToken: string;
    message?: string;
    baseSha?: string;
    sha?: string;
  }) => {
    if (!body) return store.snapshot();
    return store.withLease(body.questId, body.agentId, body.leaseToken, async (q) => {
      if (body.action === "advance")
        await git(["update-ref", "refs/heads/task/test", body.sha ?? "", body.baseSha ?? ""]);
      if (body.action === "block") {
        q.status = "blocked";
        q.lease = undefined;
      }
      if (body.message) store.record(q, body.agentId, body.message);
      return {};
    });
  };
  const contract = {
    repository,
    runRoot: path.join(root, "runs"),
    baseSha,
    ownedPaths: ["feature.txt"],
    executor: [
      process.execPath,
      "-e",
      "require('fs').writeFileSync('feature.txt', 'actual subprocess change')",
    ],
    verify: [
      process.execPath,
      "-e",
      "if (require('fs').readFileSync('feature.txt','utf8') !== 'actual subprocess change') process.exit(1)",
    ],
    timeoutMs: 5000,
  };
  return { root, git, store, quest, request: request as StageRequest, contract };
}

describe("bounded coding worker (fixture executor, no model inference)", () => {
  it("commits isolated code, preserves original checkout, and revises the same durable quest", async () => {
    const f = await fixture();
    const result = await runQuest(f);
    expect(result.status).toBe("code_ready");
    expect(await f.git(["rev-parse", "task/test"])).toBe(result.sha);
    await expect(readFile(path.join(f.contract.repository, "feature.txt"))).rejects.toThrow();
    expect((await f.store.snapshot()).quests[0]?.status).toBe("blocked");
    await f.store.review(f.quest.id, "revise", "Use revised wording");
    const revised = await f.store.claim("worker");
    if (!revised) throw new Error("Missing revision");
    expect(revised?.id).toBe(f.quest?.id);
    expect(revised?.lease?.token).not.toBe(f.quest?.lease?.token);
    const c = {
      ...f.contract,
      baseSha: result.sha,
      executor: [process.execPath, "-e", "require('fs').writeFileSync('feature.txt', 'revision')"],
      verify: [
        process.execPath,
        "-e",
        "if(require('fs').readFileSync('feature.txt','utf8') !== 'revision') process.exit(1)",
      ],
    };
    const next = await runQuest({ ...f, quest: revised, contract: c });
    expect(next.sha).not.toBe(result.sha);
    expect(await f.git(["show", `${next.sha}:feature.txt`])).toBe("revision");
    const reopened = new OpsStore(f.store.root);
    expect(
      (await reopened.snapshot()).quests[0]?.events.some((e) => e.message.includes(result.sha)),
    ).toBe(true);
  });
  it("refuses wrong base, unmet dependencies and out-of-scope edits without advancing branch", async () => {
    for (const mode of ["base", "dependency", "path"]) {
      const f = await fixture();
      const c = { ...f.contract };
      if (mode === "base") c.baseSha = "0".repeat(40);
      if (mode === "dependency") Object.assign(c, { dependencies: ["missing"] });
      if (mode === "path")
        c.executor = [
          process.execPath,
          "-e",
          "require('fs').writeFileSync('private.txt','wrong path')",
        ];
      await expect(runQuest({ ...f, contract: c })).rejects.toThrow();
      expect(await f.git(["rev-parse", "task/test"])).toBe(f.contract.baseSha);
    }
  });
  it("terminates actual subprocess execution on cancellation and fences the stale lease", async () => {
    const f = await fixture();
    f.contract.executor = [process.execPath, "-e", "setInterval(()=>{},100)"];
    const running = runQuest({ ...f, heartbeatMs: 20 });
    setTimeout(() => void f.store.review(f.quest.id, "cancel", "Stop"), 200);
    await expect(running).rejects.toThrow(/cancelled|lease/);
    expect(await f.git(["rev-parse", "task/test"])).toBe(f.contract.baseSha);
    expect((await f.store.snapshot()).quests[0]?.status).toBe("cancelled");
  });
  it("blocks overlapping repository ownership even across independent run roots", async () => {
    const f = await fixture();
    const lockPath = path.join(f.contract.repository, ".git", "stage-coding-worker.lock");
    await writeFile(lockPath, "retained other-worker claim");
    await expect(runQuest(f)).rejects.toThrow("EEXIST");
    expect(await readFile(lockPath, "utf8")).toBe("retained other-worker claim");
    expect(await f.git(["rev-parse", "task/test"])).toBe(f.contract.baseSha);
  });
  it("times out a real child and does not pass Stage credentials to it", async () => {
    await expect(
      runCommand([process.execPath, "-e", "setInterval(()=>{},100)"], { timeoutMs: 50 }),
    ).rejects.toThrow("timed out");
    const output = await runCommand(
      [
        process.execPath,
        "-e",
        "process.stdout.write(String(Boolean(process.env.STAGE_AGENT_TOKEN || process.env.STAGE_OPERATOR_TOKEN)))",
      ],
      { env: { ...process.env, STAGE_AGENT_TOKEN: "private", STAGE_OPERATOR_TOKEN: "private" } },
    );
    expect(output).toBe("false");
  });
  it("rejects unsafe contracts, unowned paths and unencrypted remote hosts", () => {
    expect(() => validateContract({})).toThrow();
    expect(() => assertOwned(["src-other/file"], ["src"])).toThrow();
    expect(() => stageClient("http://example.test", "secret")).toThrow("HTTPS");
  });
});
