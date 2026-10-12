import { roundPosition, type ChurchResult } from "@signalone/validation";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getChurchClient, getDiscoverClient } from "../api";
import { useTheme } from "../theme";
import { ActionButton, Chip } from "../ui";
import { ChurchCard } from "./ChurchCard";
import { CHURCH_EMPTY_TEXT, CHURCH_ERROR_TEXT, churchCountText } from "./format";
import { buildChurchRequest, CHURCH_RADIUS_CHOICES, type Origin } from "./query";

// Find a Church (S18 on the phone): churches near a place, or by name or city, with when each meets next.
// Browsing needs no account and sends no identifier. Only a rounded position is sent, and "use my
// location" asks permission only when tapped.
export function ChurchesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [placeText, setPlaceText] = useState("");
  const [nameText, setNameText] = useState("");
  const [typed, setTyped] = useState("");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [originLabel, setOriginLabel] = useState<string | null>(null);
  const [radius, setRadius] = useState<number>(25);
  const [items, setItems] = useState<ChurchResult[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const latest = useRef(0);

  const search = useCallback(
    async (after?: string) => {
      const ticket = ++latest.current; // an answer to an older search is ignored (rapid filter changes)
      if (!after) setState("loading");
      const request = buildChurchRequest({ origin, radius, text: typed });
      const result = await getChurchClient().search(after ? { ...request, cursor: after } : request);
      if (ticket !== latest.current) return;
      if (!result.ok) {
        setState("error");
        return;
      }
      setItems((current) => (after ? [...current, ...result.data.items] : result.data.items));
      setCursor(result.data.nextCursor);
      setState("ready");
    },
    [origin, radius, typed],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- runs the search when a filter changes
    void search();
  }, [search]);

  async function findPlace() {
    const text = placeText.trim();
    setNotice(null);
    if (text === "") {
      setOrigin(null);
      setOriginLabel(null);
      return;
    }
    const result = await getDiscoverClient().searchPlaces(text);
    const match = result.ok ? result.data.items[0] : undefined;
    if (!match) {
      setNotice("We could not find that place. Try a ZIP code or City, ST.");
      return;
    }
    setOrigin({ lat: match.lat, lng: match.lng });
    setOriginLabel(match.label);
  }

  async function locateMe() {
    setNotice(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setNotice("Location was not allowed. Type a place instead.");
        return;
      }
      const here = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setOrigin({ lat: roundPosition(here.coords.latitude), lng: roundPosition(here.coords.longitude) });
      setOriginLabel("Near you");
      setPlaceText("");
    } catch {
      setNotice("We could not get your location. Type a place instead.");
    }
  }

  const header = (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={[styles.heading, { color: theme.foreground }]}>
        Find a church
      </Text>
      <TextInput
        accessibilityLabel="City, state or ZIP code"
        placeholder="City, state or ZIP code"
        placeholderTextColor={theme.muted}
        value={placeText}
        onChangeText={setPlaceText}
        onSubmitEditing={() => void findPlace()}
        returnKeyType="search"
        autoCapitalize="words"
        autoCorrect={false}
        testID="churches-place-input"
        style={[styles.input, { borderColor: theme.border, color: theme.foreground, backgroundColor: theme.card }]}
      />
      <View style={styles.row}>
        <ActionButton label="Search place" onPress={() => void findPlace()} testID="churches-place-search" />
        <ActionButton label="Use my location" tone="plain" onPress={() => void locateMe()} testID="churches-locate-button" />
      </View>
      {originLabel && <Text style={{ color: theme.muted }}>Searching near: {originLabel}</Text>}
      <TextInput
        accessibilityLabel="Church name or city"
        placeholder="Church name or city"
        placeholderTextColor={theme.muted}
        value={nameText}
        onChangeText={setNameText}
        onSubmitEditing={() => setTyped(nameText)}
        returnKeyType="search"
        autoCorrect={false}
        testID="churches-name-input"
        style={[styles.input, { borderColor: theme.border, color: theme.foreground, backgroundColor: theme.card }]}
      />
      <ActionButton label="Search by name" tone="plain" onPress={() => setTyped(nameText)} testID="churches-name-search" />
      <Text style={{ color: theme.muted }}>How far</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} testID="churches-radius-select">
        {CHURCH_RADIUS_CHOICES.map((r) => (
          <Chip key={r} label={`${r} miles`} selected={radius === r} onPress={() => setRadius(r)} />
        ))}
      </ScrollView>
      {state === "loading" && (
        <View style={styles.statusRow} testID="churches-status-loading">
          <ActivityIndicator accessibilityLabel="Loading churches" />
          <Text style={{ color: theme.muted }}>Searching for churches</Text>
        </View>
      )}
      {state === "error" && (
        <View style={[styles.errorBox, { borderColor: theme.destructive }]} testID="churches-status-error">
          <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={{ color: theme.destructive }}>
            {CHURCH_ERROR_TEXT}
          </Text>
          <ActionButton label="Try again" onPress={() => void search()} testID="churches-retry" />
        </View>
      )}
      {state === "ready" && items.length === 0 && (
        <Text accessibilityLiveRegion="polite" style={{ color: theme.foreground }} testID="churches-status-empty">
          {CHURCH_EMPTY_TEXT}
        </Text>
      )}
      {state === "ready" && items.length > 0 && (
        <Text accessibilityLiveRegion="polite" style={{ color: theme.muted }} testID="churches-status-count">
          {churchCountText(items.length)}
        </Text>
      )}
      {notice && (
        <Text accessibilityRole="alert" style={{ color: theme.destructive }}>
          {notice}
        </Text>
      )}
    </View>
  );

  return (
    <FlatList
      data={state === "error" ? [] : items}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={header}
      contentContainerStyle={styles.list}
      renderItem={({ item, index }) => <ChurchCard church={item} testID={`churches-result-${index}`} onPress={() => router.push(`/church/${item.id}`)} />}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListFooterComponent={
        cursor && state === "ready" ? (
          <View style={{ paddingTop: 12 }}>
            <ActionButton label="Show more" tone="plain" onPress={() => void search(cursor)} testID="churches-more" />
          </View>
        ) : null
      }
      style={{ backgroundColor: theme.background }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 40 },
  header: { gap: 10, paddingBottom: 14 },
  heading: { fontSize: 24, fontWeight: "700" },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 },
  row: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  errorBox: { gap: 8, borderWidth: 1, borderRadius: 10, padding: 12 },
});
