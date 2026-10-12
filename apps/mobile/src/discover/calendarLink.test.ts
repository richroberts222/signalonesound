import { describe, expect, it } from "vitest";

import { calendarLink } from "./calendarLink";

const base = {
  title: "Night of Worship",
  description: "Come & pray",
  startsAt: "2026-10-14T00:00:00.000Z",
  endsAt: "2026-10-14T03:00:00.000Z",
  venueName: "Grace Hall",
  street: "1 Main St",
  city: "Boise",
  state: "ID",
  zip: "83702",
  status: "published" as const,
};

describe("add to calendar on the phone", () => {
  it("builds a calendar link holding the title, UTC times, details and place", () => {
    const url = new URL(calendarLink(base));
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Night of Worship");
    expect(url.searchParams.get("dates")).toBe("20261014T000000Z/20261014T030000Z");
    expect(url.searchParams.get("details")).toBe("Come & pray");
    expect(url.searchParams.get("location")).toBe("Grace Hall, 1 Main St, Boise, ID 83702");
  });

  it("assumes two hours when the event has no end", () => {
    const url = new URL(calendarLink({ ...base, endsAt: null }));
    expect(url.searchParams.get("dates")).toBe("20261014T000000Z/20261014T020000Z");
  });

  it("marks a cancelled event so it is not mistaken for a real plan", () => {
    expect(new URL(calendarLink({ ...base, status: "cancelled" })).searchParams.get("text")).toBe("CANCELLED: Night of Worship");
  });
});
