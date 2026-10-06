import type { RevivalTypeId } from "../discover/revival-types";

// MOCK-STAGE shapes for the Admin / Content Management mock (Issue #76). They
// describe what the mock UI needs; they are NOT a database schema, API contract,
// or role/permission model. The Data Requirements Review decides the real model
// (/docs/product-development.md).

/** Illustrative provenance of an event. The real source model is undecided. */
export type EventSource = "church" | "community" | "admin" | "import";

/** Illustrative organization status. Real lifecycle states are undecided. */
export type OrgStatus = "active" | "unverified" | "paused";

export type OrgManager = {
  name: string;
  /** Illustrative label only; roles and permissions are undecided. */
  relationship: string;
};

export type MockOrg = {
  id: string;
  name: string;
  kind: "Church" | "Ministry";
  status: OrgStatus;
  street: string;
  city: string;
  state: string;
  zip: string;
  /** Fictional contact; uses reserved example domains only. */
  contactEmail: string;
  phone: string;
  website: string;
  managers: OrgManager[];
  /** Where this record came from, to expose provenance needs. */
  origin: string;
  lastUpdated: string;
};

export type EventStatus = "published" | "pending-review" | "hidden";

export type MockAdminEvent = {
  id: string;
  title: string;
  orgId: string | null;
  orgName: string;
  /** YYYY-MM-DD */
  date: string;
  startTime: string;
  venueName: string;
  city: string;
  state: string;
  revivalTypes: RevivalTypeId[];
  status: EventStatus;
  source: EventSource;
  /** Free-text provenance detail, e.g. an import batch name. */
  sourceDetail: string;
};

export type SubmissionStatus = "pending" | "approved" | "rejected";
export type ModerationAction = "approve" | "reject";

export type MockSubmission = {
  id: string;
  title: string;
  submittedBy: string;
  /** Fictional; whether submitters need accounts is undecided. */
  submitterNote: string;
  submittedOn: string;
  date: string;
  startTime: string;
  venueName: string;
  city: string;
  state: string;
  revivalTypes: RevivalTypeId[];
  /** Moderation context signals shown to the reviewer. Not a policy. */
  flags: string[];
  /** Existing record this might duplicate, if any. */
  possibleDuplicateOf?: string;
};

/** One row of the fictional CSV preview. All values are raw strings, as in a CSV. */
export type ImportRow = {
  line: number;
  organization: string;
  eventTitle: string;
  date: string;
  startTime: string;
  venue: string;
  city: string;
  state: string;
  zip: string;
};

export type RowIssue = {
  field: keyof ImportRow;
  message: string;
};

export type RowClassification =
  | { kind: "ok" }
  | { kind: "invalid"; issues: RowIssue[] }
  | { kind: "duplicate-in-file"; ofLine: number }
  | { kind: "conflict"; withEventId: string; reason: string };

export type ResolutionChoice = "skip" | "import-anyway" | "update-existing";
