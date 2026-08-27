import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { StageBranchRef, StageProjectConfig } from "../types/index.js";

const execFileAsync = promisify(execFile);

export async function listProjectBranches(project: StageProjectConfig): Promise<StageBranchRef[]> {
  if (!existsSync(path.join(project.localRoot, ".git"))) {
    return configuredBranches(project).map((name) =>
      missingBranch(project.id, name, "missing-repository"),
    );
  }

  const names = new Set(configuredBranches(project));
  if (project.discoverBranches) {
    const discovered = await git(project.localRoot, [
      "for-each-ref",
      "--format=%(refname:short)",
      "refs/heads",
      "refs/remotes/origin",
    ]);
    for (const line of discovered.split("\n")) {
      const name = normalizeBranchName(line.trim());
      if (name && name !== "HEAD") {
        names.add(name);
      }
    }
  }

  const baseline = await inspectBranch(project, project.baselineBranch);
  const branches = await Promise.all([...names].map((name) => inspectBranch(project, name)));
  return branches
    .map<StageBranchRef>((branch) => ({
      ...branch,
      compatibility:
        !branch.runtimeFingerprint || !baseline.runtimeFingerprint
          ? "unknown"
          : branch.runtimeFingerprint === baseline.runtimeFingerprint
            ? "compatible"
            : "incompatible",
    }))
    .sort((left, right) => branchRank(project, left.name) - branchRank(project, right.name));
}

export async function ensureWorktree(options: {
  project: StageProjectConfig;
  branch: string;
  destination: string;
}): Promise<string> {
  const { project, branch, destination } = options;
  const ref = await resolveRef(project.localRoot, branch);
  const sha = (await git(project.localRoot, ["rev-parse", ref])).trim();
  if (existsSync(path.join(destination, ".git"))) {
    await git(destination, ["reset", "--hard", sha]);
    return destination;
  }
  await git(project.localRoot, ["worktree", "add", "--detach", destination, sha]);
  return destination;
}

async function inspectBranch(project: StageProjectConfig, name: string): Promise<StageBranchRef> {
  try {
    const ref = await resolveRef(project.localRoot, name);
    const sha = (await git(project.localRoot, ["rev-parse", ref])).trim();
    const packageText = await showOptional(
      project.localRoot,
      ref,
      path.posix.join(project.appRoot, "package.json"),
    );
    const sdkVersion = packageText ? readExpoVersion(packageText) : null;
    const fingerprintInputs = await Promise.all([
      Promise.resolve(packageText ?? ""),
      showOptional(project.localRoot, ref, path.posix.join(project.appRoot, "app.json")),
      showOptional(project.localRoot, ref, path.posix.join(project.appRoot, "app.config.ts")),
      showOptional(project.localRoot, ref, "pnpm-lock.yaml"),
      treeHashOptional(project.localRoot, ref, path.posix.join(project.appRoot, "ios")),
      treeHashOptional(project.localRoot, ref, path.posix.join(project.appRoot, "android")),
    ]);
    const runtimeFingerprint = createHash("sha256")
      .update(fingerprintInputs.join("\n---stage-runtime---\n"))
      .digest("hex")
      .slice(0, 12);

    return {
      projectId: project.id,
      name,
      sha,
      sdkVersion,
      runtimeFingerprint,
      compatibility: "unknown",
      availability: "available",
    };
  } catch {
    return missingBranch(project.id, name, "missing-ref");
  }
}

async function resolveRef(root: string, branch: string): Promise<string> {
  for (const candidate of [branch, `origin/${branch}`]) {
    try {
      await git(root, ["rev-parse", "--verify", candidate]);
      return candidate;
    } catch {
      // Try the next explicit ref.
    }
  }
  throw new Error(`Branch ${branch} is not available in ${root}. Run git fetch --all first.`);
}

async function showOptional(root: string, ref: string, file: string): Promise<string> {
  try {
    return await git(root, ["show", `${ref}:${file}`]);
  } catch {
    return "";
  }
}

async function treeHashOptional(root: string, ref: string, treePath: string): Promise<string> {
  try {
    return (await git(root, ["rev-parse", `${ref}:${treePath}`])).trim();
  } catch {
    return "";
  }
}

async function git(root: string, args: string[]): Promise<string> {
  const result = await execFileAsync("git", ["-C", root, ...args], {
    maxBuffer: 16 * 1024 * 1024,
  });
  return result.stdout;
}

function configuredBranches(project: StageProjectConfig): string[] {
  return [...new Set([project.baselineBranch, ...(project.trackedBranches ?? [])])];
}

function normalizeBranchName(name: string): string {
  if (name === "origin" || name === "origin/HEAD") {
    return "";
  }
  return name.startsWith("origin/") ? name.slice("origin/".length) : name;
}

function readExpoVersion(packageText: string): string | null {
  try {
    const packageJson = JSON.parse(packageText) as { dependencies?: Record<string, string> };
    return packageJson.dependencies?.expo?.replace(/^[^0-9]*/, "") ?? null;
  } catch {
    return null;
  }
}

function missingBranch(
  projectId: string,
  name: string,
  availability: StageBranchRef["availability"],
): StageBranchRef {
  return {
    projectId,
    name,
    sha: null,
    sdkVersion: null,
    runtimeFingerprint: null,
    compatibility: "unknown",
    availability,
  };
}

function branchRank(project: StageProjectConfig, name: string): number {
  if (name === project.baselineBranch) {
    return 0;
  }
  const configured = project.trackedBranches?.indexOf(name) ?? -1;
  return configured >= 0 ? configured + 1 : 1000 + name.localeCompare(project.baselineBranch);
}
