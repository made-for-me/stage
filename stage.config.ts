import type { StageConfig } from "./src/types/index.js";

const baselineBranch = process.env.STAGE_BASELINE_BRANCH ?? "ar2/arena-ui-sdk57-e69f";
const trackedBranches = process.env.STAGE_TRACKED_BRANCHES
  ? process.env.STAGE_TRACKED_BRANCHES.split(",")
      .map((branch) => branch.trim())
      .filter(Boolean)
  : ["main", "codex/flighty-native-design-lab", "codex/world-first-clubhall-ui"];

const config: StageConfig = {
  workspaceRoot: process.env.STAGE_WORKTREE_ROOT ?? "../.stage-worktrees",
  sceneRoot: process.env.STAGE_SCENE_ROOT ?? "../.stage-scenes",
  projects: [
    {
      id: "clubhall",
      name: "ClubHall",
      repository: "accollier/clubhall",
      localRoot: process.env.STAGE_CLUBHALL_ROOT ?? "../clubhall",
      appRoot: "apps/mobile",
      baselineBranch,
      trackedBranches,
      scheme: "clubhall",
      host: process.env.STAGE_METRO_HOST ?? "127.0.0.1",
      startingPort: 8081,
      prepareCommand: ["pnpm", "install", "--prefer-offline", "--frozen-lockfile"],
      preview: {
        mode: "stage",
        scenario: "tennis-ready",
        route: "/(app)/(hub)",
        scenes: [
          { title: "Home", route: "/(app)/(hub)" },
          { title: "Arena", route: "/(app)/(arena)" },
          { title: "Worlds", route: "/(app)/(worlds)" },
          { title: "Profile", route: "/(app)/(profile)" },
        ],
      },
    },
  ],
};

export default config;
