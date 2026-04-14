import React from "react";
import { Text } from "react-native";

export function SymbolView(props: { size?: number; tintColor?: string }) {
  const size = props.size ?? 16;
  const tintColor = props.tintColor ?? "#999999";
  return (
    <Text
      style={{
        fontSize: size,
        lineHeight: size,
        color: tintColor,
        textAlign: "center",
      }}
    >
      ●
    </Text>
  );
}