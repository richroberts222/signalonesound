import type { Profile } from "@signalone/validation";
import { useCallback, useEffect, useState } from "react";
import { Linking, Share, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { getProfileClient, getSavedClient } from "../api";
import {
  DELETE_WARNING,
  EXPORT_DONE,
  NAME_SAVED,
  POLICY_UPDATED_TEXT,
  POLICY_UPDATED_TITLE,
  PREFERENCE_SAVED,
  canConfirmDelete,
  exportText,
  failureText,
  inviteLink,
  inviteMessage,
  needsPolicyAcceptance,
  policyLink,
} from "../account/accountText";
import { getMobileEnv } from "../config/env";
import { useTheme } from "../theme";
import { ActionButton } from "../ui";

// The signed-in Account tab (S1 and S5: profile, policy, a download of everything we hold, account deletion; S6: invite
// a friend). The server validates and decides every change; this collects the values and shows its answer. Deleting needs
// the word DELETE typed as a second step, and signs the person out afterwards. The App Store and Google Play both
// require account deletion to be possible inside the app.
export function SignedInScreen({ onSignOut }: { onSignOut: () => void }) {
  const theme = useTheme();
  const profileClient = getProfileClient();
  const webBase = getMobileEnv().apiBaseUrl;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ageOk, setAgeOk] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let active = true;
    void profileClient.get().then(async (result) => {
      if (!active) return;
      if (!result.ok) return setError(failureText(result.error));
      setProfile(result.data);
      setName(result.data.displayName ?? "");
      // Remember the phone's time zone once, so quiet hours and event times can be shown correctly.
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (result.data.policy.accepted && !result.data.timeZone && zone) {
        const updated = await profileClient.update({ timeZone: zone });
        if (active && updated.ok) setProfile(updated.data);
      }
    });
    return () => {
      active = false;
    };
  }, [profileClient]);

  // One place for "something is happening, show the answer": clears messages, runs the step, never leaves busy stuck.
  const run = useCallback(async (step: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await step();
    } finally {
      setBusy(false);
    }
  }, []);

  const saveName = () =>
    run(async () => {
      const result = await profileClient.update({ displayName: name });
      if (result.ok) {
        setProfile(result.data);
        setNotice(NAME_SAVED);
      } else setError(failureText(result.error));
    });

  const setEmailPref = (value: boolean) =>
    run(async () => {
      const result = await profileClient.update({ emailPref: value });
      if (result.ok) {
        setProfile(result.data);
        setNotice(PREFERENCE_SAVED);
      } else setError(failureText(result.error));
    });

  const acceptPolicy = () =>
    run(async () => {
      if (!profile) return;
      const result = await profileClient.acceptPolicy({ version: profile.policy.currentVersion, ageAttested: true });
      if (result.ok) setProfile(result.data);
      else setError(failureText(result.error));
    });

  const download = () =>
    run(async () => {
      const result = await profileClient.exportData();
      if (!result.ok) return setError(failureText(result.error));
      await Share.share({ message: exportText(result.data), title: "My Signal One Sound data" });
      setNotice(EXPORT_DONE);
    });

  const invite = () =>
    run(async () => {
      const result = await getSavedClient().createInvite();
      if (!result.ok) return setError(failureText(result.error));
      await Share.share({ message: inviteMessage(inviteLink(webBase, result.data.token)) });
    });

  const deleteAccount = () =>
    run(async () => {
      const result = await profileClient.deleteAccount();
      if (!result.ok) return setError(failureText(result.error));
      // The identity is gone, so the session ends with it.
      onSignOut();
    });

  return (
    <View style={styles.container} testID="signed-in">
      <Text accessibilityRole="header" style={[styles.title, { color: theme.foreground }]}>
        Your account
      </Text>

      {profile && needsPolicyAcceptance(profile) && (
        <View style={[styles.card, { borderColor: theme.primary, backgroundColor: theme.card }]} testID="policy-update">
          <Text accessibilityRole="header" style={[styles.cardTitle, { color: theme.foreground }]}>
            {POLICY_UPDATED_TITLE}
          </Text>
          <Text style={{ color: theme.muted }}>{POLICY_UPDATED_TEXT}</Text>
          <View style={styles.row}>
            <ActionButton label="Read the Terms" tone="plain" onPress={() => void Linking.openURL(policyLink(webBase, "terms"))} testID="policy-terms-link" />
            <ActionButton label="Read the Privacy Policy" tone="plain" onPress={() => void Linking.openURL(policyLink(webBase, "privacy"))} testID="policy-privacy-link" />
          </View>
          <View style={styles.switchRow}>
            <Switch value={ageOk} onValueChange={setAgeOk} accessibilityLabel="I am 18 or older" testID="policy-age-switch" />
            <Text style={{ color: theme.foreground, flex: 1 }}>I am 18 or older and I accept the Terms and the Privacy Policy</Text>
          </View>
          <ActionButton label="Accept" onPress={() => void acceptPolicy()} disabled={busy || !ageOk} testID="policy-accept-button" />
        </View>
      )}

      <View style={styles.section}>
        <Text style={{ color: theme.muted }}>Your sign-in email is kept by our sign-in provider and is not copied here.</Text>
        <Text style={[styles.label, { color: theme.foreground }]}>Display name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          autoComplete="name"
          accessibilityLabel="Display name"
          testID="account-name-input"
          style={[styles.input, { borderColor: theme.border, color: theme.foreground, backgroundColor: theme.card }]}
        />
        <ActionButton label="Save name" onPress={() => void saveName()} disabled={busy || !profile} testID="account-name-save" />
        <View style={styles.switchRow}>
          <Switch
            value={profile?.emailPref ?? false}
            onValueChange={(v) => void setEmailPref(v)}
            disabled={busy || !profile}
            accessibilityLabel="Email me about events and updates"
            testID="account-email-toggle"
          />
          <Text style={{ color: theme.foreground, flex: 1 }}>Email me about events and updates</Text>
        </View>
      </View>

      <View style={styles.section}>
        <ActionButton label="Invite a friend" onPress={() => void invite()} disabled={busy} testID="invite-button" />
        <ActionButton label="Download my data" tone="plain" onPress={() => void download()} disabled={busy} testID="account-export-button" />
        {!confirming ? (
          <ActionButton label="Delete my account" tone="plain" onPress={() => setConfirming(true)} disabled={busy} testID="account-delete-button" />
        ) : (
          <View style={[styles.card, { borderColor: theme.destructive, backgroundColor: theme.card }]} accessibilityRole="alert">
            <Text style={{ color: theme.foreground }}>{DELETE_WARNING}</Text>
            <TextInput
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              accessibilityLabel="Type DELETE to confirm"
              testID="account-delete-confirm-input"
              style={[styles.input, { borderColor: theme.border, color: theme.foreground, backgroundColor: theme.background }]}
            />
            <View style={styles.row}>
              <ActionButton label="Delete everything" onPress={() => void deleteAccount()} disabled={busy || !canConfirmDelete(typed)} testID="account-delete-confirm-button" />
              <ActionButton
                label="Cancel"
                tone="plain"
                onPress={() => {
                  setConfirming(false);
                  setTyped("");
                }}
                disabled={busy}
                testID="account-delete-cancel-button"
              />
            </View>
          </View>
        )}
      </View>

      <View style={styles.row}>
        <ActionButton label="Terms" tone="plain" onPress={() => void Linking.openURL(policyLink(webBase, "terms"))} testID="account-terms-link" />
        <ActionButton label="Privacy" tone="plain" onPress={() => void Linking.openURL(policyLink(webBase, "privacy"))} testID="account-privacy-link" />
      </View>

      {error && (
        <Text accessibilityRole="alert" style={{ color: theme.destructive }} testID="account-error">
          {error}
        </Text>
      )}
      {notice && (
        <Text accessibilityRole="alert" style={{ color: theme.muted }} testID="account-notice">
          {notice}
        </Text>
      )}

      <ActionButton label="Sign out" tone="plain" onPress={onSignOut} testID="signout-button" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", maxWidth: 420, gap: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  section: { gap: 10 },
  label: { fontWeight: "600" },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  row: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 },
});
