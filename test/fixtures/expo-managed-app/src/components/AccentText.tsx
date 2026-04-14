import type React from "react";
import { Text } from "react-native";

export function AccentText(props: { children: React.ReactNode }) {
  return (
    <Text style={{ color: "#3854b3", fontSize: 16, fontWeight: "600" }}>{props.children}</Text>
  );
}
