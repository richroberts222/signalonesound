import { REVIVAL_TYPES, isRevivalTypeId, type RevivalTypeId } from "../discover/revival-types";
import type { DraftErrors, EventDraft, ManagedEvent } from "./types";

// Mock-stage form logic for the Church/Ministry event flow (Issue #70). The
// rules mirror the startup Church Portal requirements in the product plan. When
// real submission exists, validation must be enforced on the server (and shared
// with Web and Mobile); this module is not that enforcement.

export const MIN_LINKS = 1;
export const MAX_LINKS = 3;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const STATE = /^[A-Za-z]{2}$/;
const ZIP = /^\d{5}(-\d{4})?$/;

export function emptyDraft(churchName = ""): EventDraft {
  return {
    churchName,
    date: "",
    endDate: "",
    startTime: "",
    endTime: "",
    venueName: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    revivalTypes: [],
    links: [""],
  };
}

/** Copy an existing event's fields into a draft (Edit, Replace). */
export function draftFromEvent(event: ManagedEvent): EventDraft {
  return {
    churchName: event.churchName,
    date: event.date,
    endDate: event.endDate,
    startTime: event.startTime,
    endTime: event.endTime,
    venueName: event.venueName,
    street: event.street,
    city: event.city,
    state: event.state,
    zip: event.zip,
    revivalTypes: [...event.revivalTypes],
    links: [...event.links],
  };
}

/** Toggle one Revival Type; the result keeps the canonical list order. */
export function toggleRevivalType(selected: RevivalTypeId[], id: RevivalTypeId): RevivalTypeId[] {
  const next = new Set(selected);
  if (!next.delete(id)) next.add(id);
  return REVIVAL_TYPES.map((t) => t.id).filter((t) => next.has(t));
}

export function canAddLink(links: string[]): boolean {
  return links.length < MAX_LINKS;
}

export function canRemoveLink(links: string[]): boolean {
  return links.length > MIN_LINKS;
}

export function addLink(links: string[]): string[] {
  return canAddLink(links) ? [...links, ""] : links;
}

export function removeLink(links: string[], index: number): string[] {
  return canRemoveLink(links) ? links.filter((_, i) => i !== index) : links;
}

/** Links with surrounding whitespace removed and blank entries dropped. */
export function enteredLinks(links: string[]): string[] {
  return links.map((l) => l.trim()).filter(Boolean);
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function isRealDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d;
}

/** Returns field errors keyed by field name (`links.<index>` for a single link); empty when valid. */
export function validateDraft(draft: EventDraft): DraftErrors {
  const errors: DraftErrors = {};
  const required = (key: "churchName" | "venueName" | "street" | "city", message: string) => {
    if (!draft[key].trim()) errors[key] = message;
  };

  required("churchName", "Enter the Church/Ministry Name.");
  required("venueName", "Enter the Venue Name.");
  required("street", "Enter the street address.");
  required("city", "Enter the city.");

  if (!STATE.test(draft.state.trim())) errors.state = "Enter a 2-letter state, like TN.";
  if (!ZIP.test(draft.zip.trim())) errors.zip = "Enter a 5-digit ZIP code.";

  if (!draft.date) errors.date = "Choose the event date.";
  else if (!isRealDate(draft.date)) errors.date = "Enter a valid date.";

  if (draft.endDate) {
    if (!isRealDate(draft.endDate)) errors.endDate = "Enter a valid end date.";
    else if (!errors.date && draft.endDate < draft.date) errors.endDate = "End date can't be before the start date.";
  }

  if (!draft.startTime) errors.startTime = "Choose the start time.";
  else if (!TIME.test(draft.startTime)) errors.startTime = "Enter a valid start time.";

  if (draft.endTime) {
    if (!TIME.test(draft.endTime)) errors.endTime = "Enter a valid end time.";
    else if (
      !errors.startTime &&
      draft.endTime <= draft.startTime &&
      (!draft.endDate || draft.endDate === draft.date)
    ) {
      errors.endTime = "End time must be after the start time.";
    }
  }

  if (draft.revivalTypes.length === 0) errors.revivalTypes = "Select at least one Revival Type.";
  else if (!draft.revivalTypes.every(isRevivalTypeId)) errors.revivalTypes = "Choose Revival Types from the list.";

  const entered = draft.links.map((l) => l.trim());
  const filled = entered.filter(Boolean);
  if (filled.length < MIN_LINKS) errors.links = "Add at least 1 website or social link.";
  else if (draft.links.length > MAX_LINKS) errors.links = `Add no more than ${MAX_LINKS} links.`;
  entered.forEach((link, i) => {
    if (link && !isHttpUrl(link)) errors[`links.${i}`] = "Enter a full link starting with https://";
  });

  return errors;
}
