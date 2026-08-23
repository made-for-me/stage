import type { StageConfig } from "./src/types/index.js";

const config: StageConfig = {
  workspaceRoot: process.env.STAGE_WORKTREE_ROOT ?? "../.stage-worktrees",
  projects: [
    {
      id: "clubhall",
      name: "ClubHall",
      repository: "accollier/clubhall",
      localRoot: process.env.STAGE_CLUBHALL_ROOT ?? "../clubhall",
      appRoot: "apps/mobile",
      baselineBranch: "ar2/arena-ui-sdk57-e69f",
      trackedBranches: ["main", "codex/flighty-native-design-lab", "codex/world-first-clubhall-ui"],
      scheme: "clubhall",
      host: process.env.STAGE_METRO_HOST ?? "127.0.0.1",
      startingPort: 8081,
      prepareCommand: ["pnpm", "install", "--prefer-offline", "--frozen-lockfile"],
      preview: {
        mode: "stage",
        scenario: "tennis-ready",
        route: "/(app)/(hub)",
      },
    },
  ],
};

export default config;
