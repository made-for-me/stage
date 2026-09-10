import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { StageCaptureStore } from "../../src/control/capture-store.js";

describe("Stage capture store", () => {
  it("queues idempotently by branch commit and survives status changes", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "stage-captures-"));
    const store = new StageCaptureStore(root);
    const input = { projectId: "clubhall", branch: "main", sha: "abc123" };

    const first = await store.request(input);
    const repeated = await store.request(input);
    const claimed = await store.next("clubhall");
    const complete = await store.update(first.id, "completed");

    expect(repeated.id).toBe(first.id);
    expect(claimed?.status).toBe("capturing");
    expect(complete.status).toBe("completed");
    expect(await store.next("clubhall")).toBeNull();
  });

  it("allows a completed commit to be captured again", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "stage-captures-"));
    const store = new StageCaptureStore(root);
    const input = { projectId: "clubhall", branch: "main", sha: "abc123" };
    const first = await store.request(input);
    await store.update(first.id, "completed");

    expect((await store.request(input)).status).toBe("queued");
  });
});
