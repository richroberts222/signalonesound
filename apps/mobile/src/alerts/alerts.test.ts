import type { FetchLike } from "@signalone/validation";
import { describe, expect, it } from "vitest";

import { createMobileAlertsClient } from "./alertsClient";
import { EMPTY_DRAFT, alertSummary, atLimit, draftToInput, hourLabel, limitText, stepHour } from "./alertsText";

function fake(body: unknown) {
  const calls: { url: string; method: string; body?: string; headers: Record<string, string> }[] = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, method: init.method, body: init.body, headers: init.headers });
    return { json: async () => body };
  };
  return { calls, fetch };
}

describe("the phone's alerts client", () => {
  it("lists alerts with GET and the bearer token", async () => {
    const { calls, fetch } = fake({ ok: true, data: { items: [] } });
    const client = createMobileAlertsClient({ baseUrl: "https://api.example/", getToken: async () => "tok_abc", fetch });
    expect(await client.list()).toEqual({ ok: true, data: { items: [] } });
    expect(calls[0].url).toBe("https://api.example/api/v1/me/alerts");
    expect(calls[0].method).toBe("GET");
    expect(calls[0].headers.Authorization).toBe("Bearer tok_abc");
  });

  it("sends quiet hours as a pair to the settings route with PUT", async () => {
    const { calls, fetch } = fake({ ok: true, data: { reminders: true, quietStartHour: 22, quietEndHour: 7 } });
    const client = createMobileAlertsClient({ baseUrl: "https://api.example", getToken: async () => "tok_abc", fetch });
    await client.updateSettings({ quietStartHour: 22, quietEndHour: 7 });
    expect(calls[0].method).toBe("PUT");
    expect(calls[0].url).toBe("https://api.example/api/v1/me/notification-settings");
    expect(JSON.parse(calls[0].body ?? "{}")).toEqual({ quietStartHour: 22, quietEndHour: 7 });
  });
});

describe("the alerts words and rules", () => {
  it("words an hour of the day and steps it around midnight", () => {
    expect(hourLabel(0)).toBe("12:00 AM");
    expect(hourLabel(12)).toBe("12:00 PM");
    expect(hourLabel(21)).toBe("9:00 PM");
    expect(stepHour(23, 1)).toBe(0);
    expect(stepHour(0, -1)).toBe(23);
    expect(stepHour(8, 1)).toBe(9);
  });

  it("turns a draft into the request, trimming the place and keeping the choices", () => {
    expect(draftToInput({ ...EMPTY_DRAFT, place: "  Boise, ID  ", radius: "any", types: ["worship-nights"], immediate: true })).toEqual({
      place: "Boise, ID",
      radius: "any",
      timeframeDays: 30,
      types: ["worship-nights"],
      immediate: true,
    });
  });

  it("summarizes an alert in words and says when it is paused", () => {
    const alert = { placeLabel: "Boise, ID", radius: 25 as const, timeframeDays: 30 as const, types: [] as string[], immediate: false, paused: false };
    expect(alertSummary(alert)).toBe("Boise, ID, within 25 miles, next 30 days, all kinds, daily digest");
    expect(alertSummary({ ...alert, radius: "any", immediate: true, paused: true, types: ["worship-nights"] })).toBe(
      "Paused. Boise, ID, any distance, next 30 days, Worship nights, as it happens",
    );
  });

  it("knows the limit of ten alerts", () => {
    expect(limitText(3)).toBe("3 of 10 alerts");
    expect(atLimit(9)).toBe(false);
    expect(atLimit(10)).toBe(true);
  });
});
