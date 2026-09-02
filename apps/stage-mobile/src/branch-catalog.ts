import { branchChannel } from "./channel";
import type { StageBranch, StageRuntimeConfig } from "./types";

type StageSnapshot = {
  branches?: Array<Omit<StageBranch, "channel">>;
};

export function embeddedBranches(config: StageRuntimeConfig): StageBranch[] {
  return config.trackedBranches.map((name) => ({
    projectId: config.projectId,
    name,
    sha: null,
    sdkVersion: name === config.baselineBranch ? "57" : null,
    compatibility: name === config.baselineBranch ? "compatible" : "unknown",
    availability: "available",
    channel: branchChannel(name),
  }));
}

export async function fetchBranches(
  config: StageRuntimeConfig,
  signal?: AbortSignal,
): Promise<StageBranch[]> {
  if (!config.apiUrl) return embeddedBranches(config);

  const response = await fetch(new URL("/api/stage", config.apiUrl), {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Stage respondeu HTTP ${response.status}.`);

  const snapshot = (await response.json()) as StageSnapshot;
  if (!Array.isArray(snapshot.branches)) throw new Error("Catálogo de branches inválido.");

  return snapshot.branches
    .filter((branch) => branch.projectId === config.projectId)
    .map((branch) => ({ ...branch, channel: branchChannel(branch.name) }));
}
