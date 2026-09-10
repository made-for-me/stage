/** Supervisor state is local. A plan is never evidence of execution. */
export const LIVING_ARENA_URL = "https://clubhall-living-arena.madeforme.chatgpt.site";
export const CHATGPT_THREAD_URL = "https://chatgpt.com/c/6aa06cff-8390-83e9-84b5-79d1a24b630b";
export type MissionKind = "experience" | "event" | "improvement";
export type Phase = "draft" | "planned" | "validated" | "operating" | "paused";
export type Entry = {
  id: string;
  at: string;
  text: string;
  source: "operator" | "stage" | "chatgpt";
};
export type Evidence = {
  id: string;
  at: string;
  note: string;
  result: "pass" | "fail";
  source: "manual";
  revision: number;
};
export type Mission = {
  id: string;
  title: string;
  objective: string;
  kind: MissionKind;
  phase: Phase;
  revision: number;
  plan: string[];
  criteria: { text: string; checked: boolean }[];
  evidence: Evidence[];
  journal: Entry[];
  createdAt: string;
};
export type SupervisorState = { version: 1; missions: Mission[]; selectedId: string | null };
export const phaseLabels: Record<Phase, string> = {
  draft: "Intenção",
  planned: "Em preparação",
  validated: "Validada",
  operating: "Em acompanhamento",
  paused: "Pausada",
};
export const kindLabels: Record<MissionKind, string> = {
  experience: "Experiência",
  event: "Evento",
  improvement: "Melhoria",
};
function id() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
function entry(text: string, source: Entry["source"] = "stage"): Entry {
  return { id: id(), at: new Date().toISOString(), text, source };
}
export function createMission(objective: string, kind: MissionKind, title?: string): Mission {
  const clean = objective.trim();
  if (clean.length < 10 || clean.length > 2000)
    throw new Error("Descreva o objetivo em 10 a 2.000 caracteres.");
  return {
    id: id(),
    title: title?.trim().slice(0, 100) || clean.slice(0, 80),
    objective: clean,
    kind,
    phase: "draft",
    revision: 1,
    plan: [],
    criteria: [],
    evidence: [],
    journal: [entry("Missão criada. Próximo passo: preparar o plano.", "operator")],
    createdAt: new Date().toISOString(),
  };
}
export function initialState(): SupervisorState {
  return { version: 1, missions: [], selectedId: null };
}
export function preparePlan(m: Mission): Mission {
  if (m.phase !== "draft") throw new Error("O plano já foi preparado.");
  const plans: Record<MissionKind, string[]> = {
    experience: [
      "Definir o contexto do clube, a intenção e as preferências conhecidas.",
      "Compor a jornada: descobrir → entrar → ajustar → confirmar.",
      "Preparar uma proposta; manter decisões e permissões visíveis.",
      "Testar a experiência e registrar o resultado antes de acompanhar o piloto.",
    ],
    event: [
      "Definir o clube, o público, a data e a capacidade do encontro.",
      "Preparar a proposta, os convites e as regras de confirmação.",
      "Prever desistências e alternativas; submeter as ações ao organizador.",
      "Testar inscrição e confirmação antes de iniciar o acompanhamento.",
    ],
    improvement: [
      "Registrar o problema observado e o comportamento esperado.",
      "Definir uma mudança delimitada e a referência a preservar.",
      "Preparar uma versão isolada e comparar a experiência.",
      "Verificar o fluxo e registrar evidências antes de acompanhar o resultado.",
    ],
  };
  return {
    ...m,
    phase: "planned",
    plan: plans[m.kind],
    criteria: [
      { text: "O objetivo pode ser concluído no fluxo testado.", checked: false },
      { text: "Decisões e confirmações estão claras para a pessoa.", checked: false },
      { text: "É possível voltar, corrigir ou cancelar sem perder o contexto.", checked: false },
    ],
    journal: [
      ...m.journal,
      entry("Plano inicial preparado a partir do roteiro local. Revise ou refine com sua IA."),
    ],
  };
}
export function revisePlan(m: Mission, plan: string[], criteria: string[]): Mission {
  if (
    plan.length < 1 ||
    plan.length > 12 ||
    criteria.length < 1 ||
    criteria.length > 12 ||
    [...plan, ...criteria].some((t) => !t.trim() || t.length > 800)
  )
    throw new Error("Inclua de 1 a 12 passos e critérios, com até 800 caracteres por linha.");
  return {
    ...m,
    phase: "planned",
    revision: m.revision + 1,
    plan: plan.map((t) => t.trim()),
    criteria: criteria.map((text) => ({ text: text.trim(), checked: false })),
    journal: [
      ...m.journal,
      entry("Plano revisado. Os critérios precisam ser verificados novamente.", "operator"),
    ],
  };
}
export function toggleCriterion(m: Mission, index: number): Mission {
  if (m.phase !== "planned") throw new Error("Revise o plano para alterar uma validação anterior.");
  return {
    ...m,
    criteria: m.criteria.map((c, i) => (i === index ? { ...c, checked: !c.checked } : c)),
  };
}
export function addEvidence(m: Mission, note: string, result: Evidence["result"]): Mission {
  if (!m.plan.length) throw new Error("Prepare o plano antes de registrar um teste.");
  if (note.trim().length < 10 || note.length > 2000)
    throw new Error("Descreva o resultado em 10 a 2.000 caracteres.");
  return {
    ...m,
    phase: result === "fail" ? "planned" : m.phase,
    evidence: [
      ...m.evidence,
      {
        id: id(),
        at: new Date().toISOString(),
        note: note.trim(),
        result,
        source: "manual",
        revision: m.revision,
      },
    ],
    journal: [
      ...m.journal,
      entry(
        result === "pass"
          ? "Teste registrado pelo operador: passou."
          : "Teste registrou um problema. A missão voltou para preparação.",
        "operator",
      ),
    ],
  };
}
export function validationBlocker(m: Mission): string | null {
  if (!m.criteria.length || m.criteria.some((c) => !c.checked))
    return "Confira todos os critérios de sucesso.";
  const latest = m.evidence.filter((e) => e.revision === m.revision).at(-1);
  if (!latest || latest.result !== "pass")
    return "Registre um teste aprovado para a versão atual do plano.";
  return null;
}
export function transition(
  m: Mission,
  phase: "validated" | "operating" | "paused" | "planned",
): Mission {
  if (phase === "validated") {
    if (m.phase !== "planned") throw new Error("Prepare a missão primeiro.");
    const blocker = validationBlocker(m);
    if (blocker) throw new Error(blocker);
  } else if (phase === "operating" && m.phase !== "validated")
    throw new Error("Valide a experiência antes de acompanhar o piloto.");
  else if (phase === "paused" && m.phase !== "operating")
    throw new Error("Só é possível pausar uma missão em acompanhamento.");
  else if (phase === "planned" && m.phase !== "paused")
    throw new Error("Só é possível retomar uma missão pausada.");
  return {
    ...m,
    phase,
    journal: [
      ...m.journal,
      entry(
        phase === "operating"
          ? "Acompanhamento local iniciado. Nenhuma publicação ou convite foi enviado."
          : `Missão: ${phaseLabels[phase].toLowerCase()}.`,
        "operator",
      ),
    ],
  };
}
export function logObservation(m: Mission, note: string): Mission {
  if (note.trim().length < 5 || note.length > 2000)
    throw new Error("Escreva uma observação de 5 a 2.000 caracteres.");
  return { ...m, journal: [...m.journal, entry(note.trim(), "operator")] };
}
export function briefing(m: Mission): string {
  return `Você está ajudando a supervisionar o ClubHall no Stage.\nObjetivo: ${m.objective}\nTipo: ${kindLabels[m.kind]}\nEstado: ${phaseLabels[m.phase]}\nPlano atual:\n${m.plan.join("\n")}\nCritérios:\n${m.criteria.map((c) => c.text).join("\n")}\n\nRefine o plano e antecipe exceções. Preserve Clubs-first e navegação nativa. Planejado não significa executado ou verificado. Não execute ações externas. Retorne somente JSON neste formato para importar como rascunho no Stage:\n${JSON.stringify({ version: 1, title: m.title, objective: m.objective, kind: m.kind, plan: m.plan.length ? m.plan : ["Passo concreto"], criteria: m.criteria.length ? m.criteria.map((c) => c.text) : ["Resultado verificável"] }, null, 2)}`;
}
export function importDraft(raw: string): Mission {
  if (raw.length > 24000) throw new Error("O plano é muito grande.");
  let value: unknown;
  try {
    value = JSON.parse(
      raw
        .trim()
        .replace(/^```(?:json)?\s*/, "")
        .replace(/\s*```$/, ""),
    );
  } catch {
    throw new Error("Cole um JSON válido gerado a partir do briefing.");
  }
  if (!value || typeof value !== "object") throw new Error("Plano inválido.");
  const v = value as Record<string, unknown>;
  if (
    v.version !== 1 ||
    typeof v.title !== "string" ||
    !v.title.trim() ||
    typeof v.objective !== "string" ||
    !["experience", "event", "improvement"].includes(v.kind as string) ||
    !Array.isArray(v.plan) ||
    !Array.isArray(v.criteria) ||
    [...v.plan, ...v.criteria].some((t) => typeof t !== "string")
  )
    throw new Error("O JSON precisa de version: 1, title, objective, kind, plan e criteria.");
  const m = revisePlan(
    createMission(v.objective, v.kind as MissionKind, v.title),
    v.plan as string[],
    v.criteria as string[],
  );
  return {
    ...m,
    journal: [
      entry(
        "Plano importado da IA como rascunho. Execução e validação ainda pendentes.",
        "chatgpt",
      ),
    ],
  };
}
export function decodeState(raw: string): SupervisorState {
  const state = JSON.parse(raw) as SupervisorState;
  if (state.version !== 1 || !Array.isArray(state.missions))
    throw new Error("Dados locais incompatíveis.");
  for (const m of state.missions) {
    if (
      !m ||
      typeof m.id !== "string" ||
      typeof m.title !== "string" ||
      typeof m.objective !== "string" ||
      !Object.hasOwn(phaseLabels, m.phase) ||
      !Object.hasOwn(kindLabels, m.kind) ||
      !Number.isInteger(m.revision) ||
      !Array.isArray(m.plan) ||
      m.plan.some((p) => typeof p !== "string") ||
      !Array.isArray(m.criteria) ||
      m.criteria.some((c) => typeof c.text !== "string" || typeof c.checked !== "boolean") ||
      !Array.isArray(m.evidence) ||
      m.evidence.some(
        (e) =>
          typeof e.note !== "string" ||
          !["pass", "fail"].includes(e.result) ||
          !Number.isInteger(e.revision),
      ) ||
      !Array.isArray(m.journal) ||
      m.journal.some((e) => typeof e.text !== "string" || typeof e.at !== "string")
    )
      throw new Error(
        "Não foi possível ler as missões salvas. Exporte os dados antes de redefinir.",
      );
  }
  return state;
}
