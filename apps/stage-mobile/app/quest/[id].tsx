import { type Connection, getConnection, opsRequest, statusLabel } from "@/ops/client";
import { Button, C, Card, Copy, Field, Label } from "@/ops/ui";
import { useOps } from "@/ops/use-ops";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";

export default function QuestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, refresh } = useOps();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [connection, setConnection] = useState<Connection | null>(null);
  const quest = data?.quests.find((q) => q.id === id);
  useEffect(() => {
    getConnection()
      .then(setConnection)
      .catch(() => setMessage("Could not load the host connection."));
  }, []);
  async function review(decision: "accept" | "revise" | "cancel") {
    setBusy(true);
    setMessage("");
    try {
      await opsRequest("/api/ops/actions", { action: "review", questId: id, decision, note });
      setNote("");
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Review could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 24, paddingBottom: 50, gap: 24 }}
    >
      {(error || message) && <Copy>{error || message}</Copy>}
      {!quest ? (
        <Copy muted>{data ? "Quest not found." : "Loading quest…"}</Copy>
      ) : (
        <>
          <Label>{quest.stalled ? "Worker disconnected" : statusLabel[quest.status]}</Label>
          <Copy size={32}>{quest.title}</Copy>
          <Copy muted>{quest.objective}</Copy>
          <Copy muted size={12}>
            {quest.assignedTo} · {quest.branch}
          </Copy>
          {quest.evidence ? (
            <>
              <Label>Captured result · {quest.evidence.sha.slice(0, 8)}</Label>
              {data?.scenes
                .filter((s) => quest.evidence?.sceneIds.includes(s.id))
                .map((scene) => (
                  <Card key={scene.id}>
                    <Copy>{scene.title}</Copy>
                    {connection && (
                      <Image
                        accessibilityLabel={scene.title}
                        source={{
                          uri: new URL(scene.imageUrl, connection.url).href,
                          headers: connection.token
                            ? { Authorization: `Bearer ${connection.token}` }
                            : {},
                        }}
                        style={{ width: "100%", aspectRatio: 0.52, borderRadius: 22 }}
                        contentFit="contain"
                        onError={() =>
                          setMessage("Could not load a captured screen. Refresh the connection.")
                        }
                      />
                    )}
                  </Card>
                ))}
              <Copy>{quest.evidence.summary}</Copy>
            </>
          ) : (
            <Card>
              <Copy size={23}>The result will appear here.</Copy>
              <Copy muted>
                {quest.status === "queued"
                  ? `Waiting for ${quest.assignedTo} to claim this quest.`
                  : "The worker can report progress, open previews, and attach captured screens."}
              </Copy>
            </Card>
          )}
          <Label>What success looks like</Label>
          {quest.criteria.map((criterion, i) => (
            <Copy key={`${i}-${criterion}`} muted>
              ○ {criterion}
            </Copy>
          ))}
          {!["done", "cancelled"].includes(quest.status) && (
            <Card>
              <Field
                label="Your feedback"
                value={note}
                onChangeText={setNote}
                multiline
                placeholder="What worked, or what needs changing?"
              />
              {quest.status === "review" && (
                <Button
                  title="Accept result"
                  disabled={busy || !!error || !note.trim()}
                  onPress={() => void review("accept")}
                />
              )}
              {["review", "blocked"].includes(quest.status) && (
                <Button
                  title={quest.status === "blocked" ? "Resolve & retry" : "Request changes"}
                  secondary
                  disabled={busy || !!error || !note.trim()}
                  onPress={() => void review("revise")}
                />
              )}
              <Button
                title="Cancel quest"
                secondary
                disabled={busy || !!error || !note.trim()}
                onPress={() => void review("cancel")}
              />
            </Card>
          )}
          <Label>Activity</Label>
          {[...quest.events].reverse().map((event) => (
            <View
              key={event.id}
              style={{ gap: 7, borderBottomWidth: 1, borderColor: C.line, paddingBottom: 18 }}
            >
              <Copy size={13}>
                {event.actor} ·{" "}
                {new Date(event.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Copy>
              <Copy muted size={13}>
                {event.message}
              </Copy>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}
