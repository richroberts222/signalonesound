import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../theme";
import { ActionButton } from "../ui";
import { SAVE_FAILED_TEXT } from "./savedList";
import { getSavedClient } from "../api";

// Save or unsave one event (S6 AC1). Signed out, it points to sign-in instead; browsing and viewing never need an
// account. The server decides everything (saving twice is one row, a removed event cannot be saved); this shows
// the answer, and puts the button back the way it was when the server says no.
export function SaveToggle({ eventId }: { eventId: string }) {
  const theme = useTheme();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const client = getSavedClient();
  const [saved, setSaved] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    void client.isSaved(eventId).then((result) => {
      if (!cancelled && result.ok) setSaved(result.data.saved);
    });
    return () => {
      cancelled = true;
    };
  }, [client, eventId, isLoaded, isSignedIn]);

  if (!isLoaded) return null;
  if (!isSignedIn) {
    return <ActionButton label="Sign in to save" tone="plain" onPress={() => router.push("/account")} testID="event-save-signin" />;
  }

  async function toggle() {
    if (saved === null || busy) return;
    const next = !saved;
    setBusy(true);
    setFailed(false);
    setSaved(next);
    const result = await (next ? client.save(eventId) : client.unsave(eventId));
    if (result.ok) setSaved(result.data.saved);
    else {
      setSaved(!next);
      setFailed(true);
    }
    setBusy(false);
  }

  return (
    <View style={styles.wrap}>
      <ActionButton
        label={saved ? "Saved (tap to remove)" : "Save"}
        selected={saved === true}
        tone={saved ? "primary" : "plain"}
        disabled={saved === null || busy}
        onPress={() => void toggle()}
        testID="event-save-toggle"
      />
      {failed && (
        <Text accessibilityRole="alert" style={{ color: theme.destructive }} testID="event-save-failed">
          {SAVE_FAILED_TEXT}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { gap: 6 } });
