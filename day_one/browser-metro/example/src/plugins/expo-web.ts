import type { BundlerPlugin } from "browser-metro";

// Minimal stub expo-web plugin for Day 1 preview.
// In a full implementation, this plugin would provide aliases and shims for Expo modules
// to their web-compatible counterparts. For the Day 1 local preview, we only need
// limited shims provided separately via shimMap in the manifest.

export const expoWebPlugin: BundlerPlugin = {
  name: "expo-web-stub",
  resolveRequest() {
    return null;
  },
  moduleAliases() {
    // Provide any default aliases as needed.
    return {};
  },
};