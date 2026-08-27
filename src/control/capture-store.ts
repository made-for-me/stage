import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StageCaptureRef, StageCaptureStatus } from "../types/index.js";

export type RequestStageCaptureInput = {
  projectId: string;
  branch: string;
  sha: string;
  requestedBy?: StageCaptureRef["requestedBy"];
};

export class StageCaptureStore {
  readonly #root: string;
  readonly #manifestPath: string;

  constructor(root: string) {
    this.#root = root;
    this.#manifestPath = path.join(root, "captures.json");
  }

  async list(input?: { projectId?: string; branch?: string; sha?: string }): Promise<
    StageCaptureRef[]
  > {
    return (await this.readManifest())
      .filter(
        (capture) =>
          (!input?.projectId || capture.projectId === input.projectId) &&
          (!input?.branch || capture.branch === input.branch) &&
          (!input?.sha || capture.sha === input.sha),
      )
      .sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
  }

  async request(input: RequestStageCaptureInput): Promise<StageCaptureRef> {
    const key = `${input.projectId}\0${input.branch}\0${input.sha}`;
    const id = createHash("sha256").update(key).digest("hex").slice(0, 24);
    const captures = await this.readManifest();
    const existing = captures.find((capture) => capture.id === id);
    if (existing && (existing.status === "queued" || existing.status === "capturing")) {
      return existing;
    }
    const now = new Date().toISOString();
    const capture: StageCaptureRef = {
      id,
      projectId: input.projectId,
      branch: input.branch,
      sha: input.sha,
      status: "queued",
      requestedAt: now,
      updatedAt: now,
      requestedBy: input.requestedBy ?? "ar2",
    };
    await this.writeManifest([...captures.filter((candidate) => candidate.id !== id), capture]);
    return capture;
  }

  async next(projectId?: string): Promise<StageCaptureRef | null> {
    const captures = await this.readManifest();
    const queued = captures
      .filter(
        (capture) => capture.status === "queued" && (!projectId || capture.projectId === projectId),
      )
      .sort((left, right) => left.requestedAt.localeCompare(right.requestedAt))[0];
    if (!queued) return null;
    return this.update(queued.id, "capturing");
  }

  async update(id: string, status: StageCaptureStatus, error?: string): Promise<StageCaptureRef> {
    const captures = await this.readManifest();
    const current = captures.find((capture) => capture.id === id);
    if (!current) throw new Error(`Unknown capture ${id}.`);
    const updated: StageCaptureRef = {
      ...current,
      status,
      updatedAt: new Date().toISOString(),
      ...(error ? { error } : {}),
    };
    await this.writeManifest([...captures.filter((capture) => capture.id !== id), updated]);
    return updated;
  }

  private async readManifest(): Promise<StageCaptureRef[]> {
    try {
      const value = JSON.parse(await readFile(this.#manifestPath, "utf8"));
      return Array.isArray(value) ? (value as StageCaptureRef[]) : [];
    } catch {
      return [];
    }
  }

  private async writeManifest(captures: StageCaptureRef[]): Promise<void> {
    await mkdir(this.#root, { recursive: true });
    await writeFile(this.#manifestPath, `${JSON.stringify(captures, null, 2)}\n`, "utf8");
  }
}
