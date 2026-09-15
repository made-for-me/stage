import type { IncomingMessage, ServerResponse } from "node:http";
import type { OpsStore } from "../control/ops-store.js";
import type { StageSessionManager } from "../control/session-manager.js";
import { deviceHubStatus } from "./device-hub.js";
import type { OpsPrincipal } from "./ops-auth.js";

export const opsCapabilities = {
  version: 1,
  endpoint: "/api/ops/actions",
  method: "POST",
  authentication:
    "Authorization: Bearer <STAGE_AGENT_TOKEN>. The operator uses STAGE_OPERATOR_TOKEN.",
  workflow:
    "claim → heartbeat every 30s → capture/session → upload scenes → submit → operator review",
  leaseMs: 90000,
  actions: {
    create: {
      role: "operator",
      fields: ["title", "objective", "criteria: string[]", "projectId", "branch", "assignedTo"],
    },
    claim: { role: "agent", fields: ["agentId"] },
    heartbeat: { role: "agent", fields: ["questId", "agentId", "leaseToken"] },
    progress: { role: "agent", fields: ["questId", "agentId", "leaseToken", "message"] },
    capture: { role: "agent", fields: ["questId", "agentId", "leaseToken"] },
    session: {
      role: "agent",
      fields: ["questId", "agentId", "leaseToken", "target: web | dev-client"],
    },
    submit: {
      role: "agent",
      fields: ["questId", "agentId", "leaseToken", "summary", "sceneIds: string[]"],
    },
    block: { role: "agent", fields: ["questId", "agentId", "leaseToken", "message"] },
    review: { role: "operator", fields: ["questId", "decision: accept | revise | cancel", "note"] },
  },
  reads: ["GET /api/ops", "GET /api/stage", "GET /api/ops/devices"],
  evidenceUpload: {
    endpoint: "POST /api/scenes",
    fields: ["projectId", "branch", "sha", "route", "title", "imageDataUrl"],
    description:
      "Upload actual captures using the branch SHA returned by capture/session. Submit returned scene IDs. A screenshot is evidence for human review, not proof that acceptance criteria passed.",
  },
  limitations: [
    "One Stage server per state directory",
    "Worker must execute code and device interaction using its own tools",
    "No publish/merge/deploy action",
  ],
};

export function createOpsApi(store: OpsStore, sessions: StageSessionManager) {
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    pathname: string,
    principal: OpsPrincipal,
  ) => {
    try {
      if (req.method === "GET" && pathname === "/api/ops/capabilities")
        return json(res, 200, opsCapabilities);
      if (req.method === "GET" && pathname === "/api/ops/devices")
        return json(res, 200, await deviceHubStatus());
      if (req.method === "GET" && pathname === "/api/ops") {
        const [ops, stage] = await Promise.all([store.snapshot(), sessions.snapshot()]);
        return json(res, 200, {
          ...ops,
          branches: stage.branches,
          scenes: stage.scenes,
          sessions: stage.sessions,
          projects: stage.projects.map(({ id, name }) => ({ id, name })),
          agentConfigured: Boolean(process.env.STAGE_AGENT_TOKEN),
        });
      }
      if (req.method !== "POST" || pathname !== "/api/ops/actions")
        return json(res, 404, { error: "Unknown operations endpoint." });
      const body = await readBody(req);
      const action = str(body.action, "action");
      if (["create", "review"].includes(action) && principal !== "operator")
        return json(res, 403, { error: "Only the operator can create or review quests." });
      if (action === "create") {
        const projectId = str(body.projectId, "projectId");
        const branch = str(body.branch, "branch");
        const stage = await sessions.snapshot();
        if (!stage.branches.some((b) => b.projectId === projectId && b.name === branch))
          throw new Error("Select a configured project and branch.");
        return json(
          res,
          201,
          await store.create({
            title: str(body.title, "title", 140),
            objective: str(body.objective, "objective"),
            criteria: strings(body.criteria, "criteria"),
            projectId,
            branch,
            assignedTo: str(body.assignedTo, "assignedTo", 80),
          }),
        );
      }
      if (action === "claim")
        return json(res, 200, { quest: await store.claim(str(body.agentId, "agentId", 80)) });
      const questId = str(body.questId, "questId");
      if (action === "review") {
        const decision = str(body.decision, "decision");
        if (decision !== "accept" && decision !== "revise" && decision !== "cancel")
          throw new Error("Invalid review decision.");
        if (decision === "accept") {
          const q = (await store.snapshot()).quests.find((q) => q.id === questId);
          const stage = await sessions.snapshot();
          const current = stage.branches.find(
            (b) => b.projectId === q?.projectId && b.name === q?.branch,
          );
          if (!q?.evidence || current?.sha !== q.evidence.sha)
            throw new Error("Evidence is stale. Request a revision and fresh captures.");
          if (
            q.evidence.sceneIds.some(
              (id) =>
                stage.scenes.find((s) => s.id === id)?.contentHash !==
                q.evidence?.sceneHashes?.[id],
            )
          )
            throw new Error("A captured screen changed after submission. Request a fresh review.");
        }
        return json(res, 200, await store.review(questId, decision, str(body.note, "note")));
      }
      const agentId = str(body.agentId, "agentId", 80);
      const result = await store.withLease(
        questId,
        agentId,
        str(body.leaseToken, "leaseToken"),
        async (q) => {
          if (action === "heartbeat") return { expiresAt: Date.now() + 90000 };
          if (action === "progress" || action === "block") {
            store.record(q, agentId, str(body.message, "message"));
            if (action === "block") {
              q.status = "blocked";
              q.lease = undefined;
            }
            return { status: q.status };
          }
          const stage = await sessions.snapshot();
          const branch = stage.branches.find(
            (b) => b.projectId === q.projectId && b.name === q.branch,
          );
          if (!branch?.sha || branch.availability !== "available")
            throw new Error("Branch unavailable. Report a blocker with the missing setup.");
          if (action === "capture") {
            const capture = await sessions.captures.request({
              projectId: q.projectId,
              branch: q.branch,
              sha: branch.sha,
            });
            store.record(
              q,
              agentId,
              `Capture requested for ${branch.sha.slice(0, 8)} (${capture.id}).`,
            );
            return {
              capture,
              routes: stage.projects.find((p) => p.id === q.projectId)?.preview?.scenes ?? [],
            };
          }
          if (action === "session") {
            if (body.target !== "web" && body.target !== "dev-client")
              throw new Error("Target must be web or dev-client.");
            const existing = stage.sessions.find(
              (s) =>
                s.projectId === q.projectId &&
                s.branch === q.branch &&
                s.target === body.target &&
                !["stopped", "failed"].includes(s.status),
            );
            if (existing && existing.sha !== branch.sha)
              throw new Error(
                "The active session is on an older commit. Stop it through DELETE /api/sessions/:id, then retry.",
              );
            if (body.target === "dev-client" && branch.compatibility !== "compatible")
              throw new Error(
                "Native runtime is not compatible. Use web or prepare a matching native build.",
              );
            const session = await sessions.startSession({
              projectId: q.projectId,
              branch: q.branch,
              target: body.target,
            });
            store.record(q, agentId, `Preview session ${session.id}: ${session.status}.`);
            return session;
          }
          if (action === "submit") {
            const sceneIds = strings(body.sceneIds, "sceneIds");
            if (
              sceneIds.some(
                (id) =>
                  !stage.scenes.some(
                    (s) =>
                      s.id === id &&
                      s.projectId === q.projectId &&
                      s.branch === q.branch &&
                      s.sha === branch.sha,
                  ),
              )
            )
              throw new Error("Submit actual scenes from this quest's branch and current commit.");
            q.evidence = {
              summary: str(body.summary, "summary"),
              sceneIds,
              sha: branch.sha,
              sceneHashes: Object.fromEntries(
                sceneIds.map((id) => [
                  id,
                  stage.scenes.find((s) => s.id === id)?.contentHash ?? "",
                ]),
              ),
            };
            q.status = "review";
            q.lease = undefined;
            store.record(
              q,
              agentId,
              "Result submitted with captured scenes. Waiting for operator review.",
            );
            return { status: q.status };
          }
          throw new Error("Unknown action. Read /api/ops/capabilities.");
        },
      );
      return json(res, 200, result);
    } catch (error) {
      return json(res, 400, {
        error: error instanceof Error ? error.message : "Operation failed.",
      });
    }
  };
}
function str(value: unknown, field: string, max = 4000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error(`${field} must contain 1–${max} characters.`);
  return value.trim();
}
function strings(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.length || value.length > 20)
    throw new Error(`${field} requires 1–20 items.`);
  return value.map((v) => str(v, field));
}
async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += Buffer.byteLength(chunk);
    if (bytes > 64000) throw new Error("Request too large.");
    chunks.push(Buffer.from(chunk));
  }
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Expected a JSON object.");
  return parsed;
}
function json(res: ServerResponse, code: number, data: unknown) {
  res.writeHead(code, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(data));
}
