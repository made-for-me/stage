import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LEASE_MS, OpsStore } from "../../src/control/ops-store.js";

const input = {
  title: "Replay",
  objective: "Improve moment navigation",
  criteria: ["Jump to a moment"],
  projectId: "clubhall",
  branch: "main",
  assignedTo: "grok",
};
describe("durable agent operations", () => {
  it("serializes concurrent claims, fences expired workers, and survives restart", async () => {
    let now = 1000;
    const root = await mkdtemp(path.join(os.tmpdir(), "stage-ops-"));
    const store = new OpsStore(root, () => now);
    await Promise.all([store.create(input), store.create(input)]);
    const [a, b] = await Promise.all([store.claim("grok"), store.claim("grok")]);
    expect(a?.id).toBe(b?.id);
    expect(a?.lease?.token).toBe(b?.lease?.token);
    expect(await store.claim("other-worker")).toBeNull();
    expect((await store.snapshot()).quests.filter((q) => q.status === "running")).toHaveLength(1);
    expect(JSON.stringify(await store.snapshot())).not.toContain(a?.lease?.token);
    now += LEASE_MS + 1;
    expect((await store.snapshot()).quests.find((q) => q.id === a?.id)?.stalled).toBe(true);
    const next = await store.claim("grok");
    expect(next?.lease?.token).not.toBe(a?.lease?.token);
    await expect(
      store.withLease(a?.id ?? "", "grok", a?.lease?.token ?? "", () => {}),
    ).rejects.toThrow("lease");
    const reopened = new OpsStore(root, () => now);
    expect((await reopened.snapshot()).quests).toHaveLength(2);
    await reopened.review(next?.id ?? "", "cancel", "Stop this work");
    await expect(
      reopened.withLease(next?.id ?? "", "grok", next?.lease?.token ?? "", () => {}),
    ).rejects.toThrow("lease");
  });
  it("does not silently replace corrupt state or accept incomplete work", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "stage-ops-"));
    const store = new OpsStore(root);
    const quest = await store.create(input);
    await expect(store.review(quest.id, "accept", "Looks good")).rejects.toThrow("evidence");
    await writeFile(path.join(root, "ops.json"), "broken");
    await expect(store.create(input)).rejects.toThrow();
  });
});
