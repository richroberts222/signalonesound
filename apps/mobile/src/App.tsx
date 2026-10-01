import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

import { getMobileEnv } from "./config/env";

// Minimal shell that proves the app starts, compiles, and loads validated
// configuration. No domain screens, navigation, or data access yet.
export default function App() {
  let status: string;
  try {
    const env = getMobileEnv();
    status = `Environment: ${env.appEnv}`;
  } catch (error) {
    // Messages name the offending variables and never include values.
    status = error instanceof Error ? error.message : "Invalid configuration.";
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Signal One</Text>
      <Text style={styles.status}>{status}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "600" },
  status: { marginTop: 12, textAlign: "center" },
});
