import Constants from "expo-constants";
import type { StageRuntimeConfig } from "./types";

const fallback: StageRuntimeConfig = {
  projectId: "clubhall",
  channel: "stage-shell",
  apiUrl: null,
  baselineBranch: "ar2/arena-ui-sdk57-e69f",
  trackedBranches: ["ar2/arena-ui-sdk57-e69f"],
};

export function runtimeConfig(): StageRuntimeConfig {
  const value = Constants.expoConfig?.extra?.stage as Partial<StageRuntimeConfig> | undefined;
  return {
    projectId: value?.projectId ?? fallback.projectId,
    channel: value?.channel ?? fallback.channel,
    apiUrl: typeof value?.apiUrl === "string" ? value.apiUrl : fallback.apiUrl,
    baselineBranch: value?.baselineBranch ?? fallback.baselineBranch,
    trackedBranches:
      Array.isArray(value?.trackedBranches) && value.trackedBranches.length > 0
        ? value.trackedBranches
        : fallback.trackedBranches,
  };
}
