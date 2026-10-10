import { RADIUS_CHOICES, REVIVAL_TYPES, roundPosition, type PublicEvent } from "@signalone/validation";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { getDiscoverClient } from "../api";
import { useTheme } from "../theme";
import { ActionButton, Chip } from "../ui";
import { EventCard } from "./EventCard";
import { buildSearchRequest, type DateRange, type Origin } from "./query";
import { statusFor } from "./status";

const RANGES: { value: DateRange; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "7d", label: "Next 7 days" },
  { value: "30d", label: "Next 30 days" },
];

// Discover (S5): find gatherings by place, distance, date and kind. Browsing needs no account and sends no
// identifier. Only a rounded position is sent, and "use my location" asks permission only when tapped.
export function DiscoverScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [placeText, setPlaceText] = useState("");
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [originLabel, setOriginLabel] = useState<string | null>(null);
  const [radius, setRadius] = useState<number | "any">(25);
  const [types, setTypes] = useState<string[]>([]);
  const [range, setRange] = useState<DateRange>("any");
  const [items, setItems] = useState<PublicEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const latest = useRef(0);

  const search = useCallback(
    async (after?: string) => {
      const ticket = ++latest.current; // an answer to an older search is ignored (rapid filter changes)
      if (!after) setState("loading");
      const request = buildSearchRequest({ origin, radius, types, range }, new Date());
      const result = await getDiscoverClient().searchEvents(after ? { ...request, cursor: after } : request);
      if (ticket !== latest.current) return;
      if (!result.ok) {
        setState("error");
        return;
      }
      setItems((current) => (after ? [...current, ...result.data.items] : result.data.items));
      setCursor(result.data.nextCursor);
      setState("ready");
    },
    [origin, radius, types, range],
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

  const status = statusFor(state, items.length);
  const header = (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={[styles.heading, { color: theme.foreground }]}>
        Find a revival near you
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
        testID="discover-place-input"
        style={[styles.input, { borderColor: theme.border, color: theme.foreground, backgroundColor: theme.card }]}
      />
      <View style={styles.row}>
        <ActionButton label="Search place" onPress={() => void findPlace()} testID="discover-place-search" />
        <ActionButton label="Use my location" tone="plain" onPress={() => void locateMe()} testID="discover-locate-button" />
      </View>
      {originLabel && <Text style={{ color: theme.muted }}>Searching near: {originLabel}</Text>}
      {status.kind === "loading" && (
        <View style={styles.statusRow} testID="discover-status-loading">
          <ActivityIndicator accessibilityLabel="Loading events" />
          <Text style={{ color: theme.muted }}>{status.text}</Text>
        </View>
      )}
      {status.kind === "error" && (
        <View style={[styles.errorBox, { borderColor: theme.destructive }]} testID="discover-status-error">
          <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={{ color: theme.destructive }}>
            {status.text}
          </Text>
          <ActionButton label={status.retryLabel} onPress={() => void search()} testID="discover-retry" />
        </View>
      )}
      {status.kind === "empty" && (
        <Text accessibilityLiveRegion="polite" style={{ color: theme.foreground }} testID="discover-status-empty">
          {status.text}
        </Text>
      )}
      {status.kind === "count" && (
        <Text accessibilityLiveRegion="polite" style={{ color: theme.muted }} testID="discover-status-count">
          {status.text}
        </Text>
      )}
      {notice && (
        <Text accessibilityRole="alert" style={{ color: theme.destructive }}>
          {notice}
        </Text>
      )}
      <Text style={{ color: theme.muted }}>How far</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} testID="discover-radius-select">
        {[...RADIUS_CHOICES, "any" as const].map((r) => (
          <Chip key={String(r)} label={r === "any" ? "Any distance" : `${r} miles`} selected={radius === r} onPress={() => setRadius(r)} />
        ))}
      </ScrollView>
      <Text style={{ color: theme.muted }}>When</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} testID="discover-date-select">
        {RANGES.map((r) => (
          <Chip key={r.value} label={r.label} selected={range === r.value} onPress={() => setRange(r.value)} />
        ))}
      </ScrollView>
      <Text style={{ color: theme.muted }}>Kind of gathering</Text>
      <View style={styles.chips}>
        {REVIVAL_TYPES.map((t) => (
          <Chip
            key={t.slug}
            label={t.label}
            selected={types.includes(t.slug)}
            onPress={() => setTypes((c) => (c.includes(t.slug) ? c.filter((x) => x !== t.slug) : [...c, t.slug]))}
            testID={`discover-type-${t.slug}`}
          />
        ))}
      </View>
    </View>
  );

  return (
    <FlatList
      data={state === "error" ? [] : items}
      keyExtractor={(e) => e.id}
      ListHeaderComponent={header}
      contentContainerStyle={styles.list}
      renderItem={({ item, index }) => <EventCard event={item} testID={`discover-result-${index}`} onPress={() => router.push(`/event/${item.id}`)} />}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListFooterComponent={
        cursor && state === "ready" ? (
          <View style={{ paddingTop: 12 }}>
            <ActionButton label="Show more" tone="plain" onPress={() => void search(cursor)} testID="discover-more" />
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
