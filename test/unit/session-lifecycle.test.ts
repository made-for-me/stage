import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { ensureWorktree } from "../../src/control/git.js";
import { StageSessionManager } from "../../src/control/session-manager.js";
import type { StageProjectConfig } from "../../src/types/index.js";

const exec = promisify(execFile);
const managers: StageSessionManager[] = [];
afterEach(() => {
  for (const manager of managers.splice(0)) manager.stopAll();
});
async function git(root: string, args: string[]) {
  return (
    await exec("git", [
      "-c",
      "core.hooksPath=/dev/null",
      "-c",
      "commit.gpgsign=false",
      "-C",
      root,
      ...args,
    ])
  ).stdout.trim();
}
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "stage-session-"));
  await git(root, ["init", "-b", "main"]);
  await git(root, ["config", "user.name", "Stage fixture"]);
  await git(root, ["config", "user.email", "stage@example.test"]);
  await writeFile(path.join(root, "app.txt"), "original source\n");
  await writeFile(path.join(root, ".gitignore"), ".prep-pid\n.launched\n");
  await git(root, ["add", "."]);
  await git(root, ["commit", "-m", "Base fixture"]);
  const sha = await git(root, ["rev-parse", "HEAD"]);
  const project: StageProjectConfig = {
    id: "app",
    name: "Fixture",
    repository: "fixture",
    localRoot: root,
    appRoot: ".",
    baselineBranch: "main",
    webCommand: [process.execPath, "-e", "console.log('ready');setInterval(()=>{},50)"],
    devClientCommand: [process.execPath, "-e", "console.log('ready');setInterval(()=>{},50)"],
  };
  const manager = new StageSessionManager({
    workspaceRoot: `${root}-worktrees`,
    sceneRoot: `${root}-scenes`,
    projects: [project],
  });
  managers.push(manager);
  return { root, sha, project, manager };
}
async function until(check: () => Promise<boolean>) {
  for (let i = 0; i < 100; i++) {
    if (await check()) return;
    await delay(20);
  }
  throw new Error("Fixture did not reach the expected process state.");
}

describe("managed session worktree lifecycle", () => {
  it("retains dirty cached bytes and refuses to reset a changed detached commit", async () => {
    const h = await fixture();
    const destination = `${h.root}-preview`;
    await ensureWorktree({ project: h.project, sha: h.sha, destination });
    await writeFile(path.join(destination, "app.txt"), "staged preview edit\n");
    await git(destination, ["add", "app.txt"]);
    await writeFile(path.join(destination, "notes.txt"), "untracked note\n");
    await expect(ensureWorktree({ project: h.project, sha: h.sha, destination })).rejects.toThrow(
      "local changes",
    );
    expect(await readFile(path.join(destination, "app.txt"), "utf8")).toBe("staged preview edit\n");
    expect(await readFile(path.join(destination, "notes.txt"), "utf8")).toBe("untracked note\n");
    await git(destination, ["add", "notes.txt"]);
    await git(destination, ["commit", "-m", "Preserve fixture edits"]);
    const changed = await git(destination, ["rev-parse", "HEAD"]);
    await expect(ensureWorktree({ project: h.project, sha: h.sha, destination })).rejects.toThrow(
      "no reset",
    );
    expect(await git(destination, ["rev-parse", "HEAD"])).toBe(changed);
    expect(await git(h.root, ["rev-parse", "HEAD"])).toBe(h.sha);
  });

  it("uses the inspected commit even when the source branch advances before preparation", async () => {
    const h = await fixture();
    await git(h.root, ["commit", "--allow-empty", "-m", "Branch advanced"]);
    const destination = `${h.root}-preview`;
    await ensureWorktree({ project: h.project, sha: h.sha, destination });
    expect(await git(destination, ["rev-parse", "HEAD"])).toBe(h.sha);
    expect(await git(h.root, ["rev-parse", "HEAD"])).not.toBe(h.sha);
  });

  it("refuses a foreign cached clone without modifying its contents", async () => {
    const h = await fixture();
    const destination = `${h.root}-clone`;
    await git(h.root, ["clone", "--no-hardlinks", h.root, destination]);
    await git(destination, ["checkout", "--detach", h.sha]);
    await expect(ensureWorktree({ project: h.project, sha: h.sha, destination })).rejects.toThrow(
      "another Git checkout",
    );
    expect(await git(destination, ["rev-parse", "HEAD"])).toBe(h.sha);
  });

  it("rejects a second target preparing the same active checkout", async () => {
    const h = await fixture();
    const first = await h.manager.startSession({ projectId: "app", branch: "main", target: "web" });
    await expect(
      h.manager.startSession({ projectId: "app", branch: "main", target: "dev-client" }),
    ).rejects.toThrow("owned by another session");
    expect(h.manager.listSessions()).toHaveLength(1);
    expect(first.worktreeRoot).toContain(h.sha);
  });

  it("kills owned preview descendants and holds the checkout until process cleanup", async () => {
    const h = await fixture();
    h.project.webCommand = [
      process.execPath,
      "-e",
      `
      const {spawn}=require('node:child_process');
      const {writeFileSync}=require('node:fs');
      const child=spawn(process.execPath,['-e',"process.on('SIGTERM',()=>{});setInterval(()=>{},50)"],{stdio:'ignore'});
      writeFileSync('.prep-pid',JSON.stringify({parent:process.pid,child:child.pid}));
      process.on('SIGTERM',()=>{});console.log('ready');setInterval(()=>{},50);
    `,
    ];
    const session = await h.manager.startSession({
      projectId: "app",
      branch: "main",
      target: "web",
    });
    let pids: { parent: number; child: number } | undefined;
    await until(async () => {
      try {
        pids = JSON.parse(await readFile(path.join(session.worktreeRoot, ".prep-pid"), "utf8"));
        return true;
      } catch {
        return false;
      }
    });
    await delay(100);
    h.manager.stopSession(session.id);
    await expect(
      h.manager.startSession({ projectId: "app", branch: "main", target: "web" }),
    ).rejects.toThrow("owned by another session");
    await delay(2200);
    expect(() => process.kill(pids?.parent ?? 0, 0)).toThrow();
    expect(() => process.kill(pids?.child ?? 0, 0)).toThrow();
    expect(h.manager.listSessions()[0].status).toBe("stopped");
  });

  it("stops a preparation child and never resurrects the cancelled session", async () => {
    const h = await fixture();
    h.project.prepareCommand = [
      process.execPath,
      "-e",
      "require('node:fs').writeFileSync('.prep-pid',String(process.pid));setInterval(()=>{},50)",
    ];
    h.project.webCommand = [
      process.execPath,
      "-e",
      "require('node:fs').writeFileSync('.launched','unexpected')",
    ];
    const starting = h.manager.startSession({ projectId: "app", branch: "main", target: "web" });
    const rejected = expect(starting).rejects.toThrow();
    let pid = 0;
    await until(async () => {
      const session = h.manager.listSessions()[0];
      if (!session) return false;
      try {
        pid = Number(await readFile(path.join(session.worktreeRoot, ".prep-pid"), "utf8"));
        return pid > 0;
      } catch {
        return false;
      }
    });
    const session = h.manager.listSessions()[0];
    h.manager.stopSession(session.id);
    await rejected;
    expect(h.manager.listSessions()[0].status).toBe("stopped");
    expect(() => process.kill(pid, 0)).toThrow();
    await expect(readFile(path.join(session.worktreeRoot, ".launched"))).rejects.toThrow();
  });
});
