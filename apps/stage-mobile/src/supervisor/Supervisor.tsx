import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { type ComponentProps, type ReactNode, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BranchPreviews from "../BranchPreviews";
import {
  CHATGPT_THREAD_URL,
  LIVING_ARENA_URL,
  type Mission,
  type MissionKind,
  addEvidence,
  briefing,
  createMission,
  importDraft,
  kindLabels,
  logObservation,
  phaseLabels,
  preparePlan,
  revisePlan,
  toggleCriterion,
  transition,
  validationBlocker,
} from "./model";
import { useSupervisor } from "./useSupervisor";

const C = {
  bg: "#05070D",
  card: "#0F1521",
  border: "#242D3E",
  text: "#F4F5FC",
  muted: "#9AA6BC",
  blue: "#77AEFF",
  purple: "#B8A3FF",
  green: "#7CDDB4",
  amber: "#F1C47A",
};
type IconName = ComponentProps<typeof Ionicons>["name"];
type Tab = "home" | "missions" | "lab" | "activity";
type Sheet = "new" | "edit" | "evidence" | "observation" | "briefing" | "import" | null;
const tabs: { id: Tab; label: string; icon: IconName }[] = [
  { id: "home", label: "Visão geral", icon: "planet-outline" },
  { id: "missions", label: "Missões", icon: "compass-outline" },
  { id: "lab", label: "Laboratório", icon: "layers-outline" },
  { id: "activity", label: "Atividade", icon: "pulse-outline" },
];
const suggestions: { title: string; objective: string; kind: MissionKind; icon: IconName }[] = [
  {
    title: "Uma partida, sem organizar tudo",
    objective:
      "Ajudar uma pessoa do clube a preparar uma partida compatível com sua agenda, revisar a proposta e acompanhar as confirmações.",
    kind: "experience",
    icon: "tennisball-outline",
  },
  {
    title: "Um encontro que aproxima o clube",
    objective:
      "Preparar um encontro para novos membros do clube, com inscrições claras, limite de participantes e uma alternativa para desistências.",
    kind: "event",
    icon: "people-outline",
  },
  {
    title: "Uma chegada mais acolhedora",
    objective:
      "Melhorar a primeira experiência no ClubHall para que a pessoa encontre seu clube, entenda as possibilidades e escolha o próximo passo.",
    kind: "improvement",
    icon: "sparkles-outline",
  },
];
function Icon({
  name,
  color = C.muted,
  size = 20,
}: { name: IconName; color?: string; size?: number }) {
  return <Ionicons name={name} color={color} size={size} accessible={false} aria-hidden />;
}
function Copy({
  children,
  muted = false,
  style,
}: { children: ReactNode; muted?: boolean; style?: ComponentProps<typeof Text>["style"] }) {
  return <Text style={[s.body, muted && { color: C.muted }, style]}>{children}</Text>;
}
function Button({
  title,
  icon,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  icon?: IconName;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        { opacity: disabled ? 0.4 : pressed ? 0.72 : 1 },
      ]}
    >
      {icon && <Icon name={icon} color={secondary ? C.blue : "#071225"} size={18} />}
      <Text style={[s.buttonText, secondary && { color: C.blue }]}>{title}</Text>
    </Pressable>
  );
}
function Tag({ children, color = C.blue }: { children: ReactNode; color?: string }) {
  return (
    <View style={[s.tag, { backgroundColor: `${color}13` }]}>
      <Text style={{ color, fontSize: 11, fontWeight: "600" }}>{children}</Text>
    </View>
  );
}
function Section({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {trailing}
    </View>
  );
}
function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 9 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#77849A"
        multiline={multiline}
        textAlignVertical="top"
        style={[s.input, multiline && { minHeight: 112 }]}
        maxLength={label === "Plano da IA (JSON)" ? 24000 : 6000}
      />
    </View>
  );
}
function PhaseTrack({ mission }: { mission: Mission }) {
  const phases = ["draft", "planned", "validated", "operating"];
  const current = phases.indexOf(mission.phase);
  return (
    <View style={s.track}>
      {["Intenção", "Preparar", "Validar", "Acompanhar"].map((label, index) => (
        <View key={label} style={s.trackItem}>
          <View style={[s.trackLine, { backgroundColor: index <= current ? C.blue : C.border }]} />
          <Text style={{ fontSize: 10, color: index <= current ? C.blue : C.muted }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}
export function Supervisor() {
  const { state, commit, ready, saving, error } = useSupervisor();
  const [tab, setTab] = useState<Tab>("home");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [objective, setObjective] = useState("");
  const [missionTitle, setMissionTitle] = useState("");
  const [kind, setKind] = useState<MissionKind>("experience");
  const [planText, setPlanText] = useState("");
  const [criteriaText, setCriteriaText] = useState("");
  const [note, setNote] = useState("");
  const [importText, setImportText] = useState("");
  const [testResult, setTestResult] = useState<"pass" | "fail">("pass");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showBranches, setShowBranches] = useState(false);
  const [opening, setOpening] = useState(false);
  const selected =
    state.missions.find((m) => m.id === (selectedId ?? state.selectedId)) ?? state.missions[0];
  const pending = state.missions.filter((m) => m.phase === "planned" || m.phase === "draft");
  const operating = state.missions.filter((m) => m.phase === "operating");
  const validated = state.missions.filter((m) => m.phase === "validated");
  const entries = state.missions
    .flatMap((m) => m.journal.map((e) => ({ ...e, title: m.title, missionId: m.id })))
    .sort((a, b) => b.at.localeCompare(a.at));
  async function mutate(transform: (m: Mission) => Mission) {
    if (!selected) return false;
    return commit((value) => ({
      ...value,
      missions: value.missions.map((m) => (m.id === selected.id ? transform(m) : m)),
    }));
  }
  async function addMission(m: Mission) {
    if (
      await commit((value) => ({ ...value, missions: [m, ...value.missions], selectedId: m.id }))
    ) {
      setSelectedId(m.id);
      setSheet(null);
      setTab("missions");
      setFeedback(null);
    }
  }
  function newMission(suggestion?: (typeof suggestions)[number]) {
    setObjective(suggestion?.objective ?? "");
    setMissionTitle(suggestion?.title ?? "");
    setKind(suggestion?.kind ?? "experience");
    setFeedback(null);
    setSheet("new");
  }
  function openMission(m: Mission) {
    setSelectedId(m.id);
    setTab("missions");
  }
  function openSheet(next: Sheet) {
    setNote("");
    setFeedback(null);
    if (selected && next === "edit") {
      setPlanText(selected.plan.join("\n"));
      setCriteriaText(selected.criteria.map((c) => c.text).join("\n"));
    }
    setSheet(next);
  }
  async function external(url: string) {
    setOpening(true);
    setFeedback(null);
    try {
      await WebBrowser.openBrowserAsync(url, { windowName: "_self" });
    } catch {
      setFeedback("Não foi possível abrir a experiência. Verifique sua conexão e tente novamente.");
    } finally {
      setOpening(false);
    }
  }
  async function saveSheet() {
    setFeedback(null);
    try {
      if (sheet === "new") await addMission(createMission(objective, kind, missionTitle));
      else if (sheet === "import") {
        await addMission(importDraft(importText));
        setImportText("");
      } else {
        const saved = await mutate((m) =>
          sheet === "edit"
            ? revisePlan(
                m,
                planText.split("\n").filter((t) => t.trim()),
                criteriaText.split("\n").filter((t) => t.trim()),
              )
            : sheet === "evidence"
              ? addEvidence(m, note, testResult)
              : logObservation(m, note),
        );
        if (saved) setSheet(null);
      }
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Não foi possível salvar.");
    }
  }
  const selectControl = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Criar missão"
      onPress={() => newMission()}
      style={s.iconButton}
    >
      <Icon name="add" color={C.text} size={24} />
    </Pressable>
  );
  if (!ready)
    return (
      <SafeAreaView style={[s.root, { padding: 24, justifyContent: "center", gap: 18 }]}>
        {error ? (
          <Copy>{error}</Copy>
        ) : (
          <>
            <ActivityIndicator color={C.blue} />
            <Copy>Carregando seu espaço…</Copy>
          </>
        )}
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <View style={s.header}>
        <View style={s.brand}>
          <View style={s.brandMark}>
            <Icon name="layers-outline" color={C.blue} size={18} />
          </View>
          <Text style={s.wordmark}>STAGE</Text>
        </View>
        <View style={s.row}>
          <Tag color={C.green}>ClubHall</Tag>
          {selectControl}
        </View>
      </View>
      {showBranches && tab === "lab" ? (
        <>
          <View style={{ paddingHorizontal: 22 }}>
            <Button
              title="Voltar ao laboratório"
              secondary
              icon="arrow-back"
              onPress={() => setShowBranches(false)}
            />
          </View>
          <BranchPreviews />
        </>
      ) : (
        <ScrollView
          key={tab}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          {(error || feedback) && (
            <View accessibilityRole="alert" style={s.notice}>
              <Copy style={{ color: C.amber }}>{feedback || error}</Copy>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar aviso"
                onPress={() => setFeedback(null)}
              >
                <Icon name="close" color={C.amber} />
              </Pressable>
            </View>
          )}
          {tab === "home" && (
            <>
              <View style={s.intro}>
                <Text style={s.eyebrow}>DA INTENÇÃO À EXPERIÊNCIA</Text>
                <Text style={s.title}>Um lugar para{"\n"}dar vida ao ClubHall.</Text>
                <Copy muted>
                  Você define a direção. Aqui, cada ideia ganha um plano, uma experiência e um
                  próximo passo.
                </Copy>
              </View>
              <LinearGradient
                colors={["#172D50", "#121C32", "#101729"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.hero}
              >
                <View style={[s.row, { justifyContent: "space-between" }]}>
                  <Text style={[s.eyebrow, { color: "#B1CFFF" }]}>CENTRO DE OPERAÇÕES</Text>
                  <View style={s.statusDot} />
                </View>
                <View style={[s.row, { gap: 16 }]}>
                  <Image
                    source={require("../../../../assets/ar2-orb.png")}
                    style={s.orb}
                    contentFit="contain"
                  />
                  <View style={{ flex: 1, gap: 7 }}>
                    <Text style={s.heroTitle}>O que vamos{"\n"}tornar possível?</Text>
                    <Copy muted style={{ fontSize: 12 }}>
                      Planeje com sua IA.{"\n"}Conduza pelo Stage.
                    </Copy>
                  </View>
                </View>
                <Button title="Criar uma missão" icon="add" onPress={() => newMission()} />
                <Text style={s.heroFoot}>Seu espaço local · decisões e evidências salvas</Text>
              </LinearGradient>
              <View style={s.metrics}>
                {[
                  [pending.length, "em preparação"],
                  [validated.length, "validadas"],
                  [operating.length, "acompanhando"],
                ].map(([n, label]) => (
                  <View key={String(label)} style={s.metric}>
                    <Text style={s.metricNumber}>{n}</Text>
                    <Text style={s.metricLabel}>{label}</Text>
                  </View>
                ))}
              </View>
              {selected && (
                <>
                  <Section title="Continue de onde parou" />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openMission(selected)}
                    style={s.card}
                  >
                    <View style={[s.row, { justifyContent: "space-between" }]}>
                      <Tag>{phaseLabels[selected.phase]}</Tag>
                      <Icon name="arrow-forward" color={C.blue} />
                    </View>
                    <Text style={s.cardTitle}>{selected.title}</Text>
                    <PhaseTrack mission={selected} />
                  </Pressable>
                </>
              )}
              <Section
                title={
                  state.missions.length ? "Outras possibilidades" : "Comece por uma possibilidade"
                }
              />
              {suggestions.map((item) => (
                <Pressable
                  key={item.title}
                  accessibilityRole="button"
                  onPress={() => newMission(item)}
                  style={s.suggestion}
                >
                  <View style={s.iconTile}>
                    <Icon name={item.icon} color={C.blue} size={23} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={s.suggestionTitle}>{item.title}</Text>
                    <Text style={s.caption}>{kindLabels[item.kind]} · preparar missão</Text>
                  </View>
                  <Icon name="chevron-forward" size={17} />
                </Pressable>
              ))}
              <Section title="Sua experiência no ChatGPT" />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver Living Arena no laboratório"
                onPress={() => setTab("lab")}
                style={s.miniCard}
              >
                <View style={s.miniIcon}>
                  <Icon name="planet-outline" color="#E3C482" size={30} />
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={s.suggestionTitle}>CLUBHall · Living Arena</Text>
                  <Copy muted style={{ fontSize: 12 }}>
                    O primeiro mundo para testar sua intenção.
                  </Copy>
                </View>
                <Icon name="arrow-forward" color={C.purple} />
              </Pressable>
            </>
          )}
          {tab === "missions" && (
            <>
              <View style={s.intro}>
                <Text style={s.eyebrow}>DO PLANO AO ACOMPANHAMENTO</Text>
                <Text style={s.title}>Missões</Text>
                <Copy muted>Uma intenção clara. Um resultado verificável.</Copy>
              </View>
              <View style={s.row}>
                <Button title="Nova missão" icon="add" onPress={() => newMission()} />
                <Button
                  title="Importar da IA"
                  secondary
                  icon="download-outline"
                  onPress={() => openSheet("import")}
                />
              </View>
              {!selected ? (
                <View style={s.empty}>
                  <Icon name="compass-outline" size={44} color={C.blue} />
                  <Text style={s.cardTitle}>Sua primeira missão começa aqui.</Text>
                  <Copy muted>Crie uma intenção ou importe um plano refinado no ChatGPT.</Copy>
                </View>
              ) : (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                  >
                    {state.missions.map((m) => (
                      <Pressable
                        key={m.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: m.id === selected.id }}
                        aria-selected={m.id === selected.id}
                        onPress={() => setSelectedId(m.id)}
                        style={[s.missionChip, m.id === selected.id && s.activeChip]}
                      >
                        <Text
                          numberOfLines={1}
                          style={{ color: m.id === selected.id ? C.blue : C.muted, maxWidth: 220 }}
                        >
                          {m.title}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <View style={s.card}>
                    <View style={[s.row, { justifyContent: "space-between", flexWrap: "wrap" }]}>
                      <Tag>{kindLabels[selected.kind]}</Tag>
                      <Tag color={selected.phase === "operating" ? C.green : C.purple}>
                        {phaseLabels[selected.phase]}
                      </Tag>
                    </View>
                    <Text style={s.detailTitle}>{selected.title}</Text>
                    <Copy muted>{selected.objective}</Copy>
                    <PhaseTrack mission={selected} />
                    {selected.phase === "draft" && (
                      <Button
                        title="Preparar plano inicial"
                        icon="sparkles-outline"
                        disabled={saving}
                        onPress={() => void mutate(preparePlan)}
                      />
                    )}
                  </View>
                  {selected.plan.length > 0 && (
                    <>
                      <Section
                        title="Plano da experiência"
                        trailing={
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => openSheet("edit")}
                            style={s.textButton}
                          >
                            <Text style={{ color: C.blue }}>Editar</Text>
                          </Pressable>
                        }
                      />
                      <View style={s.card}>
                        <Text style={s.caption}>VERSÃO {selected.revision} · PLANO EDITÁVEL</Text>
                        {selected.plan.map((step, i) => (
                          <View key={`${i}-${step}`} style={s.step}>
                            <View style={s.stepNumber}>
                              <Text style={{ color: C.blue, fontSize: 12 }}>
                                {String(i + 1).padStart(2, "0")}
                              </Text>
                            </View>
                            <Copy style={{ flex: 1 }}>{step}</Copy>
                          </View>
                        ))}
                      </View>
                      <View style={s.aiPanel}>
                        <Icon name="sparkles-outline" color={C.purple} />
                        <View style={{ flex: 1, gap: 5 }}>
                          <Text style={s.suggestionTitle}>Leve o contexto para sua IA</Text>
                          <Copy muted style={{ fontSize: 12 }}>
                            Compartilhe o briefing e importe um plano refinado. A revisão continua
                            com você.
                          </Copy>
                        </View>
                      </View>
                      <Button
                        title="Abrir briefing para a IA"
                        secondary
                        icon="arrow-up-outline"
                        onPress={() => openSheet("briefing")}
                      />
                      <Section title="Validar a experiência" />
                      <View style={s.card}>
                        <Copy muted>
                          Confira os critérios no fluxo real. Abrir um preview não comprova que ele
                          funciona.
                        </Copy>
                        {selected.criteria.map((criterion, i) => (
                          <Pressable
                            key={`${i}-${criterion.text}`}
                            accessibilityRole="checkbox"
                            aria-checked={criterion.checked}
                            accessibilityLabel={criterion.text}
                            accessibilityState={{
                              checked: criterion.checked,
                              disabled: selected.phase !== "planned",
                            }}
                            disabled={selected.phase !== "planned" || saving}
                            onPress={() => void mutate((m) => toggleCriterion(m, i))}
                            style={s.criterion}
                          >
                            <Icon
                              name={criterion.checked ? "checkbox" : "square-outline"}
                              color={criterion.checked ? C.green : C.muted}
                              size={24}
                            />
                            <Copy style={{ flex: 1 }}>{criterion.text}</Copy>
                          </Pressable>
                        ))}
                        <Button
                          title="Abrir experiência de teste"
                          secondary
                          icon="open-outline"
                          onPress={() => setTab("lab")}
                        />
                        <Button
                          title="Registrar resultado do teste"
                          secondary
                          icon="checkmark-circle-outline"
                          onPress={() => {
                            setTestResult("pass");
                            openSheet("evidence");
                          }}
                        />
                        {selected.phase === "planned" && (
                          <>
                            <Button
                              title="Validar missão"
                              icon="shield-checkmark-outline"
                              disabled={saving || Boolean(validationBlocker(selected))}
                              onPress={() => void mutate((m) => transition(m, "validated"))}
                            />
                            {validationBlocker(selected) && (
                              <Copy muted style={{ fontSize: 12 }}>
                                {validationBlocker(selected)}
                              </Copy>
                            )}
                          </>
                        )}
                        {selected.phase === "validated" && (
                          <>
                            <Button
                              title="Acompanhar piloto"
                              icon="pulse-outline"
                              disabled={saving}
                              onPress={() => void mutate((m) => transition(m, "operating"))}
                            />
                            <Copy muted style={{ fontSize: 12 }}>
                              Inicia um registro local do piloto. Publicação, convites e reservas
                              dependem da conexão com o ClubHall.
                            </Copy>
                          </>
                        )}
                        {selected.phase === "operating" && (
                          <>
                            <Tag color={C.green}>Acompanhamento local</Tag>
                            <Button
                              title="Registrar observação"
                              icon="add"
                              onPress={() => openSheet("observation")}
                            />
                            <Button
                              title="Pausar acompanhamento"
                              secondary
                              icon="pause"
                              disabled={saving}
                              onPress={() => void mutate((m) => transition(m, "paused"))}
                            />
                          </>
                        )}
                        {selected.phase === "paused" && (
                          <Button
                            title="Retomar preparação"
                            icon="play"
                            disabled={saving}
                            onPress={() => void mutate((m) => transition(m, "planned"))}
                          />
                        )}
                      </View>
                      {selected.evidence.length > 0 && (
                        <>
                          <Section title="Evidências registradas" />
                          {[...selected.evidence].reverse().map((e) => (
                            <View key={e.id} style={s.card}>
                              <View style={[s.row, { justifyContent: "space-between" }]}>
                                <Tag color={e.result === "pass" ? C.green : C.amber}>
                                  {e.result === "pass" ? "Passou" : "Precisa de ajuste"}
                                </Tag>
                                <Text style={s.caption}>Manual · v{e.revision}</Text>
                              </View>
                              <Copy>{e.note}</Copy>
                              <Text style={s.caption}>
                                {new Date(e.at).toLocaleString("pt-BR")}
                              </Text>
                            </View>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
          {tab === "lab" && (
            <>
              <View style={s.intro}>
                <Text style={s.eyebrow}>EXPERIMENTE ANTES DE AVANÇAR</Text>
                <Text style={s.title}>Laboratório</Text>
                <Copy muted>Conecte a intenção à experiência que as pessoas vão usar.</Copy>
              </View>
              <LinearGradient colors={["#252137", "#141923", "#111724"]} style={s.labHero}>
                <View style={[s.row, { justifyContent: "space-between" }]}>
                  <Tag color="#E3C482">MINI APP · CHATGPT</Tag>
                  <Icon name="open-outline" color={C.purple} />
                </View>
                <Image
                  source={require("../../../../assets/living-arena.png")}
                  accessibilityLabel="Arena original do mini app Living Arena"
                  contentFit="cover"
                  style={{
                    width: "100%",
                    height: 210,
                    borderRadius: 16,
                    backgroundColor: "#F7E8D2",
                  }}
                />
                <Text style={s.detailTitle}>Living Arena</Text>
                <Copy muted>Descobrir um mundo. Preparar uma partida. Rever a proposta.</Copy>
                <Button
                  title={opening ? "Abrindo…" : "Abrir mini app"}
                  icon="open-outline"
                  disabled={opening}
                  onPress={() => void external(LIVING_ARENA_URL)}
                />
                <Text style={s.caption}>Site privado · entre com sua conta do ChatGPT</Text>
              </LinearGradient>
              <View style={s.card}>
                <Text style={s.cardTitle}>Um teste com contexto</Text>
                {selected ? (
                  <>
                    <Tag>{selected.title}</Tag>
                    <Copy muted>{selected.objective}</Copy>
                    <View style={s.step}>
                      <Icon name="footsteps-outline" color={C.blue} />
                      <Copy style={{ flex: 1 }}>
                        Abra a arena, entre no mundo do tênis e prepare uma proposta. Observe
                        confirmação, retorno e ajustes.
                      </Copy>
                    </View>
                    <Button
                      title="Voltei do teste · registrar resultado"
                      secondary
                      icon="checkmark-circle-outline"
                      onPress={() => {
                        setTab("missions");
                        if (!selected.plan.length) {
                          setFeedback("Prepare o plano da missão antes de registrar o resultado.");
                        } else openSheet("evidence");
                      }}
                    />
                  </>
                ) : (
                  <>
                    <Copy muted>
                      Associe o teste a uma missão para guardar o resultado e retomar o trabalho.
                    </Copy>
                    <Button
                      title="Criar missão para a arena"
                      secondary
                      icon="add"
                      onPress={() => newMission(suggestions[0])}
                    />
                  </>
                )}
              </View>
              <View style={s.connection}>
                <View style={s.row}>
                  <Icon name="link-outline" color={C.purple} />
                  <Text style={s.suggestionTitle}>Conexão com o ChatGPT</Text>
                </View>
                <Copy muted>
                  O mini app abre pelo link original. O resultado é registrado por você; o site
                  ainda não envia eventos ao Stage.
                </Copy>
                <Button
                  title="Abrir conversa de origem"
                  secondary
                  icon="chatbubble-outline"
                  onPress={() => void external(CHATGPT_THREAD_URL)}
                />
              </View>
              <Section title="Previews do aplicativo" />
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowBranches(true)}
                style={s.suggestion}
              >
                <View style={s.iconTile}>
                  <Icon name="git-branch-outline" color={C.blue} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={s.suggestionTitle}>ClubHall nativo</Text>
                  <Text style={s.caption}>Branches e versões de teste</Text>
                </View>
                <Icon name="chevron-forward" />
              </Pressable>
            </>
          )}
          {tab === "activity" && (
            <>
              <View style={s.intro}>
                <Text style={s.eyebrow}>CONTEXTO QUE CONTINUA</Text>
                <Text style={s.title}>Atividade</Text>
                <Copy muted>O que foi preparado, conferido e observado.</Copy>
              </View>
              <View style={s.card}>
                <View style={s.row}>
                  <Icon name="radio-outline" color={C.green} />
                  <Text style={s.cardTitle}>{operating.length} em acompanhamento</Text>
                </View>
                <Copy muted>
                  Registros deste dispositivo. Telemetria e execução automática ainda não estão
                  conectadas.
                </Copy>
              </View>
              {!entries.length ? (
                <View style={s.empty}>
                  <Icon name="pulse-outline" size={42} color={C.blue} />
                  <Copy muted>As decisões da sua primeira missão aparecerão aqui.</Copy>
                </View>
              ) : (
                entries.map((e) => (
                  <Pressable
                    key={e.id}
                    accessibilityRole="button"
                    onPress={() => {
                      setSelectedId(e.missionId);
                      setTab("missions");
                    }}
                    style={s.timeline}
                  >
                    <View style={s.timelineDot} />
                    <View style={{ flex: 1, gap: 7 }}>
                      <Text style={s.caption}>
                        {new Date(e.at).toLocaleString("pt-BR")} ·{" "}
                        {e.source === "operator"
                          ? "Você"
                          : e.source === "chatgpt"
                            ? "IA · importação"
                            : "Stage"}
                      </Text>
                      <Copy>{e.text}</Copy>
                      <Text style={{ color: C.blue, fontSize: 12 }}>{e.title}</Text>
                    </View>
                  </Pressable>
                ))
              )}
            </>
          )}
          <View style={s.footer}>
            <View style={s.footerLine} />
            <Text style={s.footerText}>made for me</Text>
            <Text style={s.caption}>Intenção. Experiência. Continuidade.</Text>
          </View>
        </ScrollView>
      )}
      <View style={s.nav}>
        {tabs.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: tab === item.id }}
            aria-selected={tab === item.id}
            onPress={() => {
              setTab(item.id);
              setFeedback(null);
            }}
            style={s.navItem}
          >
            <View style={[s.navIcon, tab === item.id && s.navActive]}>
              <Icon name={item.icon} color={tab === item.id ? C.blue : C.muted} size={23} />
            </View>
            <Text
              style={{
                color: tab === item.id ? C.blue : C.muted,
                fontSize: 10,
                fontWeight: tab === item.id ? "600" : "400",
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Modal
        visible={sheet !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSheet(null)}
      >
        <SafeAreaView style={s.root}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <View style={s.sheetHeader}>
              <Text style={s.cardTitle}>
                {sheet === "new"
                  ? "Nova missão"
                  : sheet === "edit"
                    ? "Revisar plano"
                    : sheet === "import"
                      ? "Importar da IA"
                      : sheet === "briefing"
                        ? "Briefing para sua IA"
                        : sheet === "observation"
                          ? "Registrar observação"
                          : "Resultado do teste"}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                onPress={() => setSheet(null)}
                style={s.iconButton}
              >
                <Icon name="close" color={C.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={s.sheetContent} keyboardShouldPersistTaps="handled">
              {(feedback || error) && (
                <View accessibilityRole="alert" style={s.notice}>
                  <Copy style={{ color: C.amber }}>{feedback || error}</Copy>
                </View>
              )}
              {sheet === "new" && (
                <>
                  <Text style={s.detailTitle}>Qual mudança você{"\n"}quer tornar possível?</Text>
                  <Copy muted>Descreva o resultado para a pessoa ou para o clube.</Copy>
                  <View style={[s.row, { flexWrap: "wrap" }]}>
                    {(Object.keys(kindLabels) as MissionKind[]).map((k) => (
                      <Pressable
                        key={k}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: k === kind }}
                        aria-checked={k === kind}
                        onPress={() => setKind(k)}
                        style={[s.missionChip, kind === k && s.activeChip]}
                      >
                        <Text style={{ color: kind === k ? C.blue : C.muted }}>
                          {kindLabels[k]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Field
                    label="Nome da missão"
                    value={missionTitle}
                    onChangeText={setMissionTitle}
                    placeholder="Uma partida, sem organizar tudo"
                    multiline={false}
                  />
                  <Field
                    label="Objetivo da missão"
                    value={objective}
                    onChangeText={setObjective}
                    placeholder="Quero que uma pessoa do clube consiga…"
                  />
                  <Button
                    title="Criar missão"
                    disabled={saving || objective.trim().length < 10}
                    onPress={() => void saveSheet()}
                  />
                </>
              )}
              {sheet === "edit" && (
                <>
                  <Copy muted>
                    Um passo ou critério por linha. Ao salvar, a missão volta para preparação e pede
                    uma nova validação.
                  </Copy>
                  <Field label="Passos do plano" value={planText} onChangeText={setPlanText} />
                  <Field
                    label="Critérios de sucesso"
                    value={criteriaText}
                    onChangeText={setCriteriaText}
                  />
                  <Button
                    title="Salvar revisão"
                    disabled={saving}
                    onPress={() => void saveSheet()}
                  />
                </>
              )}
              {(sheet === "evidence" || sheet === "observation") && (
                <>
                  <Copy muted>{selected?.title}</Copy>
                  {sheet === "evidence" && (
                    <>
                      <Copy muted>
                        Registre o que você realmente observou. Este resultado será identificado
                        como avaliação manual.
                      </Copy>
                      <View style={s.row}>
                        {(["pass", "fail"] as const).map((r) => (
                          <Pressable
                            key={r}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: testResult === r }}
                            aria-checked={testResult === r}
                            onPress={() => setTestResult(r)}
                            style={[s.missionChip, testResult === r && s.activeChip]}
                          >
                            <Text style={{ color: testResult === r ? C.blue : C.muted }}>
                              {r === "pass" ? "Passou" : "Precisa de ajuste"}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  )}
                  <Field
                    label={
                      sheet === "evidence" ? "O que aconteceu no teste?" : "O que você observou?"
                    }
                    value={note}
                    onChangeText={setNote}
                    placeholder="Fluxo testado, resultado e pontos de atenção…"
                  />
                  <Button
                    title="Salvar registro"
                    disabled={saving || note.trim().length < 10}
                    onPress={() => void saveSheet()}
                  />
                </>
              )}
              {sheet === "briefing" && selected && (
                <>
                  <Copy muted>
                    Compartilhe este contexto com sua IA. Depois, importe o JSON devolvido como uma
                    nova proposta de missão.
                  </Copy>
                  <Text selectable style={s.briefing}>
                    {briefing(selected)}
                  </Text>
                  <Button
                    title="Compartilhar briefing"
                    icon="share-outline"
                    onPress={() => {
                      void Share.share({
                        message: briefing(selected),
                        title: "Stage · briefing da missão",
                      }).catch(() =>
                        setFeedback("Selecione e copie o briefing acima para compartilhar."),
                      );
                    }}
                  />
                  <Button
                    title="Importar resposta da IA"
                    secondary
                    icon="download-outline"
                    onPress={() => setSheet("import")}
                  />
                </>
              )}
              {sheet === "import" && (
                <>
                  <Copy muted>
                    Cole o plano em JSON produzido com o briefing do Stage. Ele entra em preparação;
                    nenhum status de execução ou aprovação é importado.
                  </Copy>
                  <Field
                    label="Plano da IA (JSON)"
                    value={importText}
                    onChangeText={setImportText}
                    placeholder={
                      '{"version":1,"title":"…","objective":"…","kind":"experience","plan":["…"],"criteria":["…"]}'
                    }
                  />
                  <Button
                    title="Importar como proposta"
                    disabled={saving || !importText.trim()}
                    onPress={() => void saveSheet()}
                  />
                </>
              )}
              {saving && <ActivityIndicator color={C.blue} />}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 820,
    alignSelf: "center",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#365B88",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#13233B",
  },
  wordmark: { color: C.text, fontSize: 16, letterSpacing: 4, fontWeight: "500" },
  content: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 14,
    maxWidth: 780,
    width: "100%",
    alignSelf: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  intro: { gap: 12, paddingTop: 8, paddingBottom: 12 },
  eyebrow: { color: C.muted, fontSize: 9, fontWeight: "600", letterSpacing: 2 },
  title: { color: C.text, fontSize: 33, fontWeight: "500", letterSpacing: -1.1, lineHeight: 40 },
  body: { fontSize: 14, lineHeight: 21, color: C.text },
  hero: {
    padding: 21,
    borderRadius: 26,
    borderCurve: "continuous",
    gap: 20,
    borderWidth: 1,
    borderColor: "#2C4264",
    boxShadow: "0 18px 48px rgba(23,105,255,0.18)",
  },
  heroTitle: {
    color: C.text,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: -0.6,
    fontWeight: "500",
  },
  orb: { width: 94, height: 94 },
  heroFoot: { fontSize: 10, color: "#B0BDD3", textAlign: "center", marginTop: -7 },
  statusDot: {
    width: 6,
    height: 6,
    backgroundColor: C.blue,
    borderRadius: 3,
    boxShadow: "0 0 10px #609eff",
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#93BEFF",
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: { backgroundColor: "#152238", borderWidth: 1, borderColor: "#2C405C" },
  buttonText: { fontSize: 13, fontWeight: "600", color: "#071225", flexShrink: 1 },
  iconButton: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  metrics: {
    flexDirection: "row",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#1A2333",
  },
  metric: { flex: 1, gap: 5, alignItems: "center" },
  metricNumber: { color: C.text, fontSize: 25, fontWeight: "400" },
  metricLabel: { fontSize: 10, color: C.muted },
  section: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    minHeight: 28,
  },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: "500", letterSpacing: -0.2 },
  textButton: { minHeight: 44, justifyContent: "center", paddingLeft: 16 },
  card: {
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    borderRadius: 20,
    gap: 15,
  },
  cardTitle: { color: C.text, fontSize: 18, fontWeight: "500", letterSpacing: -0.4 },
  detailTitle: {
    color: C.text,
    fontSize: 26,
    fontWeight: "500",
    lineHeight: 33,
    letterSpacing: -0.6,
  },
  tag: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 7,
    maxWidth: "100%",
  },
  suggestion: {
    padding: 15,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#202938",
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: "#0D131E",
  },
  iconTile: {
    width: 43,
    height: 43,
    backgroundColor: "#17273D",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionTitle: { color: C.text, fontSize: 14, lineHeight: 20, fontWeight: "500" },
  caption: { color: C.muted, fontSize: 11, lineHeight: 16 },
  miniCard: {
    padding: 19,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#393343",
    backgroundColor: "#171823",
  },
  miniIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2A2630",
    alignItems: "center",
    justifyContent: "center",
  },
  track: { flexDirection: "row", gap: 6, paddingTop: 7 },
  trackItem: { flex: 1, gap: 8 },
  trackLine: { height: 3, borderRadius: 3 },
  missionChip: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#0D131E",
    minHeight: 44,
  },
  activeChip: { borderColor: "#4D76B0", backgroundColor: "#172A46" },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 13 },
  stepNumber: {
    width: 29,
    height: 29,
    borderRadius: 9,
    backgroundColor: "#1B2C44",
    alignItems: "center",
    justifyContent: "center",
  },
  criterion: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
  aiPanel: {
    flexDirection: "row",
    gap: 13,
    alignItems: "flex-start",
    paddingHorizontal: 4,
    paddingTop: 12,
  },
  labHero: { padding: 22, gap: 16, borderRadius: 25, borderWidth: 1, borderColor: "#403C50" },
  connection: { padding: 18, gap: 15, borderWidth: 1, borderColor: "#2D2940", borderRadius: 20 },
  timeline: {
    flexDirection: "row",
    gap: 17,
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderColor: "#1A2333",
  },
  timelineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.blue, marginTop: 4 },
  nav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderColor: "#1F293B",
    backgroundColor: "#0A101B",
    maxWidth: 820,
    alignSelf: "center",
    width: "100%",
  },
  navItem: { flex: 1, alignItems: "center", gap: 3, minHeight: 60 },
  navIcon: {
    height: 34,
    width: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  navActive: { backgroundColor: "#192B46" },
  footer: { alignItems: "center", gap: 8, paddingTop: 30, paddingBottom: 5 },
  footerLine: { height: 1, backgroundColor: "#263046", width: 28, marginBottom: 10 },
  footerText: { color: "#CED5E3", fontSize: 14, letterSpacing: 0.6 },
  empty: { alignItems: "center", paddingVertical: 40, paddingHorizontal: 10, gap: 18 },
  notice: {
    padding: 15,
    backgroundColor: "#2C251C",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sheetHeader: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  sheetContent: {
    padding: 24,
    gap: 22,
    paddingBottom: 48,
    maxWidth: 780,
    alignSelf: "center",
    width: "100%",
  },
  input: {
    padding: 16,
    fontSize: 15,
    lineHeight: 23,
    color: C.text,
    backgroundColor: "#111B2B",
    borderWidth: 1,
    borderColor: "#33445D",
    borderRadius: 14,
  },
  label: { color: C.text, fontSize: 14, fontWeight: "500" },
  briefing: {
    color: C.muted,
    backgroundColor: C.card,
    padding: 18,
    borderRadius: 16,
    fontSize: 13,
    lineHeight: 20,
  },
});
