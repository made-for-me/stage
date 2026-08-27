import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import * as Updates from "expo-updates";
import { type PropsWithChildren, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";

type Branch = {
  projectId: string;
  name: string;
  sha: string | null;
  compatibility: "compatible" | "incompatible" | "unknown";
};

type StageExtra = {
  projectId: string;
  branch: string;
  sha: string;
  channel: string;
  apiUrl?: string;
  trackedBranches: string[];
};

export function StageOverlay({ children }: PropsWithChildren) {
  const extra = Constants.expoConfig?.extra?.stage as StageExtra;
  const [visible, setVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>(() =>
    (extra.trackedBranches ?? [extra.branch]).map((name) => ({
      projectId: extra.projectId,
      name,
      sha: name === extra.branch ? extra.sha : null,
      compatibility: name === extra.branch ? "compatible" : "unknown",
    })),
  );

  const ordered = useMemo(
    () =>
      [...branches].sort((left, right) =>
        left.name === extra.branch
          ? -1
          : right.name === extra.branch
            ? 1
            : left.name.localeCompare(right.name),
      ),
    [branches, extra.branch],
  );

  async function refresh() {
    if (!extra.apiUrl) return;
    setRefreshing(true);
    const controller = new AbortController();
    try {
      const response = await fetch(new URL("/api/stage", extra.apiUrl), {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Stage respondeu HTTP ${response.status}.`);
      const snapshot = (await response.json()) as { branches?: Branch[] };
      if (!Array.isArray(snapshot.branches)) throw new Error("Catálogo de branches inválido.");
      setBranches(snapshot.branches.filter((branch) => branch.projectId === extra.projectId));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar as branches.");
    } finally {
      setRefreshing(false);
    }
    return () => controller.abort();
  }

  async function open(branch: Branch) {
    if (branch.compatibility === "incompatible" || opening) return;
    const channel = branchChannel(branch.name);
    setOpening(branch.name);
    setError(null);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Updates.setUpdateRequestHeadersOverride({ "expo-channel-name": channel });
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) throw new Error("Essa branch ainda não tem um preview publicado.");
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (cause) {
      Updates.setUpdateRequestHeadersOverride({ "expo-channel-name": extra.channel });
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir a branch.");
      setOpening(null);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      {children}
      <Pressable
        accessibilityLabel="Abrir Stage"
        onPress={() => {
          setVisible(true);
          void refresh();
        }}
        style={({ pressed }) => ({
          position: "absolute",
          right: 14,
          top: 54,
          width: 42,
          height: 42,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 21,
          backgroundColor: "rgba(10,18,34,0.88)",
          borderWidth: 1,
          borderColor: "rgba(111,169,255,0.55)",
          opacity: pressed ? 0.7 : 1,
          boxShadow: "0 10px 30px rgba(42,120,255,0.34)",
        })}
      >
        <Text style={{ color: "#78ABFF", fontSize: 14, fontWeight: "800" }}>S</Text>
      </Pressable>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setVisible(false)}
      >
        <FlatList
          contentInsetAdjustmentBehavior="automatic"
          style={{ flex: 1, backgroundColor: "#03050A" }}
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40, gap: 10 }}
          data={ordered}
          keyExtractor={(item) => item.name}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#4B93FF" />
          }
          ListHeaderComponent={
            <View style={{ paddingTop: 24, paddingBottom: 12, gap: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ gap: 4 }}>
                  <Text selectable style={{ color: "#F7F8FF", fontSize: 28, fontWeight: "700" }}>
                    Stage
                  </Text>
                  <Text selectable style={{ color: "#8F96A7", fontSize: 12 }}>
                    {extra.branch} · {extra.sha.slice(0, 7)}
                  </Text>
                </View>
                <Pressable onPress={() => setVisible(false)} style={{ padding: 12 }}>
                  <Text style={{ color: "#4B93FF", fontSize: 16 }}>Fechar</Text>
                </Pressable>
              </View>
              {error ? (
                <Text selectable style={{ color: "#FFB340", fontSize: 12 }}>
                  {error}
                </Text>
              ) : null}
            </View>
          }
          renderItem={({ item }) => {
            const incompatible = item.compatibility === "incompatible";
            const active = item.name === extra.branch;
            return (
              <Pressable
                disabled={incompatible || Boolean(opening) || active}
                onPress={() => void open(item)}
                style={({ pressed }) => ({
                  minHeight: 68,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 15,
                  borderRadius: 18,
                  borderCurve: "continuous",
                  backgroundColor: active ? "rgba(28,56,99,0.9)" : "rgba(17,23,36,0.94)",
                  borderWidth: 1,
                  borderColor: active ? "rgba(75,147,255,0.6)" : "rgba(255,255,255,0.07)",
                  opacity: incompatible ? 0.5 : pressed ? 0.72 : 1,
                })}
              >
                {opening === item.name ? (
                  <ActivityIndicator color="#4B93FF" />
                ) : (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: incompatible ? "#FF6961" : active ? "#55DB77" : "#4B93FF",
                    }}
                  />
                )}
                <View style={{ flex: 1, gap: 4 }}>
                  <Text
                    selectable
                    numberOfLines={2}
                    style={{ color: "#F7F8FF", fontSize: 14, fontWeight: "600" }}
                  >
                    {item.name}
                  </Text>
                  <Text selectable style={{ color: "#8F96A7", fontSize: 10 }}>
                    {active
                      ? "aberta agora"
                      : incompatible
                        ? "runtime incompatível"
                        : (item.sha?.slice(0, 7) ?? "preview remoto")}
                  </Text>
                </View>
                <Text style={{ color: "#687084", fontSize: 21 }}>›</Text>
              </Pressable>
            );
          }}
        />
      </Modal>
    </View>
  );
}

function branchChannel(branch: string): string {
  const slug = branch
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
  let hash = 5381;
  for (let index = 0; index < branch.length; index += 1)
    hash = (hash * 33) ^ branch.charCodeAt(index);
  return `branch-${slug || "preview"}-${(hash >>> 0).toString(36).padStart(6, "0").slice(-6)}`;
}
