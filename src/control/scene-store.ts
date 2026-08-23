import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StageSceneRef } from "../types/index.js";

const MAX_SCENE_BYTES = 8 * 1024 * 1024;

type StoredScene = Omit<StageSceneRef, "imageUrl"> & {
  file: string;
  mimeType: string;
};

export type SaveStageSceneInput = {
  projectId: string;
  branch: string;
  sha: string;
  title: string;
  route: string;
  imageDataUrl: string;
  width?: number;
  height?: number;
};

export class StageSceneStore {
  readonly #root: string;
  readonly #manifestPath: string;

  constructor(root: string) {
    this.#root = root;
    this.#manifestPath = path.join(root, "manifest.json");
  }

  async list(input?: { projectId?: string; branch?: string; sha?: string }): Promise<
    StageSceneRef[]
  > {
    const scenes = await this.readManifest();
    return scenes
      .filter(
        (scene) =>
          (!input?.projectId || scene.projectId === input.projectId) &&
          (!input?.branch || scene.branch === input.branch) &&
          (!input?.sha || scene.sha === input.sha),
      )
      .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt))
      .map(({ file: _file, mimeType: _mimeType, ...scene }) => ({
        ...scene,
        imageUrl: `/api/scenes/${encodeURIComponent(scene.id)}/image`,
      }));
  }

  async save(input: SaveStageSceneInput): Promise<StageSceneRef> {
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([a-zA-Z0-9+/=\r\n]+)$/.exec(
      input.imageDataUrl,
    );
    if (!match?.[1] || !match[2]) {
      throw new Error("imageDataUrl must be a base64 PNG, JPEG, or WebP image.");
    }

    const image = Buffer.from(match[2], "base64");
    if (!image.length || image.length > MAX_SCENE_BYTES) {
      throw new Error("Scene image must be between 1 byte and 8 MB.");
    }

    const key = `${input.projectId}\0${input.branch}\0${input.sha}\0${input.route}`;
    const id = createHash("sha256").update(key).digest("hex").slice(0, 24);
    const extension = match[1] === "image/jpeg" ? "jpg" : match[1].slice("image/".length);
    const file = path.join("assets", `${id}.${extension}`);
    const capturedAt = new Date().toISOString();
    const stored: StoredScene = {
      id,
      projectId: input.projectId,
      branch: input.branch,
      sha: input.sha,
      title: input.title,
      route: input.route,
      capturedAt,
      width: positiveInteger(input.width),
      height: positiveInteger(input.height),
      file,
      mimeType: match[1],
    };

    await mkdir(path.join(this.#root, "assets"), { recursive: true });
    await writeFile(path.join(this.#root, file), image);
    const scenes = await this.readManifest();
    const next = [...scenes.filter((scene) => scene.id !== id), stored];
    await writeFile(this.#manifestPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");

    return {
      ...stored,
      imageUrl: `/api/scenes/${encodeURIComponent(id)}/image`,
    };
  }

  async readImage(id: string): Promise<{ content: Buffer; mimeType: string } | null> {
    const scene = (await this.readManifest()).find((candidate) => candidate.id === id);
    if (!scene) return null;
    try {
      return {
        content: await readFile(path.join(this.#root, scene.file)),
        mimeType: scene.mimeType,
      };
    } catch {
      return null;
    }
  }

  private async readManifest(): Promise<StoredScene[]> {
    try {
      const value = JSON.parse(await readFile(this.#manifestPath, "utf8"));
      return Array.isArray(value) ? (value as StoredScene[]) : [];
    } catch {
      return [];
    }
  }
}

function positiveInteger(value: number | undefined): number | undefined {
  return Number.isInteger(value) && Number(value) > 0 ? value : undefined;
}
