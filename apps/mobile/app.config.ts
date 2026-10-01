import type { ExpoConfig } from "expo/config";

// Single source of truth for app identity (see /docs/mobile.md). The name, slug,
// scheme, and identifiers are boilerplate placeholders until the store
// identifiers are decided. Everything in this file ends up in the public app
// bundle: never read or embed secrets here. Environment values reach the app
// through EXPO_PUBLIC_* variables parsed in src/config/env.ts.
const config: ExpoConfig = {
  name: "Signal One",
  slug: "signalone",
  scheme: "signalone",
  version: "0.0.0",
  platforms: ["ios", "android"],
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
