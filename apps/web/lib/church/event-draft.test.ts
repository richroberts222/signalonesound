import { describe, expect, it } from "vitest";
import {
  MAX_LINKS,
  addLink,
  canAddLink,
  canRemoveLink,
  draftFromEvent,
  emptyDraft,
  removeLink,
  toggleRevivalType,
  validateDraft,
} from "./event-draft";
import { MANAGED_EVENTS } from "./mock-data";
import type { EventDraft } from "./types";

const valid = (): EventDraft => ({
  churchName: "Cornerstone Fellowship Nashville",
  date: "2026-10-22",
  endDate: "",
  startTime: "18:30",
  endTime: "21:00",
  venueName: "Main Sanctuary",
  street: "2200 Hillsboro Pike",
  city: "Nashville",
  state: "TN",
  zip: "37212",
  revivalTypes: ["church-revival"],
  links: ["https://example.org/church"],
});

describe("validateDraft", () => {
  it("accepts a complete startup-required draft", () => {
    expect(validateDraft(valid())).toEqual({});
  });

  it("requires every startup-required field on an empty draft", () => {
    const errors = validateDraft(emptyDraft());
    expect(Object.keys(errors).sort()).toEqual(
      ["churchName", "city", "date", "links", "revivalTypes", "startTime", "state", "street", "venueName", "zip"].sort(),
    );
  });

  it("requires at least one Revival Type but allows several", () => {
    expect(validateDraft({ ...valid(), revivalTypes: [] }).revivalTypes).toBeDefined();
    expect(validateDraft({ ...valid(), revivalTypes: ["tent-revival", "youth", "family"] })).toEqual({});
  });

  it("requires 1 link minimum and rejects more than 3", () => {
    expect(validateDraft({ ...valid(), links: ["", "  "] }).links).toBeDefined();
    const four = Array.from({ length: 4 }, (_, i) => `https://example.org/${i}`);
    expect(validateDraft({ ...valid(), links: four.slice(0, MAX_LINKS) })).toEqual({});
    expect(validateDraft({ ...valid(), links: four }).links).toBeDefined();
  });

  it("rejects links that are not http(s) URLs, and ignores blank extras", () => {
    const errors = validateDraft({ ...valid(), links: ["https://example.org", "not a link", ""] });
    expect(errors["links.1"]).toBeDefined();
    expect(errors["links.0"]).toBeUndefined();
    expect(validateDraft({ ...valid(), links: ["javascript:alert(1)"] })["links.0"]).toBeDefined();
  });

  it("checks date and time ordering", () => {
    expect(validateDraft({ ...valid(), endDate: "2026-10-21" }).endDate).toBeDefined();
    expect(validateDraft({ ...valid(), endTime: "18:00" }).endTime).toBeDefined();
    // A later end date makes an earlier end time legitimate (overnight / multi-day).
    expect(validateDraft({ ...valid(), endDate: "2026-10-23", endTime: "09:00" })).toEqual({});
    expect(validateDraft({ ...valid(), date: "2026-02-31" }).date).toBeDefined();
  });

  it("checks state and ZIP formats", () => {
    expect(validateDraft({ ...valid(), state: "Tennessee" }).state).toBeDefined();
    expect(validateDraft({ ...valid(), zip: "3721" }).zip).toBeDefined();
    expect(validateDraft({ ...valid(), zip: "37212-1234" })).toEqual({});
  });
});

describe("link list bounds", () => {
  it("cannot grow past the maximum or shrink below the minimum", () => {
    let links = [""];
    expect(canRemoveLink(links)).toBe(false);
    expect(removeLink(links, 0)).toEqual([""]);
    links = addLink(addLink(links));
    expect(links).toHaveLength(MAX_LINKS);
    expect(canAddLink(links)).toBe(false);
    expect(addLink(links)).toHaveLength(MAX_LINKS);
    expect(removeLink(links, 1)).toHaveLength(MAX_LINKS - 1);
  });
});

describe("toggleRevivalType", () => {
  it("adds and removes types while keeping the canonical list order", () => {
    const withYouth = toggleRevivalType(["worship-night"], "youth");
    expect(withYouth).toEqual(["worship-night", "youth"]);
    expect(toggleRevivalType(withYouth, "tent-revival")).toEqual(["tent-revival", "worship-night", "youth"]);
    expect(toggleRevivalType(withYouth, "worship-night")).toEqual(["youth"]);
  });
});

describe("mock managed events", () => {
  it("are valid drafts, so Edit and Replace start from reviewable data", () => {
    for (const event of MANAGED_EVENTS) {
      expect(validateDraft(draftFromEvent(event)), event.id).toEqual({});
    }
  });

  it("include a recurring example", () => {
    expect(MANAGED_EVENTS.some((e) => e.recurrence)).toBe(true);
  });

  it("copy rather than share arrays when starting a draft", () => {
    const event = MANAGED_EVENTS[0];
    const draft = draftFromEvent(event);
    draft.links.push("https://example.org/x");
    expect(event.links).not.toContain("https://example.org/x");
  });
});
