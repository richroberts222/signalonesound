import { describe, expect, it } from "vitest";

import { fireParamsSchema, fireResultSchema, formatFireCount, MAX_FIRES_PER_DAY } from "./fire";

const EVENT_ID = "3f6c1f2e-8a41-4c57-9d0b-5a7e2c9b1d44";

describe("fire contract", () => {
  it("words the count for people and screen readers", () => {
    expect(formatFireCount(0)).toBe("0 fires");
    expect(formatFireCount(1)).toBe("1 fire");
    expect(formatFireCount(12)).toBe("12 fires");
  });

  it("only accepts an event id that is a uuid", () => {
    expect(fireParamsSchema.safeParse({ eventId: EVENT_ID }).success).toBe(true);
    expect(fireParamsSchema.safeParse({ eventId: "not-a-uuid" }).success).toBe(false);
  });

  it("answers with the event and whether the caller fired it, and nothing about anyone else", () => {
    expect(fireResultSchema.parse({ eventId: EVENT_ID, fired: true })).toEqual({ eventId: EVENT_ID, fired: true });
    expect(fireResultSchema.parse({ eventId: EVENT_ID, fired: false, userId: "someone" })).toEqual({ eventId: EVENT_ID, fired: false });
  });

  it("limits a member to 100 new fires a day", () => {
    expect(MAX_FIRES_PER_DAY).toBe(100);
  });
});
