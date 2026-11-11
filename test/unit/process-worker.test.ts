import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StageCaptureStore } from "../../src/control/capture-store.js";
import { LEASE_MS, OpsStore, type Quest } from "../../src/control/ops-store.js";
import { runWorkerOnce } from "../../src/control/process-worker.js";
import { StageSceneStore } from "../../src/control/scene-store.js";
import type { StageSessionManager } from "../../src/control/session-manager.js";
import { createOpsApi, opsCapabilities } from "../../src/server/ops-api.js";

const sha = "a".repeat(40);
const execFileAsync = promisify(execFile);
async function gitAt(root: string, args: string[]) {
  const result = await execFileAsync(
    "git",
    ["-c", "core.hooksPath=/dev/null", "-c", "commit.gpgsign=false", "-C", root, ...args],
    {
      env: Object.fromEntries(
        Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
      ),
    },
  );
  return result.stdout.trim();
}
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const input = {
  title: "Improve replay",
  objective: "Keep the selected moment",
  criteria: ["Moment retained"],
  projectId: "clubhall",
  branch: "main",
  assignedTo: "fixture-worker",
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function setup(driver?: string) {
  const root = await mkdtemp(path.join(os.tmpdir(), "stage-worker-"));
  await writeFile(path.join(root, "app.txt"), "initial source\n");
  await writeFile(
    path.join(root, ".gitignore"),
    "driver.mjs\ncapture.png\nbrief-*.json\npid\nexecutions\nlate-effect\nops/\nscenes/\ncaptures/\n",
  );
  await gitAt(root, ["init", "-b", "main"]);
  await gitAt(root, ["config", "user.name", "Stage fixture"]);
  await gitAt(root, ["config", "user.email", "stage@example.test"]);
  await gitAt(root, ["add", "app.txt", ".gitignore"]);
  await gitAt(root, ["commit", "-m", "Fixture base"]);
  const baseSha = await gitAt(root, ["rev-parse", "HEAD"]);
  let now = Date.now();
  let store = new OpsStore(path.join(root, "ops"), () => now);
  const scenes = new StageSceneStore(path.join(root, "scenes"));
  const captures = new StageCaptureStore(path.join(root, "captures"));
  const branch = { projectId: "clubhall", name: "main", sha: baseSha, availability: "available" };
  const sessions = {
    captures,
    scenes,
    snapshot: async () => {
      branch.sha = await gitAt(root, ["rev-parse", "refs/heads/main"]);
      return {
        branches: [branch],
        scenes: await scenes.list(),
        sessions: [],
        projects: [
          {
            id: "clubhall",
            name: "ClubHall",
            localRoot: root,
            preview: { scenes: [{ title: "Replay", route: "/replay" }] },
          },
        ],
      };
    },
  } as unknown as StageSessionManager;
  let api = createOpsApi(store, sessions);
  const actions: string[] = [];
  const send = async (
    body: Record<string, unknown>,
    principal: "agent" | "operator" = "operator",
    endpoint = "/api/ops/actions",
  ) => {
    const req = Readable.from([Buffer.from(JSON.stringify(body))]) as IncomingMessage;
    req.method = "POST";
    let status = 0;
    let text = "";
    const res = {
      writeHead: (code: number) => {
        status = code;
      },
      end: (value: string) => {
        text = value;
      },
    } as unknown as ServerResponse;
    await api(req, res, endpoint, principal);
    return new Response(text, { status, headers: { "content-type": "application/json" } });
  };
  vi.stubGlobal("fetch", async (url: URL, init: RequestInit) => {
    init.signal?.throwIfAborted();
    expect((init.headers as Record<string, string>).authorization).toBe(
      "Bearer private-test-token",
    );
    if (url.pathname === "/api/ops/capabilities") return Response.json(opsCapabilities);
    const body = JSON.parse(init.body as string);
    actions.push(body.action);
    return send(body, "agent", url.pathname);
  });
  await writeFile(path.join(root, "capture.png"), Buffer.from(png, "base64"));
  await writeFile(
    path.join(root, "driver.mjs"),
    driver?.replaceAll(sha, baseSha) ??
      `
    import { writeFile } from 'node:fs/promises';
    let raw=''; for await (const chunk of process.stdin) raw+=chunk;
    const brief=JSON.parse(raw);
    if (brief.quest.lease || process.env.STAGE_AGENT_TOKEN || process.env.STAGE_OPERATOR_TOKEN) process.exit(9);
    await writeFile('brief-'+brief.quest.revision+'.json',raw);
    process.stdout.write(JSON.stringify({summary:'Fixture output, revision '+brief.quest.revision,
      sha:brief.verifiedTarget.sha,provenance:brief.simulation?'simulated':'worker-reported',
      captures:[{title:'Replay',route:'/replay',imagePath:'capture.png'}]}));
  `,
  );
  vi.stubEnv("STAGE_AGENT_TOKEN", "private-test-token");
  vi.stubEnv("STAGE_OPERATOR_TOKEN", "private-operator-token");
  const options = {
    url: "http://127.0.0.1:4314",
    token: "private-test-token",
    agentId: input.assignedTo,
    cwd: root,
    command: [process.execPath, "driver.mjs"],
    heartbeatMs: 20,
  };
  const created = await send({ action: "create", ...input });
  expect(created.status).toBe(201);
  const quest = (await created.json()) as Quest;
  return {
    root,
    sha: baseSha,
    store,
    quest,
    scenes,
    branch,
    actions,
    send,
    options,
    advance: (milliseconds: number) => {
      now += milliseconds;
    },
    restart: () => {
      store = new OpsStore(store.root, () => now);
      api = createOpsApi(store, sessions);
    },
  };
}

describe("configured local process worker", () => {
  it("rejects another checkout even when its branch and commit exactly match", async () => {
    const h = await setup();
    const other = `${h.root}-other`;
    await gitAt(h.root, ["clone", "--local", "--no-hardlinks", h.root, other]);
    expect(await gitAt(other, ["rev-parse", "HEAD"])).toBe(h.sha);
    expect(
      await runWorkerOnce({
        ...h.options,
        cwd: other,
        command: [process.execPath, path.join(h.root, "driver.mjs")],
      }),
    ).toBe("blocked");
    expect((await h.store.snapshot()).quests[0].events.at(-1)?.message).toContain(
      "Wrong Git checkout",
    );
    await expect(readFile(path.join(other, "brief-1.json"))).rejects.toThrow();
    await expect(readFile(path.join(h.root, "brief-1.json"))).rejects.toThrow();
    expect(await readFile(path.join(other, "app.txt"), "utf8")).toBe("initial source\n");
  });

  it("rejects the wrong named branch without checking out or resetting anything", async () => {
    const h = await setup();
    await gitAt(h.root, ["checkout", "-b", "other"]);
    expect(await runWorkerOnce(h.options)).toBe("blocked");
    expect((await h.store.snapshot()).quests[0].events.at(-1)?.message).toContain(
      "Wrong Git branch",
    );
    expect(await gitAt(h.root, ["symbolic-ref", "--short", "HEAD"])).toBe("other");
    expect(await gitAt(h.root, ["rev-parse", "HEAD"])).toBe(h.sha);
    await expect(readFile(path.join(h.root, "brief-1.json"))).rejects.toThrow();
  });

  it("preserves staged, unstaged and untracked user edits while refusing to launch", async () => {
    const h = await setup();
    await writeFile(path.join(h.root, "app.txt"), "staged user edit\n");
    await gitAt(h.root, ["add", "app.txt"]);
    await writeFile(path.join(h.root, "app.txt"), "unstaged user edit\n");
    await writeFile(path.join(h.root, "notes.txt"), "untracked user note\n");
    const before = await gitAt(h.root, ["status", "--porcelain=v1", "--untracked-files=all"]);
    expect(await runWorkerOnce(h.options)).toBe("blocked");
    expect((await h.store.snapshot()).quests[0].events.at(-1)?.message).toContain(
      "staged, unstaged or untracked",
    );
    expect(await gitAt(h.root, ["status", "--porcelain=v1", "--untracked-files=all"])).toBe(before);
    expect(await gitAt(h.root, ["show", ":app.txt"])).toBe("staged user edit");
    expect(await readFile(path.join(h.root, "app.txt"), "utf8")).toBe("unstaged user edit\n");
    expect(await readFile(path.join(h.root, "notes.txt"), "utf8")).toBe("untracked user note\n");
    expect(await gitAt(h.root, ["rev-parse", "HEAD"])).toBe(h.sha);
    await expect(readFile(path.join(h.root, "brief-1.json"))).rejects.toThrow();
  });

  it("persists a new revision base across restart and blocks a later unexpected SHA change", async () => {
    const h = await setup();
    expect(await runWorkerOnce(h.options)).toBe("review");
    const first = (await h.store.snapshot()).quests[0];
    await writeFile(path.join(h.root, "app.txt"), "operator's new baseline\n");
    await gitAt(h.root, ["add", "app.txt"]);
    await gitAt(h.root, ["commit", "-m", "Explicit fixture baseline update"]);
    const nextSha = await gitAt(h.root, ["rev-parse", "HEAD"]);
    expect(
      (
        await h.send({
          action: "review",
          questId: first.id,
          revision: 1,
          evidenceId: first.evidence?.id,
          decision: "revise",
          note: "Continue from the new baseline",
        })
      ).status,
    ).toBe(200);
    h.restart();
    expect(await runWorkerOnce(h.options)).toBe("review");
    const second = (await h.store.snapshot()).quests[0];
    const brief = JSON.parse(await readFile(path.join(h.root, "brief-2.json"), "utf8"));
    expect(brief.verifiedTarget.sha).toBe(nextSha);
    expect(second.submissions[0].executionTarget?.sha).toBe(h.sha);
    expect(second.submissions[1].executionTarget?.sha).toBe(nextSha);
    await h.send({
      action: "review",
      questId: second.id,
      revision: 2,
      evidenceId: second.evidence?.id,
      decision: "revise",
      note: "One more bounded change",
    });
    await gitAt(h.root, ["commit", "--allow-empty", "-m", "Unexpected fixture advance"]);
    const unexpectedSha = await gitAt(h.root, ["rev-parse", "HEAD"]);
    h.restart();
    expect(await runWorkerOnce(h.options)).toBe("blocked");
    expect((await h.store.snapshot()).quests[0].events.at(-1)?.message).toContain(
      "Git base changed",
    );
    expect(await gitAt(h.root, ["rev-parse", "HEAD"])).toBe(unexpectedSha);
    await expect(readFile(path.join(h.root, "brief-3.json"))).rejects.toThrow();
  });

  it("executes an explicit source-changing command only in the clean pinned fixture", async () => {
    const h = await setup(`
      import { execFileSync } from 'node:child_process';
      import { writeFile } from 'node:fs/promises';
      let raw=''; for await(const chunk of process.stdin) raw+=chunk;
      const brief=JSON.parse(raw);
      if (process.env.GIT_DIR || process.env.GIT_WORK_TREE) process.exit(9);
      const git=(...args)=>execFileSync('git',['-c','core.hooksPath=/dev/null','-c','commit.gpgsign=false',...args],{encoding:'utf8'}).trim();
      if(git('rev-parse','HEAD')!==brief.verifiedTarget.sha) process.exit(8);
      await writeFile('app.txt','source changed by the configured fixture command\\n');
      git('add','app.txt'); git('commit','-m','Explicit driver-owned fixture change');
      process.stdout.write(JSON.stringify({summary:'Real local filesystem/commit effect; synthetic capture fixture',sha:git('rev-parse','HEAD'),provenance:'worker-reported',captures:[{route:'/replay',title:'Replay',imagePath:'capture.png'}]}));
    `);
    vi.stubEnv("GIT_DIR", "/nonexistent/redirected-repository");
    vi.stubEnv("GIT_WORK_TREE", "/nonexistent/redirected-worktree");
    expect(await runWorkerOnce(h.options)).toBe("review");
    const q = (await h.store.snapshot()).quests[0];
    expect(await readFile(path.join(h.root, "app.txt"), "utf8")).toBe(
      "source changed by the configured fixture command\n",
    );
    expect(q.evidence?.executionTarget?.sha).toBe(h.sha);
    expect(q.evidence?.sha).not.toBe(h.sha);
    expect(q.evidence?.sha).toBe(await gitAt(h.root, ["rev-parse", "HEAD"]));
    expect(await gitAt(h.root, ["status", "--porcelain=v1"])).toBe("");
  });

  it("requires an operator revision to pin legacy work before executing it", async () => {
    const h = await setup();
    const file = path.join(h.store.root, "ops.json");
    const saved = JSON.parse(await readFile(file, "utf8"));
    saved.quests[0].executionTarget = undefined;
    await writeFile(file, JSON.stringify(saved));
    h.restart();
    expect(await runWorkerOnce(h.options)).toBe("blocked");
    await expect(readFile(path.join(h.root, "brief-1.json"))).rejects.toThrow();
    expect(
      (
        await h.send({
          action: "review",
          questId: h.quest.id,
          revision: 1,
          evidenceId: null,
          decision: "revise",
          note: "Bind this old quest to the current checkout",
        })
      ).status,
    ).toBe(200);
    expect(await runWorkerOnce(h.options)).toBe("review");
    expect((await h.store.snapshot()).quests[0].executionTarget?.sha).toBe(h.sha);
  });

  it("allows only one local command when two worker instances claim the same agent", async () => {
    const h = await setup();
    const driver = await readFile(path.join(h.root, "driver.mjs"), "utf8");
    await writeFile(
      path.join(h.root, "driver.mjs"),
      `import { appendFile } from 'node:fs/promises'; await appendFile('executions','x'); await new Promise(r=>setTimeout(r,100));\n${driver}`,
    );
    const outcomes = await Promise.all([runWorkerOnce(h.options), runWorkerOnce(h.options)]);
    expect(outcomes.sort()).toEqual(["idle", "review"]);
    expect(await readFile(path.join(h.root, "executions"), "utf8")).toBe("x");
    expect((await h.store.snapshot()).quests[0].submissions).toHaveLength(1);
  });

  it("recovers an interrupted process after store restart and rejects the old lease", async () => {
    const h = await setup();
    const original = await readFile(path.join(h.root, "driver.mjs"), "utf8");
    await writeFile(
      path.join(h.root, "driver.mjs"),
      `import { writeFile } from 'node:fs/promises'; await writeFile('pid',String(process.pid)); setInterval(()=>{},50);`,
    );
    const controller = new AbortController();
    const firstRun = runWorkerOnce({ ...h.options, signal: controller.signal });
    const interrupted = expect(firstRun).rejects.toThrow();
    let pid = 0;
    for (let i = 0; i < 100 && !pid; i++) {
      try {
        pid = Number(await readFile(path.join(h.root, "pid"), "utf8"));
      } catch {
        await delay(10);
      }
    }
    expect(pid).toBeGreaterThan(0);
    const persisted = JSON.parse(await readFile(path.join(h.store.root, "ops.json"), "utf8"));
    const oldToken = persisted.quests[0].lease.token;
    controller.abort();
    await interrupted;
    expect(() => process.kill(pid, 0)).toThrow();
    h.advance(LEASE_MS + 1);
    h.restart();
    await writeFile(path.join(h.root, "driver.mjs"), original);
    expect(await runWorkerOnce(h.options)).toBe("review");
    const q = (await new OpsStore(h.store.root).snapshot()).quests[0];
    expect(q.id).toBe(h.quest.id);
    expect(q.submissions).toHaveLength(1);
    expect(q.events.filter((e) => e.message === "Agent claimed the quest.")).toHaveLength(2);
    const stale = await h.send(
      {
        action: "submit",
        questId: q.id,
        agentId: input.assignedTo,
        leaseToken: oldToken,
        revision: 1,
        provenance: "worker-reported",
        summary: "Late result",
        sceneIds: q.evidence?.sceneIds,
      },
      "agent",
    );
    expect(stale.status).toBe(400);
    expect((await h.store.snapshot()).quests[0].submissions).toHaveLength(1);
  });
  it("requires the versioned contract before claiming work or starting a process", async () => {
    const h = await setup();
    vi.stubGlobal("fetch", async () => Response.json({ version: 1 }));
    await expect(runWorkerOnce(h.options)).rejects.toThrow("version 2");
    expect((await h.store.snapshot()).quests[0].status).toBe("queued");
    await expect(readFile(path.join(h.root, "brief-1.json"))).rejects.toThrow();
  });
  it("executes a local driver, retains feedback and evidence across revisions, and fences stale reviews", async () => {
    const h = await setup();
    expect(await runWorkerOnce(h.options)).toBe("review");
    let q = (await h.store.snapshot()).quests[0];
    expect(q).toMatchObject({
      revision: 1,
      status: "review",
      evidence: { provenance: "worker-reported" },
    });
    const firstEvidence = q.evidence;
    const oldTarget = { revision: q.revision, evidenceId: q.evidence?.id };
    expect(
      (
        await h.send({
          action: "review",
          questId: q.id,
          ...oldTarget,
          decision: "revise",
          note: "Preserve the moment after returning.",
        })
      ).status,
    ).toBe(200);
    expect(await runWorkerOnce(h.options)).toBe("review");
    q = (await new OpsStore(h.store.root).snapshot()).quests[0];
    expect(q.revision).toBe(2);
    expect(q.submissions).toHaveLength(2);
    expect(q.submissions[0]).toEqual(firstEvidence);
    const brief = JSON.parse(await readFile(path.join(h.root, "brief-2.json"), "utf8"));
    expect(brief.quest.reviews[0]).toMatchObject({
      revision: 1,
      note: "Preserve the moment after returning.",
    });
    expect(brief.quest.submissions[0].id).toBe(firstEvidence?.id);
    expect(
      (
        await h.send({
          action: "review",
          questId: q.id,
          ...oldTarget,
          decision: "accept",
          note: "Old review window",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await h.send({
          action: "review",
          questId: q.id,
          revision: q.revision,
          evidenceId: q.evidence?.id,
          decision: "accept",
          note: "Reviewed the current revision",
        })
      ).status,
    ).toBe(200);
    expect((await h.store.snapshot()).quests[0].status).toBe("done");
    expect(await runWorkerOnce(h.options)).toBe("idle");
    expect(JSON.stringify(await h.store.snapshot())).not.toContain("private-test-token");
  });

  it("keeps simulated execution visible and prevents operator acceptance", async () => {
    const h = await setup();
    expect(await runWorkerOnce({ ...h.options, simulation: true })).toBe("review");
    const q = (await h.store.snapshot()).quests[0];
    expect(q.evidence?.provenance).toBe("simulated");
    const response = await h.send({
      action: "review",
      questId: q.id,
      revision: q.revision,
      evidenceId: q.evidence?.id,
      decision: "accept",
      note: "Try accepting simulation",
    });
    expect(response.status).toBe(400);
    expect(await response.text()).toContain("Simulated");
    expect(q.events.some((e) => e.message.includes("simulated"))).toBe(true);
  });

  it("stops its real child process on cancellation and publishes no late result", async () => {
    const h = await setup(
      `import { writeFile } from 'node:fs/promises'; await writeFile('pid',String(process.pid)); setInterval(()=>{},50);`,
    );
    const running = runWorkerOnce(h.options);
    const rejected = expect(running).rejects.toThrow("lease");
    let pid = 0;
    for (let i = 0; i < 100 && !pid; i++) {
      try {
        pid = Number(await readFile(path.join(h.root, "pid"), "utf8"));
      } catch {
        await delay(10);
      }
    }
    expect(pid).toBeGreaterThan(0);
    await h.store.review(h.quest.id, "cancel", "Stop this run");
    await rejected;
    expect(() => process.kill(pid, 0)).toThrow();
    expect(h.actions).not.toContain("submit");
    expect((await h.store.snapshot()).quests[0].status).toBe("cancelled");
  });

  it("records command failure as a blocker without fabricating evidence", async () => {
    const h = await setup("process.stderr.write('secret diagnostic'); process.exit(7);");
    expect(await runWorkerOnce(h.options)).toBe("blocked");
    const q = (await h.store.snapshot()).quests[0];
    expect(q.status).toBe("blocked");
    expect(q.evidence).toBeNull();
    expect(q.events.at(-1)?.message).toContain("code 7");
    expect(JSON.stringify(q)).not.toContain("secret diagnostic");
  });
  it("terminates background descendants before publishing a successful command result", async () => {
    const h = await setup(`
      import { spawn } from 'node:child_process';
      const child = spawn(process.execPath, ['-e', "setTimeout(()=>require('node:fs').writeFileSync('late-effect','unexpected'),300)"], {stdio:'ignore'});
      child.unref();
      process.stdout.write(JSON.stringify({summary:'Bounded fixture',sha:'${sha}',provenance:'worker-reported',captures:[{route:'/replay',title:'Replay',imagePath:'capture.png'}]}));
    `);
    expect(await runWorkerOnce(h.options)).toBe("review");
    await delay(500);
    await expect(readFile(path.join(h.root, "late-effect"))).rejects.toThrow();
  });

  it("fences uploads after cancellation and rejects missing revision/provenance", async () => {
    const h = await setup();
    const q = await h.store.claim(input.assignedTo);
    const ownership = { questId: q?.id, agentId: input.assignedTo, leaseToken: q?.lease?.token };
    const upload = {
      ...ownership,
      revision: 1,
      sha: h.sha,
      title: "Replay",
      route: "/replay",
      imageDataUrl: `data:image/png;base64,${png}`,
    };
    const uploaded = await h.send(upload, "agent", "/api/ops/scenes");
    expect(uploaded.status).toBe(200);
    const scene = (await uploaded.json()) as { id: string };
    const submit = {
      ...ownership,
      action: "submit",
      summary: "Fixture result",
      sceneIds: [scene.id],
    };
    expect((await h.send(submit, "agent")).status).toBe(400);
    expect((await h.send({ ...submit, revision: 1 }, "agent")).status).toBe(400);
    expect(
      (await h.send({ ...submit, revision: 2, provenance: "worker-reported" }, "agent")).status,
    ).toBe(400);
    await h.store.review(h.quest.id, "cancel", "Stop before the next upload");
    expect(
      (await h.send({ ...upload, route: "/another" }, "agent", "/api/ops/scenes")).status,
    ).toBe(400);
    expect(await h.scenes.list()).toHaveLength(1);
    expect((await h.store.snapshot()).quests[0].evidence).toBeNull();
  });

  it("rejects acceptance after a captured image changes and prevents worker review", async () => {
    const h = await setup();
    await runWorkerOnce(h.options);
    const q = (await h.store.snapshot()).quests[0];
    const review = {
      action: "review",
      questId: q.id,
      revision: 1,
      evidenceId: q.evidence?.id,
      decision: "accept",
      note: "Reviewed",
    };
    expect((await h.send(review, "agent")).status).toBe(403);
    await h.scenes.save({
      projectId: input.projectId,
      branch: input.branch,
      sha: h.sha,
      route: "/replay",
      title: "Replaced",
      imageDataUrl: `data:image/png;base64,${Buffer.from("different fixture").toString("base64")}`,
    });
    expect((await h.send(review)).status).toBe(400);
    expect((await h.store.snapshot()).quests[0].status).toBe("review");
  });

  it("rejects stale captures and capture paths escaping the configured workspace", async () => {
    const h = await setup();
    const cleanDriver = await readFile(path.join(h.root, "driver.mjs"), "utf8");
    await writeFile(
      path.join(h.root, "driver.mjs"),
      cleanDriver.replace("sha:brief.verifiedTarget.sha", `sha:'${"b".repeat(40)}'`),
    );
    expect(await runWorkerOnce(h.options)).toBe("blocked");
    expect(await h.scenes.list()).toHaveLength(0);
    await h.send({
      action: "review",
      questId: h.quest.id,
      decision: "revise",
      revision: 1,
      evidenceId: null,
      note: "Retry on the current build",
    });
    await writeFile(path.join(h.root, "driver.mjs"), cleanDriver);
    const driver = await readFile(path.join(h.root, "driver.mjs"), "utf8");
    await writeFile(
      path.join(h.root, "driver.mjs"),
      driver.replace("imagePath:'capture.png'", "imagePath:'../outside.png'"),
    );
    await writeFile(path.join(h.root, "..", "outside.png"), Buffer.from(png, "base64"));
    expect(await runWorkerOnce(h.options)).toBe("blocked");
    const q = (await h.store.snapshot()).quests[0];
    expect(q.events.at(-1)?.message).toContain("inside the configured worker workspace");
    expect(q.submissions).toHaveLength(0);
  });
});
