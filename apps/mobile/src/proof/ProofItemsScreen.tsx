import { useState } from "react";
import { Button, FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import type { ProofItem } from "@signalone/validation";

import type { createMobileProofClient } from "./proofClient";

// Intentionally minimal infrastructure proof (Issue 49), not product UI. It only
// calls the shared API client and renders the standard Result; the server makes
// every decision. Not exercised on a device in CI (docs/mobile.md).
export function ProofItemsScreen({ client }: { client: ReturnType<typeof createMobileProofClient> }) {
  const [items, setItems] = useState<ProofItem[]>([]);
  const [label, setLabel] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const result = await client.list();
    if (result.ok) {
      setItems(result.data.items);
      setMessage(`Loaded ${result.data.items.length} item(s)`);
    } else {
      setMessage(`${result.error.code}: ${result.error.message}`);
    }
  }

  async function add() {
    const result = await client.create({ label });
    if (result.ok) {
      setLabel("");
      await refresh();
    } else {
      setMessage(`${result.error.code}: ${result.error.fieldErrors?.label?.[0] ?? result.error.message}`);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Proof items</Text>
      <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="Label" />
      <Button title="Add item" onPress={add} />
      <Button title="Load items" onPress={refresh} />
      {message && <Text accessibilityRole="alert">{message}</Text>}
      <FlatList data={items} keyExtractor={(i) => i.id} renderItem={({ item }) => <Text>{item.label}</Text>} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: "stretch", marginTop: 24, gap: 8 },
  heading: { fontSize: 18, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#999", padding: 8, borderRadius: 6 },
});
