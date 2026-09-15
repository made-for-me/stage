import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type QuestStatus = "queued" | "running" | "blocked" | "review" | "done" | "cancelled";
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
  lease?: { agentId: string; token: string; expiresAt: number };
  evidence: {
    summary: string;
    sceneIds: string[];
    sha: string;
    sceneHashes: Record<string, string>;
  } | null;
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
    input: Pick<Quest, "title" | "objective" | "criteria" | "projectId" | "branch" | "assignedTo">,
  ) {
    return this.#transaction((state) => {
      const at = new Date(this.now()).toISOString();
      const quest: Quest = {
        ...input,
        id: randomUUID(),
        status: "queued",
        createdAt: at,
        updatedAt: at,
        evidence: null,
        events: [],
      };
      this.#event(quest, "operator", "Quest queued. Waiting for the assigned agent.");
      state.quests.unshift(quest);
      return quest;
    });
  }
  claim(agentId: string) {
    return this.#transaction((state) => {
      const agent = state.agents.find((a) => a.id === agentId);
      if (agent) agent.seenAt = this.now();
      else state.agents.push({ id: agentId, seenAt: this.now() });
      const owned = state.quests.find(
        (q) =>
          q.status === "running" && q.lease?.agentId === agentId && q.lease.expiresAt > this.now(),
      );
      if (owned) return owned;
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
      q.lease = { agentId, token: randomUUID(), expiresAt: this.now() + LEASE_MS };
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
  review(id: string, decision: "accept" | "revise" | "cancel", note: string) {
    return this.#transaction((state) => {
      const q = state.quests.find((q) => q.id === id);
      if (!q) throw new Error("Quest not found.");
      if (q.status === "done" || q.status === "cancelled")
        throw new Error("Quest is already closed.");
      if (decision === "accept" && (q.status !== "review" || !q.evidence))
        throw new Error("Review evidence before accepting.");
      if (decision === "revise" && !["review", "blocked"].includes(q.status))
        throw new Error("Only review or blocked quests can be revised.");
      q.status = decision === "accept" ? "done" : decision === "cancel" ? "cancelled" : "queued";
      q.lease = undefined;
      if (decision === "revise") q.evidence = null;
      this.#event(q, "operator", `${decision}: ${note}`);
      return q;
    });
  }
}
