import { formatServiceWhen, isSafeLink, sortServices, type Church } from "@signalone/validation";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { getChurchClient } from "../api";
import { getMobileEnv } from "../config/env";
import { isEventId } from "../discover/deep-link";
import { useTheme } from "../theme";
import { ActionButton } from "../ui";
import { addressLine } from "./format";

type View_ = { kind: "loading" } | { kind: "ready"; church: Church } | { kind: "removed" } | { kind: "error" };

// One church (S18 on the phone): the address with a Directions link and the regular services, Sunday first.
// A church that is not public (404) or whose link is malformed shows a plain message and never crashes.
export function ChurchScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [view, setView] = useState<View_>({ kind: "loading" });

  const load = useCallback(async () => {
    if (typeof id !== "string" || !isEventId(id)) {
      setView({ kind: "removed" });
      return;
    }
    setView({ kind: "loading" });
    const result = await getChurchClient().get(id);
    if (result.ok) setView({ kind: "ready", church: result.data });
    else setView(result.error.code === "not_found" ? { kind: "removed" } : { kind: "error" });
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from the API
    void load();
  }, [load]);

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerShown: true, title: "Church" }} />
      {view.kind === "loading" && <ActivityIndicator accessibilityLabel="Loading church" />}
      {view.kind === "removed" && (
        <Text accessibilityRole="alert" style={{ color: theme.foreground, fontSize: 18 }} testID="church-removed">
          This church is not available.
        </Text>
      )}
      {view.kind === "error" && (
        <View style={{ gap: 10 }}>
          <Text accessibilityRole="alert" style={{ color: theme.destructive }}>
            We could not load this church. Check your connection and try again.
          </Text>
          <ActionButton label="Try again" onPress={() => void load()} testID="church-retry" />
        </View>
      )}
      {view.kind === "ready" && <ChurchDetails church={view.church} />}
    </ScrollView>
  );
}

function ChurchDetails({ church }: { church: Church }) {
  const theme = useTheme();
  const profile = church.profile;
  const address = profile ? addressLine(profile) : "";
  const services = sortServices(church.services);

  function share() {
    const link = `${getMobileEnv().apiBaseUrl.replace(/\/+$/, "")}/churches/${church.id}`;
    void Share.share({ message: `${church.name}\n${address}\n${link}` });
  }

  return (
    <View style={{ gap: 10 }}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.foreground }]}>
        {church.name}
      </Text>
      {church.description !== "" && <Text style={{ color: theme.foreground }}>{church.description}</Text>}
      {address !== "" && <Text style={{ color: theme.foreground }}>{address}</Text>}
      <View style={styles.actions}>
        <ActionButton label="Share" onPress={share} testID="church-share" />
        {address !== "" && (
          <ActionButton
            label="Directions"
            tone="plain"
            testID="church-directions"
            onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`)}
          />
        )}
      </View>
      <Text accessibilityRole="header" style={[styles.section, { color: theme.foreground }]}>
        Regular services
      </Text>
      {services.length === 0 && (
        <Text style={{ color: theme.muted }} testID="church-no-services">
          This church has not added service times yet.
        </Text>
      )}
      {services.map((s, i) => (
        <View key={`${s.weekday}-${s.startTime}-${s.label}`} style={{ gap: 2 }} testID={`church-service-${i}`}>
          <Text style={{ color: theme.foreground, fontWeight: "600" }}>
            {formatServiceWhen(s.weekday, s.startTime)} · {s.label}
          </Text>
          {s.note !== "" && <Text style={{ color: theme.muted }}>{s.note}</Text>}
        </View>
      ))}
      {church.links.filter(isSafeLink).map((link) => (
        <ActionButton key={link} label={`Open ${link.replace(/^https?:\/\//, "")}`} tone="plain" onPress={() => void Linking.openURL(link)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "700" },
  section: { fontSize: 20, fontWeight: "700", paddingTop: 8 },
  actions: { flexDirection: "row", gap: 10, flexWrap: "wrap", paddingTop: 6 },
});
