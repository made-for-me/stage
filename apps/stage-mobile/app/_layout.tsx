import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: true,
          headerTransparent: false,
          headerStyle: { backgroundColor: "#111410" },
          headerShadowVisible: false,
          headerLargeTitle: true,
          headerLargeTitleShadowVisible: false,
          headerTitleStyle: { color: "#F7F8FF" },
          headerLargeStyle: { backgroundColor: "transparent" },
          headerTintColor: "#d9ef88",
          contentStyle: { backgroundColor: "#111410" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Stage" }} />
        <Stack.Screen name="connect" options={{ title: "Connect", headerLargeTitle: false }} />
        <Stack.Screen name="new-quest" options={{ title: "New quest", headerLargeTitle: false }} />
        <Stack.Screen name="quest/[id]" options={{ title: "Quest", headerLargeTitle: false }} />
        <Stack.Screen name="branches" options={{ title: "Branches" }} />
        <Stack.Screen name="devices" options={{ title: "Devices" }} />
        <Stack.Screen
          name="local-missions"
          options={{ title: "Local missions", headerLargeTitle: false }}
        />
      </Stack>
    </>
  );
}
