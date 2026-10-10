import type { ExpoConfig } from "expo/config";

// Single source of truth for app identity (see /docs/mobile.md). The name, slug,
// scheme, and identifiers are boilerplate placeholders until the store
// identifiers are decided. Everything in this file ends up in the public app
// bundle: never read or embed secrets here. Environment values reach the app
// through EXPO_PUBLIC_* variables parsed in src/config/env.ts.
const config: ExpoConfig = {
  name: "Signal One Sound",
  slug: "signalone",
  scheme: "signalone",
  version: "0.0.0",
  owner: "team-jesus",
  platforms: ["ios", "android"],
  // File-based navigation (docs/mobile.md): screens live in the app/ folder.
  plugins: [
    "expo-router",
    // The location prompt wording (shown only when the person taps "Use my location").
    ["expo-location", { locationWhenInUsePermission: "Signal One Sound uses your location only to find gatherings near you. It is not stored." }],
  ],
  // Links this app to its Expo (EAS) project. An identifier, not a secret.
  extra: { eas: { projectId: "95bb0df7-18b3-4ba9-96fa-a4ac4d1ad3df" } },
  orientation: "portrait",
  userInterfaceStyle: "dark",
  ios: {
    bundleIdentifier: "com.example.signalone",
    supportsTablet: true,
  },
  android: {
    package: "com.example.signalone",
  },
};

export default config;
