import type { ManagedEvent } from "./types";

// MOCK DATA ONLY (Issue #70). The church, venues, and events below are
// fictional; links use the reserved example.org domain. Nothing is persisted or
// read from a database, and nothing the user does in the mock changes this list.

export const MOCK_CHURCH_NAME = "Cornerstone Fellowship Nashville";

export const MANAGED_EVENTS: ManagedEvent[] = [
  {
    id: "mock-monday-night-prayer",
    churchName: MOCK_CHURCH_NAME,
    date: "2026-10-05",
    endDate: "",
    startTime: "19:00",
    endTime: "20:00",
    venueName: "Upper Room Chapel",
    street: "410 Church Street",
    city: "Nashville",
    state: "TN",
    zip: "37219",
    revivalTypes: ["prayer-gathering"],
    links: ["https://example.org/cornerstone-nashville"],
    recurrence: {
      pattern: "Every Monday, 7:00 PM",
      upcoming: ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"],
    },
  },
  {
    id: "mock-fall-harvest-revival",
    churchName: MOCK_CHURCH_NAME,
    date: "2026-10-22",
    endDate: "2026-10-25",
    startTime: "18:30",
    endTime: "21:00",
    venueName: "Cornerstone Main Sanctuary",
    street: "2200 Hillsboro Pike",
    city: "Nashville",
    state: "TN",
    zip: "37212",
    revivalTypes: ["church-revival", "healing-deliverance", "family"],
    links: [
      "https://example.org/cornerstone-nashville",
      "https://example.org/cornerstone-nashville/social",
    ],
  },
  {
    id: "mock-youth-worship-night",
    churchName: MOCK_CHURCH_NAME,
    date: "2026-11-06",
    endDate: "",
    startTime: "19:00",
    endTime: "21:00",
    venueName: "Cornerstone Youth Hall",
    street: "2200 Hillsboro Pike",
    city: "Nashville",
    state: "TN",
    zip: "37212",
    revivalTypes: ["worship-night", "youth"],
    links: ["https://example.org/cornerstone-nashville/youth"],
  },
];

export function findManagedEvent(id: string): ManagedEvent | undefined {
  return MANAGED_EVENTS.find((e) => e.id === id);
}
