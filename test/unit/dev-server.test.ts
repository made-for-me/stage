import { execFile } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { startStageDevServer } from "../../src/server/dev-server.js";

const execFileAsync = promisify(execFile);
const onePixelPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const servers: Array<Awaited<ReturnType<typeof startStageDevServer>>> = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
});

describe("Stage branch studio API", () => {
  it("queues a capture and completes it after every configured scene is uploaded", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "stage-server-"));
    const repository = path.join(root, "clubhall");
    const appRoot = path.join(repository, "apps", "mobile");
    await mkdir(appRoot, { recursive: true });
    await writeFile(
      path.join(appRoot, "package.json"),
      JSON.stringify({ name: "clubhall", dependencies: { expo: "57.0.0" } }),
    );
    await execFileAsync("git", ["init", "-b", "main"], { cwd: repository });
    await execFileAsync("git", ["config", "user.name", "Stage Test"], { cwd: repository });
    await execFileAsync("git", ["config", "user.email", "stage@example.test"], { cwd: repository });
    await execFileAsync("git", ["add", "."], { cwd: repository });
    await execFileAsync("git", ["commit", "-m", "test fixture"], { cwd: repository });

    const configPath = path.join(root, "stage.config.json");
    await writeFile(
      configPath,
      JSON.stringify({
        sceneRoot: path.join(root, "scenes"),
        projects: [
          {
            id: "clubhall",
            name: "ClubHall",
            repository: "accollier/clubhall",
            localRoot: repository,
            appRoot: "apps/mobile",
            baselineBranch: "main",
            trackedBranches: [],
            preview: {
              mode: "stage",
              scenario: "tennis-ready",
              route: "/home",
              scenes: [
                { title: "Home", route: "/home" },
                { title: "Arena", route: "/arena" },
              ],
            },
          },
        ],
      }),
    );

    const server = await startStageDevServer({
      cwd: root,
      projectRoot: repository,
      port: 0,
      configPath,
    });
    servers.push(server);
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing test server port.");
    const origin = `http://127.0.0.1:${address.port}`;

    const initial = (await (await fetch(`${origin}/api/stage`)).json()) as {
      branches: Array<{ name: string; sha: string }>;
    };
    const branch = initial.branches[0];
    expect(branch?.name).toBe("main");

    const captureResponse = await fetch(`${origin}/api/captures`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: "clubhall", branch: "main", requestedBy: "ar2" }),
    });
    expect(captureResponse.status).toBe(201);
    const capture = (await captureResponse.json()) as { id: string; status: string };
    expect(capture.status).toBe("queued");

    const next = (await (await fetch(`${origin}/api/captures/next`)).json()) as {
      capture: { id: string; status: string };
    };
    expect(next.capture).toMatchObject({ id: capture.id, status: "capturing" });

    for (const scene of [
      { title: "Arena", route: "/arena" },
      { title: "Home", route: "/home" },
    ]) {
      const response = await fetch(`${origin}/api/scenes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: "clubhall",
          branch: "main",
          sha: branch?.sha,
          ...scene,
          imageDataUrl: onePixelPng,
        }),
      });
      expect(response.status).toBe(201);
    }

    const completed = (await (await fetch(`${origin}/api/stage`)).json()) as {
      captures: Array<{ status: string }>;
      scenes: Array<{ title: string }>;
    };
    expect(completed.captures[0]?.status).toBe("completed");
    expect(completed.scenes.map((scene) => scene.title)).toEqual(["Home", "Arena"]);

    // A real worker/operator round trip through the HTTP boundary.
    vi.stubEnv("STAGE_AGENT_TOKEN", "test-worker-token");
    const action = (body: unknown, agent = false) =>
      fetch(`${origin}/api/ops/actions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(agent ? { authorization: "Bearer test-worker-token" } : {}),
        },
        body: JSON.stringify(body),
      });
    const crossSite = await fetch(`${origin}/api/ops`, {
      headers: { origin: "https://untrusted.example" },
    });
    expect(crossSite.status).toBe(401);
    const invalidToken = await fetch(`${origin}/api/ops`, {
      headers: { authorization: "Bearer bad" },
    });
    expect(invalidToken.status).toBe(401);
    const create = {
      action: "create",
      title: "Review arena",
      objective: "Inspect the arena experience",
      criteria: ["Arena is usable"],
      projectId: "clubhall",
      branch: "main",
      assignedTo: "grok",
    };
    expect((await action(create, true)).status).toBe(403);
    expect((await action(create)).status).toBe(201);
    const claimed = (await (await action({ action: "claim", agentId: "grok" }, true)).json()) as {
      quest: { id: string; lease: { token: string } };
    };
    const worker = {
      questId: claimed.quest.id,
      agentId: "grok",
      leaseToken: claimed.quest.lease.token,
    };
    expect(
      (
        await action(
          { action: "submit", ...worker, summary: "Verified", sceneIds: ["invented"] },
          true,
        )
      ).status,
    ).toBe(400);
    const captureAction = await action({ action: "capture", ...worker }, true);
    expect(captureAction.status).toBe(200);
    expect(await captureAction.json()).toMatchObject({
      capture: { sha: branch?.sha },
      routes: [{ title: "Home" }, { title: "Arena" }],
    });
    const ops = (await (await fetch(`${origin}/api/ops`)).json()) as { scenes: { id: string }[] };
    expect(JSON.stringify(ops)).not.toContain(worker.leaseToken);
    expect(
      (
        await action(
          {
            action: "submit",
            ...worker,
            summary: "Arena captured for review",
            sceneIds: ops.scenes.map((s) => s.id),
          },
          true,
        )
      ).status,
    ).toBe(200);
    const accept = {
      action: "review",
      questId: worker.questId,
      decision: "accept",
      note: "Meets the criteria",
    };
    expect((await action(accept, true)).status).toBe(403);
    expect(
      (await action({ action: "progress", ...worker, message: "Late update" }, true)).status,
    ).toBe(400);
    // A commit after submission makes the evidence stale, even though its IDs exist.
    await writeFile(path.join(appRoot, "changed.txt"), "new build");
    await execFileAsync("git", ["add", "."], { cwd: repository });
    await execFileAsync("git", ["commit", "-m", "new build"], { cwd: repository });
    expect((await action(accept)).status).toBe(400);
    expect(
      (await action({ ...accept, decision: "revise", note: "Capture the new build" })).status,
    ).toBe(200);
    const reclaimed = (await (
      await action({ action: "claim", agentId: "grok" }, true)
    ).json()) as typeof claimed;
    const nextWorker = { ...worker, leaseToken: reclaimed.quest.lease.token };
    const nextStage = (await (await fetch(`${origin}/api/stage`)).json()) as typeof initial;
    const newSceneResponse = await fetch(`${origin}/api/scenes`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer test-worker-token" },
      body: JSON.stringify({
        projectId: "clubhall",
        branch: "main",
        sha: nextStage.branches[0].sha,
        route: "/arena",
        title: "Arena",
        imageDataUrl: onePixelPng,
      }),
    });
    const newScene = (await newSceneResponse.json()) as { id: string };
    expect(
      (
        await action(
          {
            action: "submit",
            ...nextWorker,
            summary: "New build captured",
            sceneIds: [newScene.id],
          },
          true,
        )
      ).status,
    ).toBe(200);
    expect((await action(accept)).status).toBe(200);
    const done = (await (await fetch(`${origin}/api/ops`)).json()) as {
      quests: { status: string }[];
    };
    expect(done.quests[0].status).toBe("done");
  });
});
