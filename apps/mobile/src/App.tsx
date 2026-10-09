import { useAuth } from "@clerk/expo";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { AppAuthProvider } from "./auth/AppAuthProvider";
import { SignInScreen } from "./auth/SignInScreen";
import { SignedInScreen } from "./auth/SignedInScreen";
import { getMobileEnv } from "./config/env";

// Sign in with Clerk (docs/mobile.md). Calls to the shared API use the session token as a bearer
// token through the shared client in @signalone/validation. No navigation library yet: the tabs
// arrive with the first real screens (S5).
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
      <Root />
      <StatusBar style="auto" />
    </AppAuthProvider>
  );
}

function Root() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator accessibilityLabel="Loading" />
        <Text style={styles.status}>Connecting to sign-in...</Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      {isSignedIn ? <SignedInScreen onSignOut={() => void signOut()} /> : <SignInScreen />}
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
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  status: { textAlign: "center" },
});
