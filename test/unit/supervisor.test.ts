import { describe, expect, it } from "vitest";
import {
  addEvidence,
  createMission,
  decodeState,
  importDraft,
  initialState,
  preparePlan,
  revisePlan,
  toggleCriterion,
  transition,
  validationBlocker,
} from "../../apps/stage-mobile/src/supervisor/model.js";

const planned = () =>
  preparePlan(
    createMission("Organizar uma experiência acessível para membros do clube.", "experience"),
  );
const checked = () => {
  let m = planned();
  m.criteria.forEach((_, i) => {
    m = toggleCriterion(m, i);
  });
  return m;
};

describe("supervisor lifecycle", () => {
  it("starts empty instead of presenting invented activity", () =>
    expect(initialState().missions).toEqual([]));
  it("cannot skip planning, evidence or validation", () => {
    expect(() =>
      transition(createMission("Organizar uma atividade no clube.", "event"), "operating"),
    ).toThrow();
    expect(() => transition(planned(), "validated")).toThrow("critérios");
    expect(() => transition(checked(), "validated")).toThrow("teste");
    expect(() => transition(checked(), "operating")).toThrow();
  });
  it("supports a persisted plan, test, validation and observation cycle", () => {
    const evidence = addEvidence(
      checked(),
      "A proposta pode ser ajustada e confirmada no fluxo.",
      "pass",
    );
    const operating = transition(transition(evidence, "validated"), "operating");
    const restored = decodeState(
      JSON.stringify({ version: 1, missions: [operating], selectedId: operating.id }),
    );
    expect(restored.missions[0].phase).toBe("operating");
    expect(restored.missions[0].journal.at(-1)?.text).toContain("Nenhuma publicação");
    expect(transition(transition(operating, "paused"), "planned").phase).toBe("planned");
  });
  it("invalidates previous verification when a plan changes", () => {
    const approved = transition(
      addEvidence(checked(), "Todos os controles testados responderam corretamente.", "pass"),
      "validated",
    );
    const revised = revisePlan(
      approved,
      ["Testar também o caminho de cancelamento."],
      ["Cancelamento preserva o contexto."],
    );
    expect(revised.phase).toBe("planned");
    expect(revised.evidence).toHaveLength(1);
    expect(validationBlocker(toggleCriterion(revised, 0))).toContain("teste aprovado");
  });
  it("a later failure overrides a previous passing test", () => {
    const passing = addEvidence(checked(), "Consegui confirmar a proposta e voltar.", "pass");
    const failure = addEvidence(
      transition(transition(passing, "validated"), "operating"),
      "A desistência deixou a tela sem caminho de retorno.",
      "fail",
    );
    expect(failure.phase).toBe("planned");
    expect(() => transition(failure, "validated")).toThrow("teste aprovado");
  });
});

describe("agent import boundary", () => {
  const payload = {
    version: 1,
    title: "Uma experiência no clube",
    objective: "Preparar uma atividade e acompanhar as confirmações.",
    kind: "event",
    plan: ["Definir público e capacidade."],
    criteria: ["A capacidade aparece na proposta."],
  };
  it("accepts a structured proposal but never external approval or execution claims", () => {
    const mission = importDraft(
      JSON.stringify({
        ...payload,
        phase: "operating",
        evidence: [{ result: "pass" }],
        criteriaChecked: true,
      }),
    );
    expect(mission.phase).toBe("planned");
    expect(mission.criteria[0].checked).toBe(false);
    expect(mission.evidence).toEqual([]);
    expect(mission.journal[0].source).toBe("chatgpt");
  });
  it("accepts fenced JSON and preserves unicode", () =>
    expect(importDraft(`\`\`\`json\n${JSON.stringify(payload)}\n\`\`\``).title).toBe(
      payload.title,
    ));
  it("rejects malformed, oversized, and unstructured plans", () => {
    for (const raw of [
      "not json",
      "null",
      "x".repeat(24001),
      JSON.stringify({ ...payload, kind: "deploy" }),
      JSON.stringify({ ...payload, plan: [7] }),
      JSON.stringify({ ...payload, criteria: [] }),
      JSON.stringify({ ...payload, plan: ["x".repeat(801)] }),
    ])
      expect(() => importDraft(raw)).toThrow();
  });
  it("rejects damaged storage instead of silently overwriting it", () => {
    expect(() => decodeState('{"version":2,"missions":[]}')).toThrow();
    expect(() => decodeState('{"version":1,"missions":[{}]}')).toThrow();
  });
});
