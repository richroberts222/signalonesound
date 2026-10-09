import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";
import { remainingCharacters, type createHelloClient } from "@signalone/validation";

// S0 walking skeleton screen (docs/features/s0-walking-skeleton.md): the same behavior as the web
// screen, through the same shared client. The server validates and decides; this screen shows its
// standard message. The note is always rendered as plain text.
export function HelloScreen({
  client,
  onSignOut,
}: {
  client: ReturnType<typeof createHelloClient>;
  onSignOut: () => void;
}) {
  const [saved, setSaved] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void client.get().then((result) => {
      if (!active) return;
      if (result.ok) {
        setSaved(result.data.note);
        setDraft(result.data.note ?? "");
      } else {
        setError(result.error.message);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [client]);

  async function onSave() {
    setPending(true);
    setError(null);
    setNotice(null);
    const result = await client.put({ note: draft });
    if (result.ok) {
      setSaved(result.data.note);
      setDraft(result.data.note ?? "");
      setNotice("Saved");
    } else {
      setError(result.error.fieldErrors?.note?.[0] ?? result.error.message);
    }
    setPending(false);
  }

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Hello
      </Text>
      <Text testID="hello-note-display" accessibilityLiveRegion="polite">
        {loading ? "Loading..." : saved === null ? "No note yet." : saved}
      </Text>
      <TextInput
        accessibilityLabel="Your note"
        style={styles.input}
        value={draft}
        onChangeText={setDraft}
        testID="hello-note-input"
      />
      <Text testID="hello-counter" style={styles.muted}>
        {remainingCharacters(draft)} characters left
      </Text>
      <Button title={pending ? "Saving..." : "Save note"} onPress={onSave} disabled={pending || loading} testID="hello-save-button" />
      {error && (
        <Text accessibilityRole="alert" style={styles.error} testID="hello-error">
          {error}
        </Text>
      )}
      {notice && (
        <Text accessibilityRole="alert" style={styles.muted} testID="hello-notice">
          {notice}
        </Text>
      )}
      <Button title="Sign out" onPress={onSignOut} testID="signout-button" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", maxWidth: 360, gap: 12 },
  title: { fontSize: 24, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#999", borderRadius: 8, padding: 12, fontSize: 16 },
  muted: { color: "#555" },
  error: { color: "#b00020" },
});
