import { useAuth } from "@clerk/expo";
import { ALERT_RADIUS_CHOICES, ALERT_TIMEFRAMES, REVIVAL_TYPES, type Alert } from "@signalone/validation";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getAlertsClient } from "../api";
import { useTheme } from "../theme";
import { ActionButton, Chip } from "../ui";
import {
  ALERTS_EMPTY_TEXT,
  ALERTS_ERROR_TEXT,
  EMPTY_DRAFT,
  PUSH_NOTE,
  SIGNED_OUT_TEXT,
  alertSummary,
  atLimit,
  draftToInput,
  hourLabel,
  limitText,
  stepHour,
  type AlertDraft,
} from "./alertsText";

// The Alerts tab (S7): the member's alerts, reminders and quiet hours. The server owns everything (the limit of ten,
// the place lookup, what the quiet hours mean); this shows its answers. Signed out, it says why it is empty and points
// to sign-in. Phone notifications themselves arrive with a later app update, which is said on the screen.
export function AlertsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const client = getAlertsClient();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [reminders, setReminders] = useState(true);
  const [quiet, setQuiet] = useState({ start: 21, end: 8 });
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<AlertDraft>(EMPTY_DRAFT);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    const [list, settings] = await Promise.all([client.list(), client.settings()]);
    if (!list.ok) {
      setState("error");
      return;
    }
    setAlerts(list.data.items);
    if (settings.ok) {
      setReminders(settings.data.reminders);
      setQuiet({ start: settings.data.quietStartHour, end: settings.data.quietEndHour });
    }
    setState("ready");
  }, [client]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from the API once signed in
    if (isLoaded && isSignedIn) void load();
  }, [isLoaded, isSignedIn, load]);

  async function run(action: () => Promise<{ ok: boolean; error?: { message: string } }>) {
    setMessage(null);
    const result = await action();
    if (result.ok) await load();
    else setMessage(result.error?.message ?? "Something went wrong. Try again.");
    return result.ok;
  }

  async function save() {
    const ok = await run(() => client.create(draftToInput(draft)));
    if (ok) {
      setDraft(EMPTY_DRAFT);
      setAdding(false);
    }
  }

  async function changeQuiet(start: number, end: number) {
    setMessage(null);
    const result = await client.updateSettings({ quietStartHour: start, quietEndHour: end });
    if (result.ok) setQuiet({ start: result.data.quietStartHour, end: result.data.quietEndHour });
    else setMessage(result.error.fieldErrors ? Object.values(result.error.fieldErrors)[0]?.[0] ?? result.error.message : result.error.message);
  }

  if (!isLoaded) return <ActivityIndicator accessibilityLabel="Loading" style={styles.center} />;

  if (!isSignedIn) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]} testID="alerts-signed-out">
        <Text accessibilityRole="header" style={[styles.title, { color: theme.foreground }]}>
          Alerts
        </Text>
        <Text style={{ color: theme.muted, textAlign: "center" }}>{SIGNED_OUT_TEXT}</Text>
        <ActionButton label="Sign in" onPress={() => router.push("/account")} testID="alerts-signin" />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.foreground }]}>
        Alerts
      </Text>
      <Text style={{ color: theme.muted }}>{PUSH_NOTE}</Text>

      {state === "loading" && <ActivityIndicator accessibilityLabel="Loading alerts" />}
      {state === "error" && (
        <View style={[styles.errorBox, { borderColor: theme.destructive }]} testID="alerts-error">
          <Text accessibilityRole="alert" style={{ color: theme.destructive }}>
            {ALERTS_ERROR_TEXT}
          </Text>
          <ActionButton label="Try again" onPress={() => void load()} testID="alerts-retry" />
        </View>
      )}
      {message && (
        <Text accessibilityRole="alert" style={{ color: theme.destructive }} testID="alerts-message">
          {message}
        </Text>
      )}

      {state === "ready" && (
        <>
          <Text style={{ color: theme.muted }} testID="alerts-count">
            {limitText(alerts.length)}
          </Text>
          {alerts.length === 0 && <Text style={{ color: theme.foreground }}>{ALERTS_EMPTY_TEXT}</Text>}
          {alerts.map((a, i) => (
            <View key={a.id} style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]} testID={`alert-row-${i}`}>
              <Text style={{ color: theme.foreground }}>{alertSummary(a)}</Text>
              <View style={styles.row}>
                <ActionButton
                  label={a.paused ? "Resume" : "Pause"}
                  tone="plain"
                  onPress={() => void run(() => client.update(a.id, { paused: !a.paused }))}
                  testID={`alert-pause-${i}`}
                />
                <ActionButton label="Delete" tone="plain" onPress={() => void run(() => client.remove(a.id))} testID={`alert-delete-${i}`} />
              </View>
            </View>
          ))}

          {!adding && <ActionButton label="New alert" onPress={() => setAdding(true)} disabled={atLimit(alerts.length)} testID="alerts-new-button" />}
          {adding && (
            <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]} testID="alert-form">
              <TextInput
                accessibilityLabel="City, state or ZIP code"
                placeholder="City, state or ZIP code"
                placeholderTextColor={theme.muted}
                value={draft.place}
                onChangeText={(place) => setDraft({ ...draft, place })}
                autoCapitalize="words"
                autoCorrect={false}
                testID="alert-place-input"
                style={[styles.input, { borderColor: theme.border, color: theme.foreground, backgroundColor: theme.background }]}
              />
              <Text style={{ color: theme.muted }}>How far</Text>
              <View style={styles.chips} testID="alert-radius-select">
                {[...ALERT_RADIUS_CHOICES, "any" as const].map((r) => (
                  <Chip key={String(r)} label={r === "any" ? "Any distance" : `${r} miles`} selected={draft.radius === r} onPress={() => setDraft({ ...draft, radius: r })} />
                ))}
              </View>
              <Text style={{ color: theme.muted }}>How soon</Text>
              <View style={styles.chips} testID="alert-timeframe-select">
                {ALERT_TIMEFRAMES.map((d) => (
                  <Chip key={d} label={`Next ${d} days`} selected={draft.timeframeDays === d} onPress={() => setDraft({ ...draft, timeframeDays: d })} />
                ))}
              </View>
              <Text style={{ color: theme.muted }}>Kind of gathering (none chosen means all)</Text>
              <View style={styles.chips}>
                {REVIVAL_TYPES.map((t) => (
                  <Chip
                    key={t.slug}
                    label={t.label}
                    selected={draft.types.includes(t.slug)}
                    onPress={() => setDraft({ ...draft, types: draft.types.includes(t.slug) ? draft.types.filter((x) => x !== t.slug) : [...draft.types, t.slug] })}
                    testID={`alert-type-${t.slug}`}
                  />
                ))}
              </View>
              <Chip
                label="Tell me as it happens (at most one a day)"
                selected={draft.immediate}
                onPress={() => setDraft({ ...draft, immediate: !draft.immediate })}
                testID="alert-immediate-toggle"
              />
              <View style={styles.row}>
                <ActionButton label="Save alert" onPress={() => void save()} testID="alert-save" />
                <ActionButton
                  label="Cancel"
                  tone="plain"
                  onPress={() => {
                    setAdding(false);
                    setDraft(EMPTY_DRAFT);
                    setMessage(null);
                  }}
                  testID="alert-cancel"
                />
              </View>
            </View>
          )}

          <Text accessibilityRole="header" style={[styles.section, { color: theme.foreground }]}>
            Reminders and quiet hours
          </Text>
          <Chip
            label="Remind me a day before and two hours before events I save"
            selected={reminders}
            onPress={() => {
              const next = !reminders;
              setReminders(next);
              void run(() => client.updateSettings({ reminders: next }));
            }}
            testID="reminder-toggle"
          />
          <Text style={{ color: theme.muted }}>Nothing is sent during your quiet hours.</Text>
          <View style={styles.row}>
            <Text style={{ color: theme.foreground, minWidth: 110 }} testID="quiet-hours-start">
              Starts {hourLabel(quiet.start)}
            </Text>
            <ActionButton label="Earlier" tone="plain" onPress={() => void changeQuiet(stepHour(quiet.start, -1), quiet.end)} testID="quiet-start-earlier" />
            <ActionButton label="Later" tone="plain" onPress={() => void changeQuiet(stepHour(quiet.start, 1), quiet.end)} testID="quiet-start-later" />
          </View>
          <View style={styles.row}>
            <Text style={{ color: theme.foreground, minWidth: 110 }} testID="quiet-hours-end">
              Ends {hourLabel(quiet.end)}
            </Text>
            <ActionButton label="Earlier" tone="plain" onPress={() => void changeQuiet(quiet.start, stepHour(quiet.end, -1))} testID="quiet-end-earlier" />
            <ActionButton label="Later" tone="plain" onPress={() => void changeQuiet(quiet.start, stepHour(quiet.end, 1))} testID="quiet-end-later" />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  section: { fontSize: 20, fontWeight: "700", paddingTop: 8 },
  card: { gap: 10, borderWidth: 1, borderRadius: 12, padding: 14 },
  row: { flexDirection: "row", gap: 10, flexWrap: "wrap", alignItems: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 },
  errorBox: { gap: 8, borderWidth: 1, borderRadius: 10, padding: 12 },
});
