export type Compatibility = "compatible" | "incompatible" | "unknown";

export type StageBranch = {
  projectId: string;
  name: string;
  sha: string | null;
  sdkVersion: string | null;
  compatibility: Compatibility;
  availability: "available" | "missing-repository" | "missing-ref";
  channel: string;
};

export type StageRuntimeConfig = {
  projectId: string;
  channel: string;
  apiUrl: string | null;
  baselineBranch: string;
  trackedBranches: string[];
};
