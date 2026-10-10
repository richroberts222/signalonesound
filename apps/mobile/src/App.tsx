import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppAuthProvider } from "./auth/AppAuthProvider";
import { getMobileEnv } from "./config/env";

// The app's providers (docs/mobile.md): it checks the configuration and starts Clerk, then shows the
// screens inside it. It does not put sign-in in front of the app: browsing needs no account (S5 AC2), and
// sign-in lives on the Account tab. Calls to the shared API use the session token as a bearer token
// through the shared client in @signalone/validation.
export default function App({ children }: { children: ReactNode }) {
  let env: ReturnType<typeof getMobileEnv>;
  try {
    env = getMobileEnv();
  } catch (error) {
    // Messages name the offending variables and never include values.
    return <Message text={error instanceof Error ? error.message : "Invalid configuration."} />;
  }
  if (!env.clerkPublishableKey) {
    return <Message text="Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. See docs/environment.md." />;
  }
  return (
    <AppAuthProvider publishableKey={env.clerkPublishableKey}>
      {children}
      <StatusBar style="auto" />
    </AppAuthProvider>
  );
}

function Message({ text }: { text: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.status}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  status: { textAlign: "center" },
});
