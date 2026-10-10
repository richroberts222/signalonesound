import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../theme";

// A tab whose screen arrives in a later slice (Saved: S6, Alerts: S7). It says so plainly.
export function PlaceholderScreen({ title, text }: { title: string; text: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.foreground }]}>
        {title}
      </Text>
      <Text style={{ color: theme.muted, textAlign: "center" }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  title: { fontSize: 22, fontWeight: "700" },
});
