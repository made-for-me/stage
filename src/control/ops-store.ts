import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type QuestStatus = "queued" | "running" | "blocked" | "review" | "done" | "cancelled";
export type QuestExecutionTarget = { repositoryRoot: string; branch: string; sha: string };
export type QuestEvidence = {
  id: string;
  revision: number;
  submittedAt: string;
  agentId: string;
  provenance: "worker-reported" | "simulated" | "legacy";
  executionTarget: QuestExecutionTarget | null;
  summary: string;
  sceneIds: string[];
  sha: string;
  sceneHashes: Record<string, string>;
};
export type QuestReview = {
  id: string;
  revision: number;
  evidenceId: string | null;
  at: string;
  decision: "accept" | "revise" | "cancel";
  note: string;
};
export type ReviewTarget = { revision: number; evidenceId: string | null };
export type Quest = {
  id: string;
  title: string;
  objective: string;
  criteria: string[];
  projectId: string;
  branch: string;
  assignedTo: string;
  status: QuestStatus;
  createdAt: string;
  updatedAt: string;
  lease?: { agentId: string; token: string; expiresAt: number; instanceId?: string };
  revision: number;
  executionTarget: QuestExecutionTarget | null;
  evidence: QuestEvidence | null;
  submissions: QuestEvidence[];
  reviews: QuestReview[];
  events: { id: string; at: string; actor: string; message: string }[];
};
type State = { version: 1; quests: Quest[]; agents: { id: string; seenAt: number }[] };
export const LEASE_MS = 90_000;

/** One control-plane process owns this store. Serialized writes + atomic rename preserve claims. */
export class OpsStore {
  #tail: Promise<unknown> = Promise.resolve();
  constructor(
    readonly root: string,
    readonly now = Date.now,
  ) {}
  async #read(): Promise<State> {
    try {
      const value = JSON.parse(await readFile(path.join(this.root, "ops.json"), "utf8"));
      if (value.version !== 1 || !Array.isArray(value.quests) || !Array.isArray(value.agents))
        throw new Error("Invalid operations store; restore the saved state before continuing.");
      // Additive migration: legacy evidence remains inspectable but is not upgraded to verified work.
      for (const q of value.quests) {
        q.revision ??= 1;
        q.executionTarget ??= null;
        q.reviews ??= [];
        if (q.evidence && !q.evidence.id) {
          q.evidence = {
            ...q.evidence,
            id: `legacy-${q.id}`,
            revision: q.revision,
            submittedAt: q.updatedAt,
            agentId: q.assignedTo,
            provenance: "legacy",
          };
        }
        q.submissions ??= q.evidence ? [q.evidence] : [];
        if (q.evidence) q.evidence.executionTarget ??= null;
        for (const submission of q.submissions) submission.executionTarget ??= null;
      }
      return value;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return { version: 1, quests: [], agents: [] };
      throw error;
    }
  }
  #transaction<T>(fn: (state: State) => T | Promise<T>): Promise<T> {
    const next = this.#tail.then(async () => {
      const state = await this.#read();
      const result = await fn(state);
      await mkdir(this.root, { recursive: true });
      const temporary = path.join(this.root, `ops-${randomUUID()}.tmp`);
      await writeFile(temporary, JSON.stringify(state, null, 2), { mode: 0o600 });
      await rename(temporary, path.join(this.root, "ops.json"));
      return result;
    });
    this.#tail = next.catch(() => {});
    return next;
  }
  async snapshot() {
    await this.#tail;
    const state = await this.#read();
    return {
      quests: state.quests.map(({ lease, ...quest }) => ({
        ...quest,
        lease: lease ? { agentId: lease.agentId, expiresAt: lease.expiresAt } : undefined,
        stalled: quest.status === "running" && (!lease || lease.expiresAt <= this.now()),
      })),
      agents: state.agents.map((agent) => ({
        ...agent,
        online: this.now() - agent.seenAt < LEASE_MS,
      })),
    };
  }
  #event(q: Quest, actor: string, message: string) {
    q.updatedAt = new Date(this.now()).toISOString();
    q.events.push({ id: randomUUID(), at: q.updatedAt, actor, message });
  }
  create(
    input: Pick<
      Quest,
      "title" | "objective" | "criteria" | "projectId" | "branch" | "assignedTo"
    > & { executionTarget?: QuestExecutionTarget },
  ) {
    return this.#transaction((state) => {
      const at = new Date(this.now()).toISOString();
      const quest: Quest = {
        ...input,
        id: randomUUID(),
        status: "queued",
        createdAt: at,
        updatedAt: at,
        revision: 1,
        executionTarget: input.executionTarget ?? null,
        evidence: null,
        submissions: [],
        reviews: [],
        events: [],
      };
      this.#event(quest, "operator", "Quest queued. Waiting for the assigned agent.");
      state.quests.unshift(quest);
      return quest;
    });
  }
  claim(agentId: string, instanceId?: string) {
    return this.#transaction((state) => {
      const agent = state.agents.find((a) => a.id === agentId);
      if (agent) agent.seenAt = this.now();
      else state.agents.push({ id: agentId, seenAt: this.now() });
      const owned = state.quests.find(
        (q) =>
          q.status === "running" && q.lease?.agentId === agentId && q.lease.expiresAt > this.now(),
      );
      if (owned) return owned.lease?.instanceId === instanceId ? owned : null;
      const q = [...state.quests]
        .reverse()
        .find(
          (q) =>
            q.assignedTo === agentId &&
            (q.status === "queued" ||
              (q.status === "running" && (!q.lease || q.lease.expiresAt <= this.now()))),
        );
      if (!q) return null;
      q.status = "running";
      q.lease = { agentId, token: randomUUID(), expiresAt: this.now() + LEASE_MS, instanceId };
      this.#event(q, agentId, "Agent claimed the quest.");
      return q;
    });
  }
  withLease<T>(
    id: string,
    agentId: string,
    token: string,
    operation: (q: Quest) => Promise<T> | T,
  ): Promise<T> {
    return this.#transaction(async (state) => {
      const q = state.quests.find((q) => q.id === id);
      if (
        !q ||
        q.status !== "running" ||
        q.lease?.agentId !== agentId ||
        q.lease.token !== token ||
        q.lease.expiresAt <= this.now()
      )
        throw new Error("Quest lease expired or is not owned by this worker. Claim work again.");
      const result = await operation(q);
      if (q.lease) q.lease.expiresAt = this.now() + LEASE_MS;
      const agent = state.agents.find((a) => a.id === agentId);
      if (agent) agent.seenAt = this.now();
      return result;
    });
  }
  record(q: Quest, actor: string, message: string) {
    this.#event(q, actor, message);
  }
  submit(
    q: Quest,
    evidence: Omit<
      QuestEvidence,
      "id" | "revision" | "submittedAt" | "agentId" | "executionTarget"
    >,
  ) {
    const submission: QuestEvidence = {
      ...evidence,
      id: randomUUID(),
      revision: q.revision,
      submittedAt: new Date(this.now()).toISOString(),
      agentId: q.assignedTo,
      executionTarget: q.executionTarget,
    };
    q.evidence = submission;
    q.submissions.push(submission);
    q.status = "review";
    q.lease = undefined;
    this.#event(
      q,
      q.assignedTo,
      `Revision ${q.revision} submitted (${evidence.provenance}). Waiting for operator review.`,
    );
    return submission;
  }
  review(
    id: string,
    decision: "accept" | "revise" | "cancel",
    note: string,
    target?: ReviewTarget,
    executionTarget?: QuestExecutionTarget,
  ) {
    return this.#transaction((state) => {
      const q = state.quests.find((q) => q.id === id);
      if (!q) throw new Error("Quest not found.");
      if (
        target &&
        (target.revision !== q.revision || target.evidenceId !== (q.evidence?.id ?? null))
      )
        throw new Error("Quest changed since you opened it. Refresh before reviewing.");
      if (q.status === "done" || q.status === "cancelled")
        throw new Error("Quest is already closed.");
      if (decision === "accept" && (q.status !== "review" || !q.evidence))
        throw new Error("Review evidence before accepting.");
      if (decision === "accept" && q.evidence?.provenance !== "worker-reported")
        throw new Error(
          "Simulated or legacy evidence cannot be accepted. Request a real worker revision.",
        );
      if (decision === "revise" && !["review", "blocked"].includes(q.status))
        throw new Error("Only review or blocked quests can be revised.");
      q.reviews.push({
        id: randomUUID(),
        revision: q.revision,
        evidenceId: q.evidence?.id ?? null,
        at: new Date(this.now()).toISOString(),
        decision,
        note,
      });
      q.status = decision === "accept" ? "done" : decision === "cancel" ? "cancelled" : "queued";
      q.lease = undefined;
      if (decision === "revise") {
        q.evidence = null;
        q.revision += 1;
        q.executionTarget = executionTarget ?? null;
      }
      this.#event(q, "operator", `${decision}: ${note}`);
      return q;
    });
  }
}
