import { useAuth } from "@clerk/expo";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";

import { SignInScreen } from "../auth/SignInScreen";
import { SignedInScreen } from "../auth/SignedInScreen";
import { useTheme } from "../theme";

// The Account tab. Browsing needs no account, so sign-in lives here (and wherever a feature needs it later)
// and not in front of the whole app (S5 AC2).
export function AccountScreen() {
  const theme = useTheme();
  const { isLoaded, isSignedIn, signOut } = useAuth();
  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      {!isLoaded ? (
        <ActivityIndicator accessibilityLabel="Loading" />
      ) : (
        <View style={styles.center}>{isSignedIn ? <SignedInScreen onSignOut={() => void signOut()} /> : <SignInScreen />}</View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 20, justifyContent: "center" },
  center: { alignItems: "center" },
});
