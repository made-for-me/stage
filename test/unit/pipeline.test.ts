import { describe, expect, it } from "vitest";
import { describePreviewPipeline } from "../../src/core/pipeline.js";

describe("describePreviewPipeline", () => {
  it("returns a stable label for a target", () => {
    expect(describePreviewPipeline({ label: "demo" })).toBe("preview:demo");
  });
});
