import type { Quest } from "../src/control/ops-store.js";
export type CodingContract = {
  repository: string;
  runRoot: string;
  baseSha: string;
  ownedPaths: string[];
  executor: string[];
  verify: string[];
  evidence?: string[];
  dependencies?: string[];
  timeoutMs: number;
};
export type CodingReceipt = {
  version: number;
  questId: string;
  runId: string;
  baseSha: string;
  branch: string;
  worktree: string;
  sha: string;
  status: "code_ready" | "review";
  startedAt: string;
};
export type StageRequest = (body?: Record<string, unknown>, endpoint?: string) => Promise<unknown>;
export function validateContract(contract: unknown): CodingContract;
export function assertOwned(files: string[], owned: string[]): void;
export function runCommand(
  args: string[],
  options?: {
    cwd?: string;
    signal?: AbortSignal;
    timeoutMs?: number;
    input?: string;
    log?: string;
    env?: NodeJS.ProcessEnv;
  },
): Promise<string>;
export function stageClient(base: string, token: string): StageRequest;
export function runQuest(input: {
  quest: Quest;
  contract: CodingContract;
  request: StageRequest;
  signal?: AbortSignal;
  heartbeatMs?: number;
}): Promise<CodingReceipt>;
