import type { SavedItem } from "@signalone/validation";

import { formatWhen } from "../discover/format";

// What the Saved tab says about each saved event and about the list (S6, docs/features/s6-saved-events-and-invites.md).
// Plain data with no React Native import, so a test can check every sentence. A saved event that has since been
// cancelled, held or deleted stays in the list with that state in words (AC10); a removed one shows no detail at all,
// because the server returns only its id.

export type ListState = "loading" | "ready" | "error";
export type ListStatus = { kind: "loading"; text: string } | { kind: "error"; text: string; retryLabel: string } | { kind: "empty"; text: string; actionLabel: string } | { kind: "count"; text: string };

export const SIGNED_OUT_TEXT = "Sign in to save events and keep a short list of the gatherings you care about.";
export const ERROR_TEXT = "We could not load your saved events. Check your connection and try again.";
export const EMPTY_TEXT = "You have not saved any events yet. Find a gathering and tap Save.";
export const REMOVED_TEXT = "This event was removed or is no longer available.";
export const SAVE_FAILED_TEXT = "We could not change this. Check your connection and try again.";

export function listStatus(state: ListState, count: number): ListStatus {
  if (state === "loading") return { kind: "loading", text: "Loading your saved events" };
  if (state === "error") return { kind: "error", text: ERROR_TEXT, retryLabel: "Try again" };
  if (count === 0) return { kind: "empty", text: EMPTY_TEXT, actionLabel: "Find events" };
  return { kind: "count", text: count === 1 ? "1 saved event" : `${count} saved events` };
}

/** The state of a saved event in words, or null when it is an ordinary upcoming event. */
export function stateWord(item: SavedItem): string | null {
  if (item.state === "cancelled") return "Cancelled";
  if (item.state === "past") return "Past event";
  if (item.state === "removed") return "Removed";
  return null;
}

/** What a screen reader hears for a row: the state first, then what a person needs to choose it. */
export function rowLabel(item: SavedItem): string {
  if (item.state === "removed" || !item.event) return REMOVED_TEXT;
  const word = stateWord(item);
  const { event } = item;
  return `${word ? `${word}. ` : ""}${event.title}, ${event.organization.name}, ${formatWhen(event.startLocal, event.endLocal)}, ${event.city}, ${event.state}`;
}

/** The list without one event (after it is unsaved). */
export const withoutEvent = (items: SavedItem[], eventId: string): SavedItem[] => items.filter((i) => i.eventId !== eventId);

/** A next page added to the list, never showing the same event twice. */
export function withPage(items: SavedItem[], page: SavedItem[]): SavedItem[] {
  const seen = new Set(items.map((i) => i.eventId));
  return [...items, ...page.filter((i) => !seen.has(i.eventId))];
}
