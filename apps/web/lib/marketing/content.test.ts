import { describe, expect, it } from "vitest";

import { ABOUT_PARAGRAPHS, EXAMPLE_EVENTS, FAQ, FOR_CHURCHES, FOR_PEOPLE, HOW_IT_WORKS, MISSION, PROBLEM, SCRIPTURE, SERVICES, VISION } from "./content";

// Guards for the words on the public pages (S15). The pages may only say what the app does today or what the
// product plan lists; planned things are labeled "coming"; example content is labeled "Example"; and there is
// never a claim about numbers of users, churches, events or ratings, because none exist yet.
const everyString = (): string[] => {
  const out: string[] = [MISSION, VISION, PROBLEM, SCRIPTURE.text, SCRIPTURE.reference, ...ABOUT_PARAGRAPHS, ...FOR_PEOPLE, ...FOR_CHURCHES];
  for (const s of HOW_IT_WORKS) out.push(s.title, s.text);
  for (const g of [SERVICES.members, SERVICES.churches]) out.push(...g.free, ...g.coming);
  for (const e of EXAMPLE_EVENTS) out.push(e.title, e.kind, e.where, e.when, e.about);
  for (const f of FAQ) out.push(f.question, f.answer);
  return out;
};

const CLAIMS = /\b\d[\d,.]*\+?\s*(?:k|m)?\s*(?:users?|members?|churches|ministries|events|reviews?|ratings?|downloads?)\b|testimonial|five[- ]star|5[- ]star|rated\b|trusted by|thousands of|millions of|hundreds of (?:churches|events|members)|#1\b|guarantee/i;

describe("public page content", () => {
  it("S15 AC2 makes no claim about numbers of users, churches, events or ratings, and shows no prices", () => {
    expect(everyString().filter((s) => CLAIMS.test(s))).toEqual([]);
    expect(everyString().filter((s) => s.includes("$")), "prices come from the admin Billing console, never from page text").toEqual([]);
  });

  it("S15 AC2 the claim detector catches what it should (self-test)", () => {
    for (const bad of ["Join 10,000 members", "Over 500 churches", "Rated 5-star", "A testimonial", "Trusted by pastors", "Thousands of events", "1.2k users"]) expect(CLAIMS.test(bad), bad).toBe(true);
    for (const fine of ["Search 10, 25 or 50 miles", "Churches list events for free", "Tent revivals and worship nights"]) expect(CLAIMS.test(fine), fine).toBe(false);
  });

  it("S15 AC2 every example event is labeled as an example", () => {
    expect(EXAMPLE_EVENTS.length).toBeGreaterThanOrEqual(3);
    for (const e of EXAMPLE_EVENTS) expect(e.where, e.title).toMatch(/^Example\b/);
  });

  it("S15 AC3 the landing sections are complete: three steps, and free features for people and churches", () => {
    expect(HOW_IT_WORKS).toHaveLength(3);
    expect(FOR_PEOPLE.length).toBeGreaterThanOrEqual(3);
    expect(FOR_CHURCHES.length).toBeGreaterThanOrEqual(3);
    for (const line of [...FOR_PEOPLE, ...FOR_CHURCHES]) expect(line, "free features never mention paying").not.toMatch(/paid|premium|subscription/i);
  });

  it("S15 AC4 free features never mention paying, and planned ones are kept apart under 'coming'", () => {
    for (const group of [SERVICES.members, SERVICES.churches]) {
      expect(group.free.length).toBeGreaterThanOrEqual(3);
      expect(group.coming.length).toBeGreaterThanOrEqual(2);
      for (const line of group.free) expect(line, line).not.toMatch(/paid|premium|subscription|coming/i);
    }
    expect([...SERVICES.members.coming, ...SERVICES.churches.coming].some((l) => /paid/i.test(l))).toBe(true); // the plan's paid ideas appear only here
  });

  it("S15 AC5 the About page carries the plan's mission, vision, scripture and the problem", () => {
    expect(MISSION).toMatch(/connect believers with churches, ministries, and revival gatherings/i);
    expect(VISION).toMatch(/largest Christian revival discovery platform/i);
    expect(SCRIPTURE.reference).toMatch(/Isaiah 40:3/);
    expect(PROBLEM).toMatch(/denominations and independent ministries/i);
    expect(ABOUT_PARAGRAPHS).toContain(PROBLEM);
  });

  it("S15 AC6 the FAQ has at least 12 distinct questions, each with a real answer", () => {
    expect(FAQ.length).toBeGreaterThanOrEqual(12);
    expect(new Set(FAQ.map((f) => f.question)).size).toBe(FAQ.length);
    for (const f of FAQ) {
      expect(f.question, "a question ends with a question mark").toMatch(/\?$/);
      expect(f.answer.trim().length, f.question).toBeGreaterThan(30);
    }
  });

  it("S15 AC6 answers do not promise what the app does not do today", () => {
    const text = FAQ.map((f) => f.answer).join(" ");
    expect(text).not.toMatch(/instant|24\/7|guaranteed|always free|forever/i);
    expect(text).toMatch(/early access/i); // the cost answer says "free during early access", not "free forever"
    const phone = FAQ.find((f) => /phone app/i.test(f.question));
    expect(phone?.answer).toMatch(/in testing/i); // honest about the apps
    const alerts = FAQ.find((f) => /alerts work/i.test(f.question));
    expect(alerts?.answer).toMatch(/being switched on/i); // delivery is not live yet
  });
});
