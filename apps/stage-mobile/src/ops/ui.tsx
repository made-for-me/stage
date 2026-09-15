import type { ReactNode } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
export const C = {
  bg: "#111410",
  surface: "#1d221b",
  text: "#edf1e6",
  muted: "#9ba591",
  accent: "#d9ef88",
  line: "#343d2b",
};
export function Copy({
  children,
  muted = false,
  size = 15,
}: { children: ReactNode; muted?: boolean; size?: number }) {
  return (
    <Text
      selectable
      style={{ color: muted ? C.muted : C.text, fontSize: size, lineHeight: size * 1.5 }}
    >
      {children}
    </Text>
  );
}
export function Label({ children }: { children: ReactNode }) {
  return (
    <Text
      selectable
      style={{ color: C.muted, fontSize: 11, letterSpacing: 1.8, textTransform: "uppercase" }}
    >
      {children}
    </Text>
  );
}
export function Card({ children }: { children: ReactNode }) {
  return (
    <View
      style={{
        padding: 21,
        borderRadius: 24,
        borderCurve: "continuous",
        backgroundColor: C.surface,
        gap: 14,
      }}
    >
      {children}
    </View>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        justifyContent: "center",
        alignItems: "center",
        padding: 14,
        borderRadius: 16,
        borderCurve: "continuous",
        backgroundColor: secondary ? "#2b3325" : C.accent,
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: secondary ? C.text : "#202819", fontWeight: "600", fontSize: 14 }}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  multiline = false,
  secure = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  secure?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={{ gap: 9 }}>
      <Copy size={13}>{label}</Copy>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        multiline={multiline}
        secureTextEntry={secure}
        autoCapitalize={secure ? "none" : "sentences"}
        autoCorrect={!secure}
        maxLength={4000}
        style={{
          color: C.text,
          fontSize: 16,
          padding: 15,
          backgroundColor: "#1d241a",
          borderWidth: 1,
          borderColor: C.line,
          borderRadius: 15,
          minHeight: multiline ? 100 : 50,
          textAlignVertical: "top",
        }}
      />
    </View>
  );
}
