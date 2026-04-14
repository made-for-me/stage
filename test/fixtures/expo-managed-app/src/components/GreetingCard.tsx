import React from "react";
import { Text, View } from "react-native";
import { fixtureCopy } from "./shared/copy";

export function GreetingCard() {
  return (
    <View
      style={{
        padding: 18,
        borderRadius: 18,
        backgroundColor: "#ffffff",
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "700", color: "#172235" }}>Stage Fixture</Text>
      <Text style={{ color: "#516074" }}>{fixtureCopy}</Text>
    </View>
  );
}
