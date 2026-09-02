import type { ConfigContext, ExpoConfig } from "expo/config";

const projectId = process.env.STAGE_EAS_PROJECT_ID ?? "350f40bc-c260-4c04-a3b3-f86571fbbefd";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Stage",
  slug: "stage-mobile",
  owner: process.env.STAGE_EXPO_OWNER ?? "madeforme",
  version: "0.1.0",
  orientation: "portrait",
  scheme: "stage",
  userInterfaceStyle: "dark",
  runtimeVersion: "stage-clubhall-sdk57-v1",
  updates: {
    url: `https://u.expo.dev/${projectId}`,
    requestHeaders: {
      "expo-channel-name": "stage-shell",
    },
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: process.env.STAGE_IOS_BUNDLE_ID ?? "com.madeforme.stage",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-secure-store",
    "expo-location",
    "expo-splash-screen",
    "expo-web-browser",
    "expo-image",
    "expo-updates",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: { projectId },
    stage: {
      projectId: "clubhall",
      channel: "stage-shell",
      ...(process.env.EXPO_PUBLIC_STAGE_API_URL
        ? { apiUrl: process.env.EXPO_PUBLIC_STAGE_API_URL }
        : {}),
      baselineBranch: "recovery/canonical-mainline-20260902",
      trackedBranches: [
        "recovery/canonical-mainline-20260902",
        "main",
      ],
    },
  },
});
