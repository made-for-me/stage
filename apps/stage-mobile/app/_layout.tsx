import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerTransparent: true,
          headerShadowVisible: false,
          headerLargeTitle: true,
          headerLargeTitleShadowVisible: false,
          headerTitleStyle: { color: "#F7F8FF" },
          headerLargeStyle: { backgroundColor: "transparent" },
          contentStyle: { backgroundColor: "#03050A" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Stage" }} />
      </Stack>
    </>
  );
}
