import { setImmediate } from "node:timers/promises";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { operationsHtml } from "../../src/server/operations-html.js";

class Element {
  value = "";
  textContent = "";
  hidden = false;
  disabled = false;
  open = false;
  html = "";
  fields: Record<string, string> = {};
  onsubmit?: (event: { preventDefault(): void; target: Element }) => void;
  onchange?: () => void;
  classList = { toggle: () => {} };
  button?: Element;
  get innerHTML() {
    return this.html;
  }
  set innerHTML(value: string) {
    this.html = value;
    const option = value.match(/<option value="([^"]*)"/);
    if (option) this.value = option[1];
  }
  querySelector(selector: string) {
    if (selector !== "[type=submit]") return null;
    this.button ??= new Element();
    return this.button;
  }
  insertAdjacentHTML(_position: string, value: string) {
    this.html += value;
  }
  showModal() {
    this.open = true;
  }
  close() {
    this.open = false;
  }
  reset() {}
  append() {}
  setAttribute() {}
}

async function uiFixture() {
  const session = {
    id: "preview-main",
    instanceId: "instance-1",
    projectId: "app",
    branch: "main",
    sha: "a".repeat(40),
    target: "web",
    worktreeRoot: "/tmp/preview",
  };
  const quest = {
    id: "q1",
    projectId: "app",
    branch: "main",
    revision: 2,
    status: "blocked",
    title: "Review preview",
    objective: "Actual objective",
    assignedTo: "worker",
    criteria: ["Check output"],
    evidence: null,
    reviews: [],
    submissions: [],
    events: [{ actor: "worker", message: "Preserve <user> edits", at: "2026-11-11T00:00:00Z" }],
    executionTarget: {
      repositoryRoot: "/tmp/source",
      branch: "main",
      sha: session.sha,
      worktree: {
        root: session.worktreeRoot,
        sessionId: session.id,
        sessionInstanceId: session.instanceId,
      },
    },
    executionIssue: null as string | null,
  };
  const snapshot = {
    quests: [quest],
    agents: [],
    branches: [
      { projectId: "app", name: "main", sha: session.sha },
      { projectId: "app", name: "other", sha: "b".repeat(40) },
    ],
    scenes: [],
    evidenceScenes: [],
    sessions: [session],
    executionSessions: [session],
  };
  const elements = new Map<string, Element>();
  const element = (id: string) => {
    let found = elements.get(id);
    if (!found) {
      found = new Element();
      elements.set(id, found);
    }
    return found;
  };
  const sent: Record<string, unknown>[] = [];
  const context = createContext({
    document: {
      getElementById: element,
      addEventListener: () => {},
      querySelectorAll: () => [],
      createElement: () => new Element(),
      hidden: false,
    },
    fetch: async (url: string, init: { body?: string }) => {
      if (init?.body) {
        sent.push(JSON.parse(init.body));
        return { ok: true, json: async () => ({}) };
      }
      return {
        ok: true,
        json: async () => (url === "/api/ops" ? structuredClone(snapshot) : { status: "offline" }),
      };
    },
    FormData: class {
      constructor(private form: Element) {}
      get(name: string) {
        if (name === "branch") return element("branch-options").value;
        if (name === "executionSessionId")
          return element(
            this.form === element("create-form") ? "create-execution" : "review-execution",
          ).value;
        return this.form.fields[name] ?? "";
      }
    },
    AbortSignal,
    URL,
    setInterval: () => 0,
  });
  const script = operationsHtml().match(/<script>([\s\S]*?)<\/script>/)?.[1];
  expect(script).toBeTruthy();
  runInContext(script ?? "", context);
  await setImmediate();
  const submit = async (id: string) => {
    const form = element(id);
    form.onsubmit?.({ preventDefault() {}, target: form });
    await setImmediate();
  };
  return { snapshot, quest, session, element, sent, context, submit };
}

describe("operator execution selection UI", () => {
  it("submits an explicit source default and selected preview from the actual create form", async () => {
    const h = await uiFixture();
    runInContext("openCreate()", h.context);
    expect(h.element("create-execution").value).toBe("");
    expect(h.element("create-execution").innerHTML).toContain("preview-main");
    h.element("create-form").fields = {
      title: "Task",
      objective: "Outcome",
      criteria: "Done",
      assignedTo: "worker",
    };
    await h.submit("create-form");
    expect(h.sent[0]).toMatchObject({ action: "create", executionSessionId: null, branch: "main" });
    runInContext("openCreate()", h.context);
    h.element("create-execution").value = h.session.id;
    await h.submit("create-form");
    expect(h.sent[1]).toMatchObject({ executionSessionId: h.session.id });
  });

  it("clears preview selection on branch change and shows the no-session fallback", async () => {
    const h = await uiFixture();
    runInContext("openCreate()", h.context);
    h.element("create-execution").value = h.session.id;
    h.element("branch-options").value = "1";
    h.element("branch-options").onchange?.();
    expect(h.element("create-execution").value).toBe("");
    expect(h.element("create-execution").innerHTML).not.toContain("preview-main");
    expect(h.element("create-execution-note").textContent).toContain("No matching live preview");
  });

  it("requires reselection of replaced sessions and explicitly clears the pin on retry", async () => {
    const h = await uiFixture();
    h.session.instanceId = "replacement";
    h.quest.executionIssue = "The pinned preview changed or stopped.";
    await runInContext("refresh()", h.context);
    runInContext("openReview(data.quests[0], 'revise')", h.context);
    expect(h.element("review-execution").value).toBe("__unavailable__");
    h.element("review-form").fields = { note: "Use source" };
    await h.submit("review-form");
    expect(h.sent).toHaveLength(0);
    h.element("review-execution").value = "";
    await h.submit("review-form");
    expect(h.sent[0]).toMatchObject({
      action: "review",
      revision: 2,
      evidenceId: null,
      decision: "revise",
      executionSessionId: null,
    });
  });

  it("keeps the reviewed revision fixed across refresh and never repins accept/cancel", async () => {
    const h = await uiFixture();
    runInContext("openReview(data.quests[0], 'revise')", h.context);
    h.quest.revision = 3;
    await runInContext("refresh()", h.context);
    await h.submit("review-form");
    expect(h.sent[0]).toMatchObject({ revision: 2, executionSessionId: h.session.id });
    runInContext("openReview(data.quests[0], 'cancel')", h.context);
    expect(h.element("review-execution-group").hidden).toBe(true);
    await h.submit("review-form");
    expect(h.sent[1]).not.toHaveProperty("executionSessionId");
  });

  it("renders the pinned root, revision, blocked reason and a retry action with escaped content", async () => {
    const h = await uiFixture();
    const main = h.element("main").innerHTML;
    expect(main).toContain("Execution · Revision 2");
    expect(main).toContain("/tmp/preview");
    expect(main).toContain("Preserve &lt;user&gt; edits");
    expect(main).toContain("Choose checkout & retry");
  });
});
