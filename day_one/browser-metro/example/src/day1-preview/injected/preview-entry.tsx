import React from "react";
import { AppRegistry, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "/project/src/core/design-system/theme/provider.tsx";
import WelcomeScreen from "/project/app/(auth)/welcome.tsx";

function PreviewApp() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <View style={{ flex: 1 }}>
          <WelcomeScreen />
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

AppRegistry.registerComponent("Day1PreviewApp", () => PreviewApp);

const rootTag = document.getElementById("root");
if (!rootTag) {
  throw new Error("Missing iframe root element");
}
AppRegistry.runApplication("Day1PreviewApp", { rootTag, initialProps: {} });

export default PreviewApp;