import { Button, StyleSheet, Text, View } from "react-native";

// What a signed-in person sees until the real screens arrive (S5 adds the tabs). It proves the
// sign-in works on a device and offers sign-out; nothing else is shown or stored here.
export function SignedInScreen({ onSignOut }: { onSignOut: () => void }) {
  return (
    <View style={styles.container} testID="signed-in">
      <Text accessibilityRole="header" style={styles.title}>
        You are signed in
      </Text>
      <Text style={styles.muted}>More screens are coming soon.</Text>
      <Button title="Sign out" onPress={onSignOut} testID="signout-button" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", maxWidth: 360, gap: 12 },
  title: { fontSize: 24, fontWeight: "600" },
  muted: { color: "#555" },
});
