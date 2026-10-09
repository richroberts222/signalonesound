import { useSignIn } from "@clerk/expo";
import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

// Email and password sign-in through Clerk. Clerk decides whether the credentials are right; this
// screen only collects them and shows a generic message on failure (never what was typed).
export function SignInScreen() {
  const { signIn, fetchStatus } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pending = fetchStatus === "fetching";

  async function onSubmit() {
    if (pending) return;
    setError(null);
    try {
      const { error: failure } = await signIn.password({ identifier: email.trim(), password });
      if (failure) {
        setError("Those details did not work. Please try again.");
        return;
      }
      if (signIn.status === "complete") {
        await signIn.finalize();
      } else {
        setError("Sign-in needs another step that this app does not support yet.");
      }
    } catch {
      setError("Those details did not work. Please try again.");
    }
  }

  return (
    <View style={styles.container} testID="signin-form">
      <Text accessibilityRole="header" style={styles.title}>
        Sign in
      </Text>
      <TextInput
        accessibilityLabel="Email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="username"
        testID="signin-email-input"
      />
      <TextInput
        accessibilityLabel="Password"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        testID="signin-password-input"
      />
      <Button title={pending ? "Signing in..." : "Sign in"} onPress={onSubmit} disabled={pending} testID="signin-submit" />
      {error && (
        <Text accessibilityRole="alert" style={styles.error} testID="signin-error">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", maxWidth: 360, gap: 12 },
  title: { fontSize: 24, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#999", borderRadius: 8, padding: 12, fontSize: 16 },
  error: { color: "#b00020" },
});
