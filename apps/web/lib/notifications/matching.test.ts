import { describe, expect, it } from "vitest";

import { matchesRule, type EventForMatch, type RuleForMatch } from "./matching";

// S7: an event fits a rule only when it is published, located, within the timeframe, of a wanted kind and
// within the distance, with the edges exact.
const now = new Date("2026-10-09T12:00:00Z");
const MILE = 69.0934;
const day = (n: number) => new Date(now.getTime() + n * 24 * 3600 * 1000);
const rule = (over: Partial<RuleForMatch> = {}): RuleForMatch => ({ lat: 36.16, lng: -86.78, radiusMiles: 25, timeframeDays: 14, types: [], ...over });
const event = (over: Partial<EventForMatch> & { milesNorth?: number } = {}): EventForMatch => {
  const { milesNorth = 5, ...rest } = over;
  return { lat: 36.16 + milesNorth / MILE, lng: -86.78, startsAt: day(3), status: "published", revivalTypes: ["worship-nights"], ...rest };
};

describe("matchesRule", () => {
  it("matches a published, located, upcoming event within the distance", () => {
    expect(matchesRule(rule(), event(), now)).toBe(true);
  });

  it("the distance edge is exact: inside and on the line match, just beyond does not", () => {
    expect(matchesRule(rule({ radiusMiles: 10 }), event({ milesNorth: 9.9 }), now)).toBe(true);
    expect(matchesRule(rule({ radiusMiles: 10 }), event({ milesNorth: 10.0 }), now)).toBe(true);
    expect(matchesRule(rule({ radiusMiles: 10 }), event({ milesNorth: 10.1 }), now)).toBe(false);
  });

  it("any distance matches a far event, but an event with no position never matches", () => {
    expect(matchesRule(rule({ radiusMiles: null }), event({ milesNorth: 400 }), now)).toBe(true);
    expect(matchesRule(rule({ radiusMiles: null }), event({ lat: null, lng: null }), now)).toBe(false);
    expect(matchesRule(rule(), event({ lat: 36.2, lng: null }), now)).toBe(false);
  });

  it("the timeframe edge is exact and past events never match", () => {
    expect(matchesRule(rule({ timeframeDays: 7 }), event({ startsAt: day(7) }), now)).toBe(true);
    expect(matchesRule(rule({ timeframeDays: 7 }), event({ startsAt: new Date(day(7).getTime() + 1) }), now)).toBe(false);
    expect(matchesRule(rule(), event({ startsAt: now }), now)).toBe(true);
    expect(matchesRule(rule(), event({ startsAt: new Date(now.getTime() - 1) }), now)).toBe(false);
  });

  it("kinds: none chosen means all; otherwise any of the chosen kinds", () => {
    expect(matchesRule(rule({ types: [] }), event({ revivalTypes: ["baptisms"] }), now)).toBe(true);
    expect(matchesRule(rule({ types: ["baptisms", "youth-events"] }), event({ revivalTypes: ["worship-nights", "youth-events"] }), now)).toBe(true);
    expect(matchesRule(rule({ types: ["baptisms"] }), event({ revivalTypes: ["worship-nights"] }), now)).toBe(false);
  });

  it("only a published event matches: a cancelled or draft event does not", () => {
    for (const status of ["cancelled", "draft", "deleted"]) expect(matchesRule(rule(), event({ status }), now), status).toBe(false);
  });
});
