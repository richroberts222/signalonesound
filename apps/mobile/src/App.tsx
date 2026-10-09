import { useAuth } from "@clerk/expo";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { createApiClient, createHelloClient } from "@signalone/validation";

import { AppAuthProvider } from "./auth/AppAuthProvider";
import { SignInScreen } from "./auth/SignInScreen";
import { getMobileEnv } from "./config/env";
import { HelloScreen } from "./hello/HelloScreen";

// S0 walking skeleton (docs/features/s0-walking-skeleton.md): sign in with Clerk, then call the same
// shared API as the web through the shared client with the session token as a bearer token. No
// navigation library yet: the tab navigation arrives with the first real screens (S5).
export default function App() {
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
      <Root baseUrl={env.apiBaseUrl} />
      <StatusBar style="auto" />
    </AppAuthProvider>
  );
}

function Root({ baseUrl }: { baseUrl: string }) {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const client = useMemo(
    () => createHelloClient(createApiClient({ baseUrl, getToken: () => getToken() })),
    // getToken keeps a stable identity for a signed-in session; recreate only when the user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseUrl, isSignedIn],
  );

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator accessibilityLabel="Loading" />
      </View>
    );
  }
  return (
    <View style={styles.container}>
      {isSignedIn ? <HelloScreen client={client} onSignOut={() => void signOut()} /> : <SignInScreen />}
    </View>
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
