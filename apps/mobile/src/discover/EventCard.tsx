import type { PublicEvent } from "@signalone/validation";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { feedbackOpacity } from "../feedback";
import { useTheme } from "../theme";
import { formatDistance, formatWhen } from "./format";

// One search result. The whole card is one control, labelled with what a person needs to hear before
// choosing it: the title, the church, when and where.
export function EventCard({ event, onPress, testID }: { event: PublicEvent; onPress: () => void; testID?: string }) {
  const theme = useTheme();
  const when = formatWhen(event.startLocal, event.endLocal);
  const distance = formatDistance(event.distanceMiles);
  const place = `${event.city}, ${event.state}`;
  const cancelled = event.status === "cancelled";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${cancelled ? "Cancelled. " : ""}${event.title}, ${event.organization.name}, ${when}, ${place}${distance ? `, ${distance}` : ""}`}
      testID={testID}
      style={({ pressed }) => [styles.card, { backgroundColor: theme.card, borderColor: theme.border, opacity: feedbackOpacity({ pressed }) }]}
    >
      {cancelled && <Text style={{ color: theme.destructive, fontWeight: "700" }}>Cancelled</Text>}
      <Text style={[styles.title, { color: theme.foreground }]}>{event.title}</Text>
      <Text style={{ color: theme.muted }}>{event.organization.name}</Text>
      <Text style={{ color: theme.foreground }}>{when}</Text>
      <View style={styles.row}>
        <Text style={{ color: theme.muted }}>{place}</Text>
        {distance && <Text style={{ color: theme.muted }}>{distance}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 4, minHeight: 44 },
  title: { fontSize: 18, fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
});
