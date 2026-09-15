import { opsRequest } from "@/ops/client";
import { Button, C, Copy, Field, Label } from "@/ops/ui";
import { useOps } from "@/ops/use-ops";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
export default function NewQuest() {
  const { data, error } = useOps();
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [criteria, setCriteria] = useState("");
  const [agent, setAgent] = useState("grok");
  const [branchIndex, setBranch] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function create() {
    const branch = data?.branches[branchIndex];
    if (!branch) return;
    setBusy(true);
    setMessage("");
    try {
      await opsRequest("/api/ops/actions", {
        action: "create",
        title,
        objective,
        criteria: criteria.split("\n").filter((c) => c.trim()),
        assignedTo: agent,
        projectId: branch.projectId,
        branch: branch.name,
      });
      router.back();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not queue quest.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 24, gap: 22, paddingBottom: 50 }}
    >
      <Copy size={27}>What should happen next?</Copy>
      <Field
        label="Quest"
        value={title}
        onChangeText={setTitle}
        placeholder="Make Replay feel great to watch"
      />
      <Field label="Desired outcome" value={objective} onChangeText={setObjective} multiline />
      <Field
        label="Done when — one criterion per line"
        value={criteria}
        onChangeText={setCriteria}
        multiline
      />
      <Label>Branch</Label>
      <View style={{ gap: 10 }}>
        {data?.branches.map((b, i) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: branchIndex === i }}
            key={`${b.projectId}/${b.name}`}
            onPress={() => setBranch(i)}
            style={{
              padding: 15,
              borderRadius: 14,
              backgroundColor: i === branchIndex ? "#344128" : C.surface,
            }}
          >
            <Copy size={13}>
              {b.projectId} / {b.name}
            </Copy>
          </Pressable>
        ))}
      </View>
      <Field label="Assigned agent" value={agent} onChangeText={setAgent} />
      {(message || error) && <Copy>{message || error}</Copy>}
      <Button
        title={busy ? "Queueing…" : "Queue quest →"}
        disabled={
          busy ||
          !!error ||
          !data?.branches.length ||
          !title.trim() ||
          !objective.trim() ||
          !criteria.trim() ||
          !agent.trim()
        }
        onPress={() => void create()}
      />
    </ScrollView>
  );
}
