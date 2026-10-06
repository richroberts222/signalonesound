import type { RevivalTypeId } from "../discover/revival-types";

// MOCK-STAGE shapes for the Church/Ministry event-management mock (Issue #70).
// They describe what the mock UI needs; they are NOT a database schema or API
// contract. The Data Requirements Review / Database Design Checkpoint decides the
// real model (/docs/product-development.md).

/**
 * Startup-required Church Portal input (source product plan, "Church Portal —
 * Startup"): Church/Ministry Name, Dates and Times, Address (Venue Name, Street,
 * City, State, ZIP), Revival Type(s), and 1-3 Website/Social links.
 *
 * Deliberately absent: flyer (UNDECIDED), livestream link (UNDECIDED), Speaker(s)
 * (Later Phase 1), and any event title/description (not listed as required).
 */
export type EventDraft = {
  churchName: string;
  /** YYYY-MM-DD */
  date: string;
  /** YYYY-MM-DD; optional, for multi-day events. */
  endDate: string;
  /** HH:mm, 24-hour */
  startTime: string;
  /** HH:mm; optional */
  endTime: string;
  venueName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  revivalTypes: RevivalTypeId[];
  /** Website/Social links as entered; blank entries are ignored by validation. */
  links: string[];
};

export type DraftErrors = Partial<Record<string, string>>;

/**
 * Illustrative recurrence description for a mock event. Recurrence rules, how a
 * series relates to its occurrences, and edit scopes are UNDECIDED
 * (/docs/naming-conventions.md); this is display text only, not a rule model.
 */
export type MockRecurrence = {
  pattern: string;
  /** Upcoming dates (YYYY-MM-DD) shown as occurrences of the series. */
  upcoming: string[];
};

/** An Event the mock Church/Ministry user "manages". Fictional data. */
export type ManagedEvent = EventDraft & {
  id: string;
  recurrence?: MockRecurrence;
};
