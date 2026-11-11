import { Pressable, View } from "react-native";
import type { ExecutionSession } from "./client";
import { C, Copy, Label } from "./ui";

export function ExecutionPicker({
  sessions,
  value,
  onChange,
}: {
  sessions: ExecutionSession[];
  value: string;
  onChange: (value: string) => void;
}) {
  const choices = [
    { id: "", label: "Source checkout (default)" },
    ...sessions.map((session) => ({
      id: session.id,
      label: `${session.target} preview · ${session.id} · ${session.sha.slice(0, 8)}`,
    })),
  ];
  return (
    <View style={{ gap: 10 }}>
      <Label>Run in</Label>
      {choices.map((choice) => (
        <Pressable
          key={choice.id}
          accessibilityRole="radio"
          accessibilityLabel={choice.label}
          accessibilityState={{ checked: value === choice.id }}
          onPress={() => onChange(choice.id)}
          style={{
            padding: 15,
            borderRadius: 14,
            backgroundColor: value === choice.id ? "#344128" : C.surface,
          }}
        >
          <Copy size={13}>{choice.label}</Copy>
        </Pressable>
      ))}
      {value !== "" && !sessions.some((session) => session.id === value) && (
        <Copy size={13}>
          Previous preview unavailable. Choose a current preview or the source checkout.
        </Copy>
      )}
      <Copy muted size={12}>
        {sessions.length
          ? "Selecting the source checkout clears the previous preview selection."
          : "No matching live preview. Select the source checkout to continue."}
      </Copy>
    </View>
  );
}
