import { type ChildProcess, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, realpath } from "node:fs/promises";
import path from "node:path";
import type {
  StageBranchRef,
  StageCaptureRef,
  StageConfig,
  StageProjectConfig,
  StageSceneRef,
  StageSessionRef,
  StageSessionTarget,
} from "../types/index.js";
import { StageCaptureStore } from "./capture-store.js";
import { ensureWorktree, listProjectBranches } from "./git.js";
import { StageSceneStore } from "./scene-store.js";

type ManagedSession = StageSessionRef & {
  process?: ChildProcess;
  preparing?: boolean;
  stopProcess?: () => void;
};

export class StageSessionManager {
  readonly #config: StageConfig;
  readonly #sessions = new Map<string, ManagedSession>();
  readonly scenes: StageSceneStore;
  readonly captures: StageCaptureStore;

  constructor(config: StageConfig) {
    this.#config = config;
    this.scenes = new StageSceneStore(config.sceneRoot ?? path.resolve(".stage-scenes"));
    this.captures = new StageCaptureStore(config.sceneRoot ?? path.resolve(".stage-scenes"));
  }

  async snapshot(): Promise<{
    projects: StageProjectConfig[];
    branches: StageBranchRef[];
    sessions: StageSessionRef[];
    scenes: StageSceneRef[];
    captures: StageCaptureRef[];
  }> {
    const branches = (
      await Promise.all(this.#config.projects.map((project) => listProjectBranches(project)))
    ).flat();
    const scenes = (
      await Promise.all(
        branches
          .filter((branch) => branch.sha)
          .map((branch) =>
            this.scenes.list({
              projectId: branch.projectId,
              branch: branch.name,
              sha: branch.sha ?? undefined,
            }),
          ),
      )
    ).flat();
    const orderedScenes = this.#config.projects.flatMap((project) => {
      const order = new Map(
        (project.preview?.scenes ?? []).map((scene, index) => [scene.route, index]),
      );
      return scenes
        .filter((scene) => scene.projectId === project.id)
        .sort((left, right) => (order.get(left.route) ?? 999) - (order.get(right.route) ?? 999));
    });
    return {
      projects: this.#config.projects,
      branches,
      sessions: this.listSessions(),
      scenes: orderedScenes,
      captures: (await this.captures.list()).filter((capture) =>
        branches.some(
          (branch) =>
            branch.projectId === capture.projectId &&
            branch.name === capture.branch &&
            branch.sha === capture.sha,
        ),
      ),
    };
  }

  listSessions(): StageSessionRef[] {
    return [...this.#sessions.values()].map(
      ({ process: _process, preparing: _preparing, stopProcess: _stopProcess, ...session }) =>
        session,
    );
  }

  async startSession(input: {
    projectId: string;
    branch: string;
    target: StageSessionTarget;
  }): Promise<StageSessionRef> {
    const project = this.#config.projects.find((candidate) => candidate.id === input.projectId);
    if (!project) {
      throw new Error(`Unknown Stage project ${input.projectId}.`);
    }
    const branch = (await listProjectBranches(project)).find(
      (candidate) => candidate.name === input.branch,
    );
    if (!branch || branch.availability !== "available") {
      throw new Error(
        `Branch ${input.branch} is not available locally. Run git fetch --all first.`,
      );
    }

    const existing = [...this.#sessions.values()].find(
      (session) =>
        session.projectId === input.projectId &&
        session.branch === input.branch &&
        session.target === input.target &&
        session.status !== "stopped" &&
        session.status !== "failed",
    );
    if (existing) {
      return this.publicSession(existing);
    }

    if (!branch.sha) throw new Error("The selected branch has no exact commit.");
    const configuredWorkspace = this.#config.workspaceRoot ?? path.resolve(".stage-worktrees");
    await mkdir(configuredWorkspace, { recursive: true });
    const workspaceRoot = await realpath(configuredWorkspace);
    const worktreeRoot = path.join(
      workspaceRoot,
      project.id,
      `${slug(input.branch)}-${branch.sha}`,
    );
    const id = `${project.id}-${slug(input.branch)}-${input.target}`;
    const owner = [...this.#sessions.values()].find(
      (session) =>
        (session.worktreeRoot === worktreeRoot || session.id === id) &&
        (session.preparing || !["stopped", "failed"].includes(session.status) || session.process),
    );
    if (owner) {
      if (
        owner.projectId === input.projectId &&
        owner.branch === input.branch &&
        owner.target === input.target &&
        !["stopped", "failed"].includes(owner.status)
      )
        return this.publicSession(owner);
      throw new Error(
        "This preview checkout is still owned by another session. Stop it and wait for its process to exit before retrying.",
      );
    }
    const port = this.nextPort(project);
    const host = project.host ?? "127.0.0.1";
    const metroUrl = `http://${host}:${port}`;
    const preview = project.preview ?? {
      mode: "stage",
      scenario: "default",
      route: "/",
    };
    const query = new URLSearchParams({
      mode: preview.mode,
      scenario: preview.scenario,
      route: preview.route,
    });
    const scheme = project.scheme ?? "exp";
    const now = new Date().toISOString();
    const session: ManagedSession = {
      id,
      instanceId: randomUUID(),
      projectId: project.id,
      branch: input.branch,
      sha: branch.sha,
      target: input.target,
      status: "preparing",
      preparing: true,
      port,
      worktreeRoot,
      previewUrl: `${metroUrl}?${query}`,
      devClientUrl: `${scheme}://expo-development-client/?url=${encodeURIComponent(metroUrl)}&${query}`,
      sdkVersion: branch.sdkVersion,
      runtimeFingerprint: branch.runtimeFingerprint,
      compatibility: branch.compatibility,
      startedAt: now,
      updatedAt: now,
      logs: [],
    };
    this.#sessions.set(id, session);

    try {
      await mkdir(path.dirname(worktreeRoot), { recursive: true });
      await ensureWorktree({ project, sha: branch.sha, destination: worktreeRoot });
      this.requirePreparing(session);
      if (project.prepareCommand?.length) {
        await this.runPreparation(session, project.prepareCommand, worktreeRoot, project);
      }
      this.requirePreparing(session);
      this.launch(session, project, worktreeRoot);
      return this.publicSession(session);
    } catch (error) {
      if (session.status !== "stopped") {
        session.status = "failed";
        session.error = error instanceof Error ? error.message : String(error);
        session.updatedAt = new Date().toISOString();
      }
      throw error;
    } finally {
      session.preparing = false;
    }
  }

  requirePreparing(session: ManagedSession): void {
    if (session.status === "stopped" || this.#sessions.get(session.id) !== session)
      throw new Error("Session preparation was cancelled; no preview was launched.");
  }

  stopSession(id: string): StageSessionRef {
    const session = this.#sessions.get(id);
    if (!session) {
      throw new Error(`Unknown Stage session ${id}.`);
    }
    session.stopProcess?.();
    session.status = "stopped";
    session.updatedAt = new Date().toISOString();
    return this.publicSession(session);
  }

  stopAll(): void {
    for (const session of this.#sessions.values()) {
      session.stopProcess?.();
      session.status = "stopped";
      session.updatedAt = new Date().toISOString();
    }
  }

  async #runCommand(command: string[], cwd: string, session: ManagedSession): Promise<void> {
    const [executable, ...args] = command;
    if (!executable) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      this.requirePreparing(session);
      const child = spawn(executable, args, {
        cwd,
        env: process.env,
        detached: process.platform !== "win32",
      });
      this.trackProcess(session, child);
      child.stdout?.on("data", (data) => this.appendLog(session, String(data)));
      child.stderr?.on("data", (data) => this.appendLog(session, String(data)));
      child.once("error", reject);
      child.once("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`${command.join(" ")} exited with code ${code ?? "unknown"}.`));
      });
    });
  }

  async runPreparation(
    session: ManagedSession,
    command: string[],
    worktreeRoot: string,
    project: StageProjectConfig,
  ): Promise<void> {
    await this.#runCommand(
      expandCommand(command, worktreeRoot, project, session.port),
      worktreeRoot,
      session,
    );
  }

  launch(session: ManagedSession, project: StageProjectConfig, worktreeRoot: string): void {
    const defaultCommand = [
      "pnpm",
      "--dir",
      "{appRoot}",
      "exec",
      "expo",
      "start",
      session.target === "web" ? "--web" : "--dev-client",
      "--port",
      "{port}",
    ];
    const configured = session.target === "web" ? project.webCommand : project.devClientCommand;
    const command = expandCommand(
      configured ?? defaultCommand,
      worktreeRoot,
      project,
      session.port,
    );
    const [executable, ...args] = command;
    if (!executable) {
      throw new Error("Stage session command is empty.");
    }
    session.status = "starting";
    session.updatedAt = new Date().toISOString();
    const child = spawn(executable, args, {
      cwd: worktreeRoot,
      detached: process.platform !== "win32",
      env: {
        ...process.env,
        EXPO_PUBLIC_STAGE_MODE: project.preview?.mode ?? "stage",
        EXPO_PUBLIC_STAGE_SCENARIO: project.preview?.scenario ?? "default",
        EXPO_PUBLIC_STAGE_ROUTE: project.preview?.route ?? "/",
      },
    });
    this.trackProcess(session, child);
    child.stdout?.on("data", (data) => {
      this.appendLog(session, String(data));
      if (session.status !== "stopped") session.status = "live";
      session.updatedAt = new Date().toISOString();
    });
    child.stderr?.on("data", (data) => this.appendLog(session, String(data)));
    child.once("error", (error) => {
      if (session.status !== "stopped") session.status = "failed";
      session.error = error.message;
      session.updatedAt = new Date().toISOString();
    });
    child.once("exit", (code) => {
      if (session.status !== "stopped") {
        session.status = code === 0 ? "stopped" : "failed";
        session.error = code && code !== 0 ? `Metro exited with code ${code}.` : session.error;
        session.updatedAt = new Date().toISOString();
      }
    });
  }

  trackProcess(session: ManagedSession, child: ChildProcess): void {
    session.process = child;
    let killer: ReturnType<typeof setTimeout> | undefined;
    const kill = (signal: NodeJS.Signals) => {
      try {
        if (process.platform !== "win32" && child.pid) process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch {
        /* The owned process group has already exited. */
      }
    };
    session.stopProcess = () => {
      kill("SIGTERM");
      killer ??= setTimeout(() => kill("SIGKILL"), 2000);
    };
    child.once("exit", () => kill("SIGKILL"));
    child.once("close", () => {
      kill("SIGKILL");
      if (killer) clearTimeout(killer);
      if (session.process === child) {
        session.process = undefined;
        session.stopProcess = undefined;
      }
    });
  }

  nextPort(project: StageProjectConfig): number {
    const start = project.startingPort ?? 8081;
    const used = new Set([...this.#sessions.values()].map((session) => session.port));
    let port = start;
    while (used.has(port)) port += 1;
    return port;
  }

  appendLog(session: ManagedSession, output: string): void {
    session.logs.push(...output.split("\n").filter(Boolean));
    session.logs = session.logs.slice(-80);
  }

  publicSession(session: ManagedSession): StageSessionRef {
    const {
      process: _process,
      preparing: _preparing,
      stopProcess: _stopProcess,
      ...value
    } = session;
    return value;
  }
}

function expandCommand(
  command: string[],
  worktreeRoot: string,
  project: StageProjectConfig,
  port: number,
): string[] {
  const appRoot = path.join(worktreeRoot, project.appRoot);
  return command.map((part) =>
    part
      .replaceAll("{worktreeRoot}", worktreeRoot)
      .replaceAll("{appRoot}", appRoot)
      .replaceAll("{port}", String(port)),
  );
}

function slug(value: string): string {
  return value.replace(/[^a-zA-Z0-9.-]+/g, "-").replace(/^-|-$/g, "");
}
