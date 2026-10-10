// What the Discover screen tells the person about the search, and where it says it (S5 polish). The status sits
// directly under the search buttons, where the person just tapped, not at the bottom of a long screen where an
// error was never seen. Plain data with no React Native import, so a test can check it.
export type SearchState = "loading" | "ready" | "error";
export type Status = { kind: "none" } | { kind: "loading"; text: string } | { kind: "error"; text: string; retryLabel: string } | { kind: "empty"; text: string } | { kind: "count"; text: string };

export const ERROR_TEXT = "We could not load events. Check your connection and try again. If it keeps happening, the service may be busy.";
export const EMPTY_TEXT = "No events match yet. Try a wider distance or another date range.";

export function statusFor(state: SearchState, count: number): Status {
  if (state === "loading") return { kind: "loading", text: "Searching for events" };
  if (state === "error") return { kind: "error", text: ERROR_TEXT, retryLabel: "Try again" };
  if (count === 0) return { kind: "empty", text: EMPTY_TEXT };
  return { kind: "count", text: count === 1 ? "1 event found" : `${count} events found` };
}
