import type { ChurchResult } from "@signalone/validation";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { feedbackOpacity } from "../feedback";
import { useTheme } from "../theme";
import { churchDistance, nextServicesLine, placeLine } from "./format";

// One church in the list. The whole card is one control, labelled with what a person needs to hear before
// choosing it: the name, where it is, how far and when it meets next.
export function ChurchCard({ church, onPress, testID }: { church: ChurchResult; onPress: () => void; testID?: string }) {
  const theme = useTheme();
  const place = placeLine(church);
  const distance = churchDistance(church.distanceMiles);
  const next = nextServicesLine(church);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${church.name}, ${place}${distance ? `, ${distance}` : ""}. ${next}`}
      testID={testID}
      style={({ pressed }) => [styles.card, { backgroundColor: theme.card, borderColor: theme.border, opacity: feedbackOpacity({ pressed }) }]}
    >
      <Text style={[styles.title, { color: theme.foreground }]}>{church.name}</Text>
      <View style={styles.row}>
        <Text style={{ color: theme.muted }}>{place}</Text>
        {distance && <Text style={{ color: theme.muted }}>{distance}</Text>}
      </View>
      <Text style={{ color: theme.foreground }}>{next}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 4, minHeight: 44 },
  title: { fontSize: 18, fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
});
