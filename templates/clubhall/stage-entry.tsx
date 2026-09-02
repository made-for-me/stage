import { registerRootComponent } from "expo";
import { ExpoRoot } from "expo-router";
import { StageOverlay } from "./stage-overlay";

export function App() {
  const context = require.context("./app");
  return (
    <StageOverlay>
      <ExpoRoot context={context} />
    </StageOverlay>
  );
}

registerRootComponent(App);
