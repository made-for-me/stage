import type { PreviewModuleSupport } from "../types/index.js";

const COMPATIBILITY_REGISTRY: Record<string, PreviewModuleSupport> = {
  "expo-router": {
    module: "expo-router",
    status: "shimmed",
    reason: "Stage injects a lightweight router shim for isolated route rendering.",
    replacement: "/__stage__/shims/expo-router.tsx",
  },
  "expo-haptics": {
    module: "expo-haptics",
    status: "shimmed",
    reason: "Haptics are replaced with no-op shims inside browser preview.",
    replacement: "/__stage__/shims/expo-haptics.ts",
  },
  "expo-splash-screen": {
    module: "expo-splash-screen",
    status: "shimmed",
    reason: "Splash screen lifecycle is reduced to no-op helpers for preview boot.",
    replacement: "/__stage__/shims/expo-splash-screen.ts",
  },
  "expo-symbols": {
    module: "expo-symbols",
    status: "shimmed",
    reason: "Symbols render as lightweight HTML placeholders in preview.",
    replacement: "/__stage__/shims/expo-symbols.tsx",
  },
  "expo-camera": {
    module: "expo-camera",
    status: "unsupported",
    reason: "Camera access is not available in the browser preview sandbox.",
  },
  "expo-av": {
    module: "expo-av",
    status: "unsupported",
    reason: "Native audio/video primitives do not map reliably to the preview runtime.",
  },
  "react-native-maps": {
    module: "react-native-maps",
    status: "unsupported",
    reason: "Map rendering requires native surfaces that Stage does not emulate.",
  },
  "react-native-webview": {
    module: "react-native-webview",
    status: "unsupported",
    reason: "Nested native web views are not supported inside Stage preview.",
  },
};

export function getCompatibilityRegistry(): Record<string, PreviewModuleSupport> {
  return COMPATIBILITY_REGISTRY;
}

export function getModuleSupport(moduleName: string): PreviewModuleSupport | null {
  return COMPATIBILITY_REGISTRY[moduleName] ?? null;
}
