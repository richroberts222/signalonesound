import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { feedbackOpacity } from "./feedback";
import { useTheme } from "./theme";

// Small shared controls. Every control is at least 44 points tall (the touch-target size), has a role
// and a label for screen readers, and shows its selected state in words as well as color (S5 AC7).
export function Chip({ label, selected, onPress, testID }: { label: string; selected: boolean; onPress: () => void; testID?: string }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      testID={testID}
      style={({ pressed }) => [styles.chip, { borderColor: theme.border, backgroundColor: selected ? theme.primary : theme.background, opacity: feedbackOpacity({ pressed }) }]}
    >
      <Text style={{ color: selected ? theme.primaryForeground : theme.foreground, fontWeight: selected ? "700" : "400" }}>
        {selected ? `${label} (selected)` : label}
      </Text>
    </Pressable>
  );
}

export function ActionButton({
  label,
  onPress,
  testID,
  disabled,
  tone = "primary",
}: {
  label: string;
  onPress: () => void;
  testID?: string;
  disabled?: boolean;
  tone?: "primary" | "plain";
}): ReactNode {
  const theme = useTheme();
  const primary = tone === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      style={({ pressed }) => [styles.button, { borderColor: theme.border, backgroundColor: primary ? theme.primary : theme.background, opacity: feedbackOpacity({ pressed, disabled }) }]}
    >
      <Text style={{ color: primary ? theme.primaryForeground : theme.foreground, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 44, minWidth: 44, justifyContent: "center", paddingHorizontal: 14, borderRadius: 22, borderWidth: 1 },
  button: { minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "center", paddingHorizontal: 16, borderRadius: 10, borderWidth: 1 },
});
