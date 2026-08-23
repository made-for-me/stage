import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadStageConfig } from "../../src/control/config.js";

describe("Stage config", () => {
  it("loads a TypeScript config and resolves local roots", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "stage-config-"));
    await writeFile(
      path.join(root, "stage.config.ts"),
      `export default { projects: [{ id: "app", name: "App", repository: "o/r", localRoot: "../app", appRoot: "apps/mobile", baselineBranch: "main" }] };`,
    );

    const loaded = await loadStageConfig(root);
    expect(loaded?.config.projects[0]?.id).toBe("app");
    expect(loaded?.config.projects[0]?.localRoot).toBe(path.resolve(root, "../app"));
    expect(loaded?.config.workspaceRoot).toBe(path.resolve(root, ".stage-worktrees"));
  });
});
