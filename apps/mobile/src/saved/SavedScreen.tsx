import { useAuth } from "@clerk/expo";
import type { SavedItem } from "@signalone/validation";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { feedbackOpacity } from "../feedback";
import { formatWhen } from "../discover/format";
import { useTheme } from "../theme";
import { ActionButton } from "../ui";
import { type ListState, SAVE_FAILED_TEXT, SIGNED_OUT_TEXT, listStatus, REMOVED_TEXT, rowLabel, stateWord, withPage, withoutEvent } from "./savedList";
import { getSavedClient } from "../api";

const PAGE = 20;

// The Saved tab (S6, docs/features/s6-saved-events-and-invites.md): the member's own list, upcoming first, with
// the state of each event in words (AC10). Signed out, it says why it is empty and points to sign-in. The server
// owns the list; this only shows it and asks to remove one.
export function SavedScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const client = getSavedClient();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<ListState>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [removeFailed, setRemoveFailed] = useState(false);

  const load = useCallback(
    async (pull = false) => {
      if (pull) setRefreshing(true);
      else setState("loading");
      const result = await client.list({ limit: PAGE });
      if (result.ok) {
        setItems(result.data.items);
        setCursor(result.data.nextCursor);
        setState("ready");
      } else {
        setState("error");
      }
      setRefreshing(false);
    },
    [client],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from the API once signed in
    if (isLoaded && isSignedIn) void load();
  }, [isLoaded, isSignedIn, load]);

  async function loadMore() {
    if (!cursor || state !== "ready") return;
    const result = await client.list({ cursor, limit: PAGE });
    if (result.ok) {
      setItems((current) => withPage(current, result.data.items));
      setCursor(result.data.nextCursor);
    }
  }

  async function remove(eventId: string) {
    setRemoveFailed(false);
    const result = await client.unsave(eventId);
    if (result.ok) setItems((current) => withoutEvent(current, eventId));
    else setRemoveFailed(true);
  }

  if (!isLoaded) return <ActivityIndicator accessibilityLabel="Loading" style={styles.center} />;

  if (!isSignedIn) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]} testID="saved-signed-out">
        <Text accessibilityRole="header" style={[styles.title, { color: theme.foreground }]}>
          Saved events
        </Text>
        <Text style={{ color: theme.muted, textAlign: "center" }}>{SIGNED_OUT_TEXT}</Text>
        <ActionButton label="Sign in" onPress={() => router.push("/account")} testID="saved-signin" />
      </View>
    );
  }

  const status = listStatus(state, items.length);
  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.list}
      data={state === "error" ? [] : items}
      keyExtractor={(item) => item.eventId}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.primary} />}
      onEndReached={() => void loadMore()}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={
        <View style={{ gap: 8 }}>
          {status.kind === "loading" && <ActivityIndicator accessibilityLabel={status.text} />}
          {status.kind === "count" && <Text style={{ color: theme.muted }}>{status.text}</Text>}
          {status.kind === "error" && (
            <View style={{ gap: 8 }} testID="saved-error">
              <Text accessibilityRole="alert" style={{ color: theme.destructive }}>
                {status.text}
              </Text>
              <ActionButton label={status.retryLabel} onPress={() => void load()} testID="saved-retry" />
            </View>
          )}
          {removeFailed && (
            <Text accessibilityRole="alert" style={{ color: theme.destructive }} testID="saved-remove-failed">
              {SAVE_FAILED_TEXT}
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        status.kind === "empty" ? (
          <View style={{ gap: 10 }} testID="saved-empty">
            <Text style={{ color: theme.foreground }}>{status.text}</Text>
            <ActionButton label={status.actionLabel} onPress={() => router.push("/discover")} testID="saved-find-events" />
          </View>
        ) : null
      }
      renderItem={({ item, index }) => <SavedRow item={item} index={index} onRemove={() => void remove(item.eventId)} onOpen={() => router.push(`/event/${item.eventId}`)} />}
    />
  );
}

function SavedRow({ item, index, onRemove, onOpen }: { item: SavedItem; index: number; onRemove: () => void; onOpen: () => void }) {
  const theme = useTheme();
  const word = stateWord(item);
  const { event } = item;
  return (
    <View style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {event && item.state !== "removed" ? (
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={rowLabel(item)}
          testID={`saved-item-${index}`}
          style={({ pressed }) => [styles.body, { opacity: feedbackOpacity({ pressed }) }]}
        >
          {word && <Text style={{ color: item.state === "cancelled" ? theme.destructive : theme.muted, fontWeight: "700" }}>{word}</Text>}
          <Text style={[styles.rowTitle, { color: theme.foreground }]}>{event.title}</Text>
          <Text style={{ color: theme.muted }}>{event.organization.name}</Text>
          <Text style={{ color: theme.foreground }}>{formatWhen(event.startLocal, event.endLocal)}</Text>
          <Text style={{ color: theme.muted }}>{`${event.city}, ${event.state}`}</Text>
        </Pressable>
      ) : (
        <View style={styles.body} testID={`saved-item-${index}`} accessible accessibilityLabel={REMOVED_TEXT}>
          <Text style={{ color: theme.muted, fontWeight: "700" }}>Removed</Text>
          <Text style={{ color: theme.foreground }}>{REMOVED_TEXT}</Text>
        </View>
      )}
      <ActionButton label="Remove" tone="plain" onPress={onRemove} testID={`saved-remove-${index}`} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  title: { fontSize: 22, fontWeight: "700" },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  row: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  body: { gap: 4, minHeight: 44 },
  rowTitle: { fontSize: 18, fontWeight: "700" },
});
