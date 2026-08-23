import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { StageSceneStore } from "../../src/control/scene-store.js";

const onePixelPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

describe("Stage scene store", () => {
  it("persists and replaces a branch scene for one commit and route", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "stage-scenes-"));
    const store = new StageSceneStore(root);
    const input = {
      projectId: "clubhall",
      branch: "ar2/arena-ui-sdk57",
      sha: "abc123",
      title: "Arena",
      route: "/arena",
      imageDataUrl: onePixelPng,
      width: 390,
      height: 844,
    };

    const first = await store.save(input);
    const second = await store.save({ ...input, title: "Arena refreshed" });
    const scenes = await store.list({ projectId: "clubhall", sha: "abc123" });
    const image = await store.readImage(first.id);

    expect(second.id).toBe(first.id);
    expect(scenes).toHaveLength(1);
    expect(scenes[0]?.title).toBe("Arena refreshed");
    expect(scenes[0]?.imageUrl).toBe(`/api/scenes/${first.id}/image`);
    expect(image?.mimeType).toBe("image/png");
    expect(image?.content.length).toBeGreaterThan(0);
  });

  it("keeps screenshots from previous commits out of the current scene query", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "stage-scenes-"));
    const store = new StageSceneStore(root);
    await store.save({
      projectId: "clubhall",
      branch: "main",
      sha: "old-sha",
      title: "Home",
      route: "/home",
      imageDataUrl: onePixelPng,
    });

    expect(await store.list({ projectId: "clubhall", branch: "main", sha: "new-sha" })).toEqual([]);
  });
});
