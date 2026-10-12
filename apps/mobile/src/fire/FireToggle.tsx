import { useAuth } from "@clerk/expo";
import { formatFireCount } from "@signalone/validation";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { getFireClient } from "../api";
import { useTheme } from "../theme";
import { ActionButton } from "../ui";
import { fireFailureText, fireLabel } from "./fireText";

// Fire or take back a fire on one event (S19). Signed out, it points to sign-in; the public total is shown to
// everyone. The server decides everything (firing twice is one fire, a removed event cannot be fired, the daily
// limit); this shows the answer and puts the button back the way it was when the server says no.
export function FireToggle({ eventId, total }: { eventId: string; total: number }) {
  const theme = useTheme();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const client = getFireClient();
  const [fired, setFired] = useState<boolean | null>(null);
  const [count, setCount] = useState(total);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    void client.isFired(eventId).then((result) => {
      if (!cancelled && result.ok) setFired(result.data.fired);
    });
    return () => {
      cancelled = true;
    };
  }, [client, eventId, isLoaded, isSignedIn]);

  if (!isLoaded) return null;

  async function toggle() {
    if (fired === null || busy) return;
    const next = !fired;
    setBusy(true);
    setFailure(null);
    setFired(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    const result = await (next ? client.fire(eventId) : client.unfire(eventId));
    if (result.ok) setFired(result.data.fired);
    else {
      setFired(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
      setFailure(fireFailureText(result.error.code));
    }
    setBusy(false);
  }

  return (
    <View style={styles.wrap}>
      {isSignedIn ? (
        <ActionButton
          label={fireLabel(fired)}
          selected={fired === true}
          tone={fired ? "primary" : "plain"}
          disabled={fired === null || busy}
          onPress={() => void toggle()}
          testID="event-fire-toggle"
        />
      ) : (
        <ActionButton label="Sign in to fire this" tone="plain" onPress={() => router.push("/account")} testID="event-fire-signin" />
      )}
      <Text style={{ color: theme.muted }} testID="event-fire-count">
        {formatFireCount(count)}
      </Text>
      {failure && (
        <Text accessibilityRole="alert" style={{ color: theme.destructive }} testID="event-fire-failed">
          {failure}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { gap: 6 } });
