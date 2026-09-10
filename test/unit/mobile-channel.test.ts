import { describe, expect, it } from "vitest";
import { branchChannel } from "../../scripts/lib/channel.mjs";

describe("Stage mobile update channels", () => {
  it("turns Git branch names into valid stable EAS channels", () => {
    const channel = branchChannel("ar2/arena-ui-sdk57-e69f");
    expect(channel).toMatch(/^[a-z\d][a-z\d._-]*$/);
    expect(channel).toBe("branch-ar2-arena-ui-sdk57-e69f-kewjrl");
  });

  it("avoids collisions after branch-name normalization", () => {
    expect(branchChannel("feature/a-b")).not.toBe(branchChannel("feature-a/b"));
  });
});
