import { isSafeLink, REVIVAL_TYPES, type PublicEvent } from "@signalone/validation";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { getDiscoverClient } from "../api";
import { getMobileEnv } from "../config/env";
import { useTheme } from "../theme";
import { ActionButton } from "../ui";
import { isEventId } from "./deep-link";
import { formatWhen } from "./format";

type View_ = { kind: "loading" } | { kind: "ready"; event: PublicEvent } | { kind: "removed" } | { kind: "error" };

const typeLabel = (slug: string) => REVIVAL_TYPES.find((t) => t.slug === slug)?.label ?? slug;

// One event (S5). A cancelled event says so clearly; an event that was removed (404) or whose link is
// malformed shows a plain message and never crashes (AC5, AC11).
export function EventScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [view, setView] = useState<View_>({ kind: "loading" });

  const load = useCallback(async () => {
    if (typeof id !== "string" || !isEventId(id)) {
      setView({ kind: "removed" });
      return;
    }
    setView({ kind: "loading" });
    const result = await getDiscoverClient().getEvent(id);
    if (result.ok) setView({ kind: "ready", event: result.data });
    else setView(result.error.code === "not_found" ? { kind: "removed" } : { kind: "error" });
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from the API
    void load();
  }, [load]);

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: true, title: "Event" }} />
      {view.kind === "loading" && <ActivityIndicator accessibilityLabel="Loading event" />}
      {view.kind === "removed" && (
        <Text accessibilityRole="alert" style={{ color: theme.foreground, fontSize: 18 }} testID="event-removed">
          This event was removed or is not available.
        </Text>
      )}
      {view.kind === "error" && (
        <View style={{ gap: 10 }}>
          <Text accessibilityRole="alert" style={{ color: theme.destructive }}>
            We could not load this event. Check your connection and try again.
          </Text>
          <ActionButton label="Try again" onPress={() => void load()} testID="event-retry" />
        </View>
      )}
      {view.kind === "ready" && <EventDetails event={view.event} />}
    </ScrollView>
  );
}

function EventDetails({ event }: { event: PublicEvent }) {
  const theme = useTheme();
  const when = formatWhen(event.startLocal, event.endLocal);
  const address = `${event.venueName}, ${event.street}, ${event.city}, ${event.state} ${event.zip}`;
  const cancelled = event.status === "cancelled";

  function share() {
    // The link opens the event page on the web (and in the app when it is installed, once links are set up on the real domain).
    const link = `${getMobileEnv().apiBaseUrl.replace(/\/+$/, "")}/events/${event.id}`;
    void Share.share({ message: `${event.title}\n${when}\n${event.city}, ${event.state}\n${link}` });
  }

  return (
    <View style={{ gap: 10 }}>
      {cancelled && (
        <Text accessibilityRole="alert" style={{ color: theme.destructive, fontWeight: "700", fontSize: 18 }} testID="event-cancelled">
          This event was cancelled.
        </Text>
      )}
      <Text accessibilityRole="header" style={[styles.title, { color: theme.foreground }]}>
        {event.title}
      </Text>
      <Text style={{ color: theme.muted }}>{event.organization.name}</Text>
      <Text style={{ color: theme.foreground, fontSize: 16 }}>{when}</Text>
      <Text style={{ color: theme.foreground }}>{address}</Text>
      {event.revivalTypes.length > 0 && <Text style={{ color: theme.muted }}>{event.revivalTypes.map(typeLabel).join(", ")}</Text>}
      {event.speakers && <Text style={{ color: theme.foreground }}>Speakers: {event.speakers}</Text>}
      {event.description !== "" && <Text style={{ color: theme.foreground }}>{event.description}</Text>}
      {event.directions && <Text style={{ color: theme.muted }}>Directions: {event.directions}</Text>}
      <View style={styles.actions}>
        <ActionButton label="Share" onPress={share} testID="event-share" />
        <ActionButton
          label="Directions"
          tone="plain"
          testID="event-directions"
          onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`)}
        />
      </View>
      {event.links.filter(isSafeLink).map((link) => (
        <ActionButton key={link} label={`Open ${link.replace(/^https?:\/\//, "")}`} tone="plain" onPress={() => void Linking.openURL(link)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10, flexWrap: "wrap", paddingTop: 6 },
});
