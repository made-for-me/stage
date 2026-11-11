import { execFile } from "node:child_process";
import { realpath } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { Quest, QuestExecutionTarget } from "./ops-store.js";

const execFileAsync = promisify(execFile);

/** Prevent inherited Git overrides from redirecting preflight or the configured local command. */
export function workerEnvironment(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) =>
        !key.startsWith("GIT_") && !["STAGE_AGENT_TOKEN", "STAGE_OPERATOR_TOKEN"].includes(key),
    ),
  );
}

/** Read-only launch preconditions. This does not isolate the command's subsequent filesystem access. */
export async function verifyExecutionTarget(
  cwd: string,
  quest: Pick<Quest, "branch" | "executionTarget">,
  signal: AbortSignal,
): Promise<QuestExecutionTarget> {
  const target = quest.executionTarget;
  if (
    !target ||
    !path.isAbsolute(target.repositoryRoot) ||
    target.branch !== quest.branch ||
    !/^[a-f0-9]{40,64}$/.test(target.sha) ||
    (target.worktree &&
      (!path.isAbsolute(target.worktree.root) ||
        !path.isAbsolute(target.worktree.commonDirectory) ||
        !target.worktree.sessionId ||
        !target.worktree.sessionInstanceId))
  )
    throw new Error(
      "This quest has no valid execution pin. Request an operator revision before running it.",
    );
  const git = (args: string[]) => executionGit(cwd, args, signal);
  let expectedRoot: string;
  let actualRoot: string;
  try {
    expectedRoot = await realpath(target.worktree?.root ?? target.repositoryRoot);
    actualRoot = await realpath(await git(["rev-parse", "--show-toplevel"]));
  } catch {
    signal.throwIfAborted();
    throw new Error(
      "The configured worker directory must be inside the quest's pinned Git checkout.",
    );
  }
  if (actualRoot !== expectedRoot)
    throw new Error(
      "Wrong Git checkout. Configure STAGE_WORKER_CWD inside this quest's pinned repository; no command was started.",
    );
  if (target.worktree) {
    const sourceRoot = await realpath(target.repositoryRoot);
    const sourceTop = await realpath(
      await executionGit(sourceRoot, ["rev-parse", "--show-toplevel"], signal),
    );
    const sourceCommon = await gitCommonDirectory(sourceRoot, signal);
    const worktreeCommon = await gitCommonDirectory(cwd, signal);
    if (
      sourceTop !== sourceRoot ||
      actualRoot === sourceRoot ||
      sourceCommon !== target.worktree.commonDirectory ||
      worktreeCommon !== sourceCommon
    )
      throw new Error("Managed worktree does not belong to the pinned source repository.");
    if ((await git(["rev-parse", "--abbrev-ref", "HEAD"])) !== "HEAD")
      throw new Error("Managed preview execution requires its pinned detached Git HEAD.");
  } else {
    let actualBranch: string;
    try {
      actualBranch = await git(["symbolic-ref", "--quiet", "HEAD"]);
    } catch {
      signal.throwIfAborted();
      throw new Error(
        "Detached Git HEAD cannot run this quest. Select a managed execution session or check out its named branch without discarding local changes.",
      );
    }
    if (actualBranch !== `refs/heads/${target.branch}`)
      throw new Error(
        `Wrong Git branch. This revision expects ${target.branch}; no checkout or reset was performed.`,
      );
  }
  const actualSha = await git(["rev-parse", "--verify", "HEAD"]);
  if (actualSha !== target.sha)
    throw new Error(
      `Git base changed. This revision expects ${target.sha.slice(0, 12)}. Request an operator revision; no command was started.`,
    );
  const dirty = await git([
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
    "--ignore-submodules=none",
  ]);
  if (dirty)
    throw new Error(
      "The pinned checkout has staged, unstaged or untracked changes. Preserve them and prepare a clean checkout before retrying; no reset or commit was performed.",
    );
  signal.throwIfAborted();
  return {
    ...target,
    repositoryRoot: await realpath(target.repositoryRoot),
    ...(target.worktree ? { worktree: { ...target.worktree, root: expectedRoot } } : {}),
  };
}

export async function gitCommonDirectory(root: string, signal?: AbortSignal): Promise<string> {
  const common = await executionGit(root, ["rev-parse", "--git-common-dir"], signal);
  return realpath(path.resolve(root, common));
}

async function executionGit(root: string, args: string[], signal?: AbortSignal): Promise<string> {
  const result = await execFileAsync(
    "git",
    [
      "--no-optional-locks",
      "-c",
      "core.fsmonitor=false",
      "-c",
      "core.untrackedCache=false",
      "-C",
      root,
      ...args,
    ],
    { env: workerEnvironment(), signal, timeout: 10_000, maxBuffer: 2 * 1024 * 1024 },
  );
  return result.stdout.trim();
}
