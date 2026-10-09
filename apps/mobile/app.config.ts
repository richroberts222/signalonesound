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
  // Links this app to its Expo (EAS) project. An identifier, not a secret.
  extra: { eas: { projectId: "95bb0df7-18b3-4ba9-96fa-a4ac4d1ad3df" } },
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: "com.example.signalone",
    supportsTablet: true,
  },
  android: {
    package: "com.example.signalone",
  },
};

export default config;
