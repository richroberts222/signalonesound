import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

import { getMobileEnv } from "./config/env";
import { ProofItemsScreen } from "./proof/ProofItemsScreen";
import { createMobileProofClient } from "./proof/proofClient";

// Minimal shell that proves the app starts, compiles, loads validated
// configuration, and can call the shared API client (generic proof feature,
// Issue 49). No domain screens or navigation yet.
export default function App() {
  let status: string;
  let proof: ReturnType<typeof createMobileProofClient> | null = null;
  try {
    const env = getMobileEnv();
    status = `Environment: ${env.appEnv}`;
    proof = createMobileProofClient({ baseUrl: env.apiBaseUrl });
  } catch (error) {
    // Messages name the offending variables and never include values.
    status = error instanceof Error ? error.message : "Invalid configuration.";
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Signal One</Text>
      <Text style={styles.status}>{status}</Text>
      {proof && <ProofItemsScreen client={proof} />}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "600" },
  status: { marginTop: 12, textAlign: "center" },
});
