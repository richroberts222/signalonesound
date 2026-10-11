import type { PublicEvent, SavedItem } from "@signalone/validation";
import { describe, expect, it } from "vitest";

import { EMPTY_TEXT, ERROR_TEXT, REMOVED_TEXT, listStatus, rowLabel, stateWord, withPage, withoutEvent } from "./savedList";

// S6 mobile (docs/features/s6-saved-events-and-invites.md): what the Saved tab says. AC10: a saved event that was
// cancelled, held or deleted stays in the list with that state in words; AC3: nothing shows who saved anything.
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const event = (n: number, over: Partial<PublicEvent> = {}): PublicEvent => ({
  id: id(n),
  organization: { id: id(900), name: "Sample Fellowship" },
  title: `Sample Revival Night ${n}`,
  description: "",
  status: "published",
  startsAt: "2026-10-14T19:00:00.000Z",
  endsAt: null,
  startLocal: "2026-10-14T19:00",
  endLocal: null,
  timeZone: "America/Chicago",
  venueName: "Sample Venue",
  street: "1 Street",
  city: "Nashville",
  state: "TN",
  zip: "37201",
  lat: null,
  lng: null,
  revivalTypes: [],
  speakers: null,
  directions: null,
  links: [],
  distanceMiles: null,
  ...over,
});
const item = (n: number, state: SavedItem["state"] = "upcoming"): SavedItem => ({
  eventId: id(n),
  savedAt: "2026-10-09T12:00:00.000Z",
  state,
  event: state === "removed" ? null : event(n, state === "cancelled" ? { status: "cancelled" } : {}),
});

describe("the Saved list status", () => {
  it("says when it is loading, when it failed (with a retry), and when it is empty (with a way to find events)", () => {
    expect(listStatus("loading", 0).kind).toBe("loading");
    expect(listStatus("error", 3)).toEqual({ kind: "error", text: ERROR_TEXT, retryLabel: "Try again" }); // an error wins over stale rows
    expect(listStatus("ready", 0)).toEqual({ kind: "empty", text: EMPTY_TEXT, actionLabel: "Find events" });
    expect(listStatus("ready", 1)).toEqual({ kind: "count", text: "1 saved event" });
    expect(listStatus("ready", 7)).toEqual({ kind: "count", text: "7 saved events" });
  });

  it("every state has words, so a person or a screen reader always hears something", () => {
    for (const [state, count] of [["loading", 0], ["error", 0], ["ready", 0], ["ready", 2]] as const) {
      const status = listStatus(state, count);
      expect(status.text.length).toBeGreaterThan(0);
    }
    expect(ERROR_TEXT).toMatch(/connection/i);
  });
});

describe("a saved row", () => {
  it("an ordinary upcoming event reads as what it is, with no state word", () => {
    expect(stateWord(item(1))).toBeNull();
    expect(rowLabel(item(1))).toBe("Sample Revival Night 1, Sample Fellowship, Wed, Oct 14, 7:00 PM, Nashville, TN");
  });

  it("AC10 a cancelled event says Cancelled first, a past one says Past event", () => {
    expect(stateWord(item(2, "cancelled"))).toBe("Cancelled");
    expect(rowLabel(item(2, "cancelled")).startsWith("Cancelled. Sample Revival Night 2")).toBe(true);
    expect(stateWord(item(3, "past"))).toBe("Past event");
    expect(rowLabel(item(3, "past")).startsWith("Past event. ")).toBe(true);
  });

  it("AC10 a removed event shows no detail at all, only that it is gone", () => {
    const removed = item(4, "removed");
    expect(stateWord(removed)).toBe("Removed");
    expect(rowLabel(removed)).toBe(REMOVED_TEXT);
    expect(rowLabel({ ...removed, state: "upcoming" })).toBe(REMOVED_TEXT); // no event body, whatever the state says: never crash
  });
});

describe("changing the list", () => {
  it("removes one event after it is unsaved and leaves the rest in order", () => {
    const list = [item(1), item(2), item(3)];
    expect(withoutEvent(list, id(2)).map((i) => i.eventId)).toEqual([id(1), id(3)]);
    expect(withoutEvent(list, id(99))).toEqual(list);
  });

  it("adds the next page without showing any event twice", () => {
    const merged = withPage([item(1), item(2)], [item(2), item(3)]);
    expect(merged.map((i) => i.eventId)).toEqual([id(1), id(2), id(3)]);
    expect(withPage([], [item(1)])).toHaveLength(1);
    expect(withPage([item(1)], [])).toHaveLength(1);
  });
});
