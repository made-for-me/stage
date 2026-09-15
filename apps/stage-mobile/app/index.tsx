import { statusLabel } from "@/ops/client";
import { Button, C, Card, Copy, Label } from "@/ops/ui";
import { useOps } from "@/ops/use-ops";
import { router } from "expo-router";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

export default function Operations() {
  const { data, error, loading, refresh } = useOps();
  const needsReview = data?.quests.filter((q) => q.status === "review").length ?? 0;
  const agents = [
    ...new Set([
      "grok",
      ...(data?.quests.map((q) => q.assignedTo) ?? []),
      ...(data?.agents.map((a) => a.id) ?? []),
    ]),
  ];
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={C.accent} />
      }
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 22, paddingBottom: 50, gap: 24 }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Label>ClubHall studio</Label>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/connect")}
          style={{ padding: 12 }}
        >
          <Copy size={13}>{error || !data ? "Connect host ↗" : "Host connected ↗"}</Copy>
        </Pressable>
      </View>
      <View style={{ gap: 14 }}>
        <Text
          selectable
          style={{
            color: C.text,
            fontSize: 39,
            lineHeight: 43,
            letterSpacing: -1.8,
            fontWeight: "500",
          }}
        >
          {needsReview ? "Your next build\nis ready to try." : "Your app,\nin motion."}
        </Text>
        <Copy muted>
          {needsReview
            ? `${needsReview} ${needsReview === 1 ? "result is" : "results are"} waiting for your review.`
            : "Set a direction. Watch the work. Try the result."}
        </Copy>
      </View>
      {error && (
        <Card>
          <Copy>{error}</Copy>
          {data && (
            <Copy muted>
              Showing the last received state. Actions are unavailable until reconnected.
            </Copy>
          )}
          <Button title="Connect Stage" onPress={() => router.push("/connect")} />
        </Card>
      )}
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        {agents.map((id) => {
          const agent = data?.agents.find((a) => a.id === id);
          const online = !error && agent?.online;
          return (
            <View
              key={id}
              style={{
                backgroundColor: C.surface,
                borderRadius: 18,
                padding: 16,
                flexGrow: 1,
                gap: 8,
              }}
            >
              <Copy>{id}</Copy>
              <Text selectable style={{ fontSize: 12, color: online ? C.accent : C.muted }}>
                ● {online ? "Connected" : agent ? "Offline" : "Not connected"}
              </Text>
            </View>
          );
        })}
      </View>
      <Button
        title="+  New quest"
        disabled={!data || !!error}
        onPress={() => router.push("/new-quest")}
      />
      <Label>Quests</Label>
      {!data?.quests.length && (
        <Card>
          <Text selectable style={{ color: C.accent, fontSize: 52 }}>
            ◈
          </Text>
          <Copy size={22}>A place for the next thing.</Copy>
          <Copy muted>
            Create a quest for Grok or another worker. Its actions and captured screens will appear
            here.
          </Copy>
        </Card>
      )}
      {data?.quests.map((q) => (
        <Pressable
          key={q.id}
          accessibilityRole="button"
          accessibilityLabel={`Open quest: ${q.title}`}
          onPress={() => router.push({ pathname: "/quest/[id]", params: { id: q.id } })}
        >
          <Card>
            <Label>{q.stalled ? "Worker disconnected" : statusLabel[q.status]}</Label>
            <Copy size={23}>{q.title}</Copy>
            <Copy muted size={13}>
              {q.assignedTo} · {q.branch}
            </Copy>
            <View style={{ height: 2, backgroundColor: C.line }} />
            <Copy muted size={13}>
              {q.events.at(-1)?.message}
            </Copy>
          </Card>
        </Pressable>
      ))}
      <View style={{ gap: 12 }}>
        <Label>Workspace</Label>
        <Button title="Branch previews ↗" secondary onPress={() => router.push("/branches")} />
        <Button title="Device Hub ↗" secondary onPress={() => router.push("/devices")} />
        <Button
          title="Previous local missions ↗"
          secondary
          onPress={() => router.push("/local-missions")}
        />
      </View>
    </ScrollView>
  );
}
