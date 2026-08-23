/**
 * Shared public contracts for Stage preview and exploration primitives.
 */

export type StageVersion = string;

export type StageSessionTarget = "web" | "dev-client";
export type StageSessionStatus = "preparing" | "starting" | "live" | "stopped" | "failed";

export type StageProjectConfig = {
  id: string;
  name: string;
  repository: string;
  localRoot: string;
  appRoot: string;
  baselineBranch: string;
  trackedBranches?: string[];
  host?: string;
  scheme?: string;
  startingPort?: number;
  prepareCommand?: string[];
  webCommand?: string[];
  devClientCommand?: string[];
  preview?: {
    mode: string;
    scenario: string;
    route: string;
    scenes?: Array<{
      title: string;
      route: string;
    }>;
  };
};

export type StageConfig = {
  workspaceRoot?: string;
  sceneRoot?: string;
  projects: StageProjectConfig[];
};

export type StageSceneRef = {
  id: string;
  projectId: string;
  branch: string;
  sha: string;
  title: string;
  route: string;
  capturedAt: string;
  width?: number;
  height?: number;
  imageUrl: string;
};

export type StageBranchRef = {
  projectId: string;
  name: string;
  sha: string | null;
  sdkVersion: string | null;
  runtimeFingerprint: string | null;
  compatibility: "compatible" | "incompatible" | "unknown";
  availability: "available" | "missing-repository" | "missing-ref";
};

export type StageSessionRef = {
  id: string;
  projectId: string;
  branch: string;
  sha: string | null;
  target: StageSessionTarget;
  status: StageSessionStatus;
  port: number;
  worktreeRoot: string;
  previewUrl: string;
  devClientUrl: string;
  sdkVersion: string | null;
  runtimeFingerprint: string | null;
  compatibility: StageBranchRef["compatibility"];
  startedAt: string;
  updatedAt: string;
  error?: string;
  logs: string[];
};

export type PreviewDiagnosticLevel = "info" | "warning" | "error";

export type PreviewDiagnostic = {
  level: PreviewDiagnosticLevel;
  code: string;
  message: string;
  file?: string;
};

export type PreviewProvider = "expo-router" | "unknown";
export type PreviewMode = "ios-preview";

export type PreviewPathAlias = {
  find: string;
  replacement: string;
  exact?: boolean;
};

export type PreviewVariant = {
  name: string;
  title: string;
  params: Record<string, string>;
  mockData: Record<string, unknown>;
  notes?: string;
};

export type PreviewTarget = {
  label: string;
  appName: string;
  projectRoot: string;
  provider: PreviewProvider;
  platform: "web";
  previewMode: PreviewMode;
  route: string;
  routeTitle: string;
  entryFile: string | null;
  variant: string;
  selectedVariant: PreviewVariant | null;
  availableVariants: string[];
  shims: string[];
  assetRoots: string[];
  pathAliases: PreviewPathAlias[];
  diagnostics: PreviewDiagnostic[];
};

export type ScreenMapApp = {
  name: string;
  platform: "web";
  provider: PreviewProvider;
};

export type ScreenMapScreen = {
  id: string;
  title: string;
  route: string;
  status: "ready" | "broken";
};

export type ScreenMapTransition = {
  from: string;
  to: string;
  action: string;
};

export type ScreenMapJourney = {
  id: string;
  screenIds: string[];
};

export type ScreenMapV1 = {
  version: "1";
  app: ScreenMapApp;
  screens: ScreenMapScreen[];
  transitions: ScreenMapTransition[];
  journeys: ScreenMapJourney[];
  diagnostics: PreviewDiagnostic[];
};

export type PreviewManifest = {
  version: "1";
  generatedAt: string;
  target: PreviewTarget;
  entryPath: string | null;
  previewContext: {
    route: string;
    routeTitle: string;
    variant: string;
    previewMode: PreviewMode;
    params: Record<string, string>;
    mockData: Record<string, unknown>;
  };
  files: Record<string, string>;
  shimMap: Record<string, string>;
  assetRoots: string[];
  compatibility: Record<string, PreviewModuleSupport>;
  warnings: PreviewDiagnostic[];
  screenMap: ScreenMapV1;
};

export type PreviewModuleSupport = {
  module: string;
  status: "native" | "shimmed" | "unsupported";
  reason: string;
  replacement?: string;
};

export type PreviewUiState =
  | { kind: "loading"; targetLabel?: string }
  | { kind: "mounted"; targetLabel: string }
  | { kind: "failed"; message: string; code?: string; targetLabel?: string };
