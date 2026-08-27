import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { branchChannel } from "./lib/channel.mjs";

const stageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clubhallRoot = process.env.STAGE_CLUBHALL_ROOT;
const branch = valueAfter("--branch") ?? process.env.STAGE_BRANCH;
const requestedRef = valueAfter("--ref") ?? process.env.STAGE_REF ?? branch;
const prepareOnly = process.argv.includes("--prepare-only");

if (!clubhallRoot || !branch) {
  fail(
    "Usage: STAGE_CLUBHALL_ROOT=/repo STAGE_EAS_PROJECT_ID=<uuid> pnpm preview:clubhall -- --branch <name>",
  );
}
if (!prepareOnly && !process.env.STAGE_EAS_PROJECT_ID) {
  fail("STAGE_EAS_PROJECT_ID is required to publish an EAS Update preview.");
}

const source = path.resolve(clubhallRoot);
const ref = resolveRef(source, requestedRef);
const sha = git(source, ["rev-parse", ref]).trim();
const temporaryRoot = mkdtempSync(path.join(tmpdir(), "stage-clubhall-preview-"));
const worktree = path.join(temporaryRoot, "clubhall");

try {
  git(source, ["worktree", "add", "--detach", worktree, sha]);
  const mobileRoot = path.join(worktree, "apps/mobile");
  prepareMobileProject(mobileRoot, branch, sha);

  if (prepareOnly) {
    console.log(`Prepared ${branch} at ${worktree}`);
    console.log("The temporary worktree is retained for inspection.");
    process.exitCode = 0;
  } else {
    run("pnpm", ["install", "--no-frozen-lockfile"], worktree);
    run(
      "pnpm",
      [
        "dlx",
        "eas-cli@latest",
        "update",
        "--channel",
        branchChannel(branch),
        "--message",
        `Stage preview ${branch}@${sha.slice(0, 7)}`,
        "--environment",
        "preview",
        "--non-interactive",
      ],
      mobileRoot,
    );
  }
} finally {
  if (!prepareOnly) {
    try {
      git(source, ["worktree", "remove", "--force", worktree]);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  }
}

function prepareMobileProject(mobileRoot, branchName, commitSha) {
  const packagePath = path.join(mobileRoot, "package.json");
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
  const expoVersion = packageJson.dependencies?.expo ?? "";
  if (!/^~?57\./.test(expoVersion)) {
    fail(
      `${branchName} uses Expo ${expoVersion || "unknown"}; Stage TestFlight runtime requires SDK 57.`,
    );
  }

  packageJson.main = "stage-entry.tsx";
  packageJson.dependencies = {
    ...packageJson.dependencies,
    "expo-updates": "~57.0.18",
  };
  writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

  cpSync(
    path.join(stageRoot, "templates/clubhall/stage-entry.tsx"),
    path.join(mobileRoot, "stage-entry.tsx"),
  );
  cpSync(
    path.join(stageRoot, "templates/clubhall/stage-overlay.tsx"),
    path.join(mobileRoot, "stage-overlay.tsx"),
  );

  const original = JSON.parse(readFileSync(path.join(mobileRoot, "app.json"), "utf8")).expo;
  const projectId = process.env.STAGE_EAS_PROJECT_ID ?? "00000000-0000-4000-8000-000000000000";
  const channel = branchChannel(branchName);
  const stageExtra = {
    projectId: "clubhall",
    branch: branchName,
    sha: commitSha,
    channel,
    ...(process.env.EXPO_PUBLIC_STAGE_API_URL
      ? { apiUrl: process.env.EXPO_PUBLIC_STAGE_API_URL }
      : {}),
    baselineBranch: process.env.STAGE_BASELINE_BRANCH ?? "ar2/arena-ui-sdk57-e69f",
    trackedBranches: trackedBranches(branchName),
  };
  const config = {
    ...original,
    name: "Stage",
    slug: "stage-mobile",
    owner: process.env.STAGE_EXPO_OWNER ?? "madeforme",
    scheme: "stage",
    runtimeVersion: "stage-clubhall-sdk57-v1",
    updates: {
      url: `https://u.expo.dev/${projectId}`,
      requestHeaders: { "expo-channel-name": "stage-shell" },
    },
    ios: {
      ...original.ios,
      supportsTablet: false,
      bundleIdentifier: process.env.STAGE_IOS_BUNDLE_ID ?? "com.madeforme.stage",
    },
    extra: {
      ...original.extra,
      eas: { projectId },
      stage: stageExtra,
    },
  };
  writeFileSync(
    path.join(mobileRoot, "app.config.js"),
    `module.exports = ${JSON.stringify({ expo: config }, null, 2)};\n`,
  );
}

function trackedBranches(current) {
  const configured = process.env.STAGE_TRACKED_BRANCHES?.split(",").map((value) => value.trim());
  return [...new Set([...(configured?.filter(Boolean) ?? []), current])];
}

function resolveRef(root, name) {
  for (const candidate of [name, `origin/${name}`]) {
    try {
      git(root, ["rev-parse", "--verify", candidate]);
      return candidate;
    } catch {
      // Continue to the explicit remote ref.
    }
  }
  fail(`Branch ${name} is unavailable. Run git fetch --all first.`);
}

function git(root, args) {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function run(command, args, cwd) {
  execFileSync(command, args, { cwd, stdio: "inherit", env: process.env });
}

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
