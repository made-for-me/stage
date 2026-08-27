import { embeddedBranches, fetchBranches } from "@/branch-catalog";
import { runtimeConfig } from "@/runtime-config";
import { switchPreview } from "@/switch-preview";
import type { StageBranch } from "@/types";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as Updates from "expo-updates";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  PlatformColor,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";

const colors = {
  background: "#03050A",
  surface: "rgba(17, 23, 36, 0.92)",
  line: "rgba(255,255,255,0.075)",
  text: "#F7F8FF",
  muted: "#8F96A7",
  blue: "#4B93FF",
  green: "#55DB77",
  amber: "#FFB340",
  red: "#FF6961",
};

export default function StageHome() {
  const config = useMemo(runtimeConfig, []);
  const [branches, setBranches] = useState(() => embeddedBranches(config));
  const [refreshing, setRefreshing] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const manifest = Updates.manifest as { extra?: { stage?: { channel?: string } } } | null;
  const activeChannel = manifest?.extra?.stage?.channel ?? config.channel;

  const refresh = useCallback(async () => {
    const controller = new AbortController();
    setRefreshing(true);
    try {
      setBranches(await fetchBranches(config, controller.signal));
      setMessage(null);
    } catch (error) {
      setMessage(
        `${error instanceof Error ? error.message : "Não foi possível atualizar."} Mostrando o catálogo salvo no app.`,
      );
    } finally {
      setRefreshing(false);
    }
    return () => controller.abort();
  }, [config]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openBranch = useCallback(
    async (branch: StageBranch) => {
      if (branch.compatibility === "incompatible" || opening) return;
      setOpening(branch.name);
      setMessage(null);
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await switchPreview(branch.channel, activeChannel);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível abrir a branch.");
        setOpening(null);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [activeChannel, opening],
  );

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 42, gap: 12 }}
      data={branches}
      keyExtractor={(item) => item.name}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue} />
      }
      ListHeaderComponent={
        <View style={{ gap: 18, paddingTop: 14, paddingBottom: 8 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 13,
              padding: 16,
              borderRadius: 22,
              borderCurve: "continuous",
              backgroundColor: "rgba(27, 44, 76, 0.62)",
              boxShadow: "0 18px 46px rgba(23, 105, 255, 0.18)",
            }}
          >
            <Image
              source={require("../../../assets/ar2-orb.png")}
              style={{ width: 46, height: 46, borderRadius: 23 }}
            />
            <View style={{ flex: 1, gap: 3 }}>
              <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
                ClubHall on device
              </Text>
              <Text selectable style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>
                Toque em uma branch para instalar o preview e reiniciar o app nela.
              </Text>
            </View>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.green }} />
          </View>
          {message ? (
            <Text
              selectable
              style={{
                color: colors.amber,
                backgroundColor: "rgba(255, 179, 64, 0.09)",
                padding: 12,
                borderRadius: 14,
                borderCurve: "continuous",
                fontSize: 12,
                lineHeight: 17,
              }}
            >
              {message}
            </Text>
          ) : null}
          <Text selectable style={{ color: colors.muted, fontSize: 12 }}>
            {branches.length} branches · runtime SDK 57
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const incompatible = item.compatibility === "incompatible";
        const isOpening = opening === item.name;
        const isActive = activeChannel === item.channel;
        const statusColor = incompatible
          ? colors.red
          : item.compatibility === "compatible"
            ? colors.green
            : colors.amber;
        return (
          <Pressable
            disabled={incompatible || Boolean(opening)}
            onPress={() => void openBranch(item)}
            style={({ pressed }) => ({
              minHeight: 88,
              flexDirection: "row",
              alignItems: "center",
              gap: 13,
              padding: 16,
              borderRadius: 20,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: isActive ? "rgba(75,147,255,0.62)" : colors.line,
              backgroundColor: isActive ? "rgba(23,47,86,0.88)" : colors.surface,
              opacity: incompatible ? 0.55 : pressed ? 0.76 : 1,
              transform: [{ scale: pressed ? 0.985 : 1 }],
            })}
          >
            <View
              style={{
                width: 38,
                height: 38,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 13,
                borderCurve: "continuous",
                backgroundColor: "rgba(75,147,255,0.12)",
              }}
            >
              {isOpening ? (
                <ActivityIndicator color={colors.blue} />
              ) : (
                <Text style={{ color: colors.blue, fontSize: 18 }}>↗</Text>
              )}
            </View>
            <View style={{ flex: 1, gap: 7 }}>
              <Text
                selectable
                numberOfLines={2}
                style={{ color: colors.text, fontSize: 14, lineHeight: 19, fontWeight: "600" }}
              >
                {item.name}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                <View
                  style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: statusColor }}
                />
                <Text selectable style={{ color: colors.muted, fontSize: 10 }}>
                  {incompatible
                    ? "runtime incompatível"
                    : isActive
                      ? "aberta agora"
                      : item.sha
                        ? item.sha.slice(0, 7)
                        : "aguardando catálogo"}
                </Text>
              </View>
            </View>
            <Text style={{ color: PlatformColor("secondaryLabel"), fontSize: 20 }}>›</Text>
          </Pressable>
        );
      }}
    />
  );
}
