import { GreetingCard } from "@/components/GreetingCard";
import { Link } from "expo-router";
import React from "react";
import { Text, View } from "react-native";
import { AccentText } from "../src/components/AccentText";
import { readStagePreviewContext } from "../src/stage-preview";

export default function IndexRoute() {
  const preview = readStagePreviewContext();

  return (
    <View
      style={{
        flex: 1,
        padding: 24,
        justifyContent: "center",
        gap: 16,
        backgroundColor: "#f4f7fb",
      }}
    >
      <GreetingCard />
      <AccentText>Stage renders this Expo route directly in the browser.</AccentText>
      <Text>{`Variant: ${preview.variant}`}</Text>
      <Text>{`Mock headline: ${String(preview.mockData.headline ?? "n/a")}`}</Text>
      <Text>{`Mock user: ${String(preview.params.user ?? "guest")}`}</Text>
      <Link href="/unsupported">Unsupported route</Link>
      <Text accessibilityRole="header">Fixture route ready</Text>
    </View>
  );
}
