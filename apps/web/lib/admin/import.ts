import type {
  ImportRow,
  MockAdminEvent,
  ResolutionChoice,
  RowClassification,
  RowIssue,
} from "./types";

// Deterministic mock-import logic (Issue #76). Illustrative checks that let the
// UI explore validation and duplicate/conflict states. The real import rules
// (required columns, matching, what counts as a duplicate) are undecided, and
// nothing here parses a real file.

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const ZIP = /^\d{5}$/;

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

function isRealDate(ymd: string): boolean {
  if (!DATE.test(ymd)) return false;
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function validateRow(row: ImportRow): RowIssue[] {
  const issues: RowIssue[] = [];
  if (!row.organization.trim()) issues.push({ field: "organization", message: "Organization name is required." });
  if (!row.eventTitle.trim()) issues.push({ field: "eventTitle", message: "Event title is required." });
  if (!isRealDate(row.date)) issues.push({ field: "date", message: "Date must be a real date as YYYY-MM-DD." });
  if (!TIME.test(row.startTime)) issues.push({ field: "startTime", message: "Start time must be 24-hour HH:mm." });
  if (!row.venue.trim()) issues.push({ field: "venue", message: "Venue name is required." });
  if (!row.city.trim()) issues.push({ field: "city", message: "City is required." });
  if (!ZIP.test(row.zip.trim())) issues.push({ field: "zip", message: "ZIP must be 5 digits." });
  return issues;
}

function sameOccurrence(a: ImportRow, b: ImportRow): boolean {
  return (
    norm(a.organization) === norm(b.organization) &&
    norm(a.eventTitle) === norm(b.eventTitle) &&
    a.date === b.date &&
    a.startTime === b.startTime &&
    norm(a.venue) === norm(b.venue)
  );
}

/**
 * Classifies each row, in order: invalid, then duplicate of an earlier valid row
 * in the same file, then conflict with an existing event (same date and venue).
 */
export function classifyRows(
  rows: readonly ImportRow[],
  existing: readonly MockAdminEvent[],
): Map<number, RowClassification> {
  const result = new Map<number, RowClassification>();
  const accepted: ImportRow[] = [];

  for (const row of rows) {
    const issues = validateRow(row);
    if (issues.length > 0) {
      result.set(row.line, { kind: "invalid", issues });
      continue;
    }
    const earlier = accepted.find((r) => sameOccurrence(r, row));
    if (earlier) {
      result.set(row.line, { kind: "duplicate-in-file", ofLine: earlier.line });
      continue;
    }
    accepted.push(row);

    const clash = existing.find((e) => e.date === row.date && norm(e.venueName) === norm(row.venue));
    if (clash) {
      const reason =
        clash.startTime === row.startTime && norm(clash.title) === norm(row.eventTitle)
          ? `Already exists as "${clash.title}".`
          : `Same date and venue as "${clash.title}" but the time or title differs.`;
      result.set(row.line, { kind: "conflict", withEventId: clash.id, reason });
      continue;
    }
    result.set(row.line, { kind: "ok" });
  }
  return result;
}

export type ImportSummary = {
  total: number;
  ready: number;
  invalid: number;
  duplicates: number;
  conflicts: number;
};

export function summarize(classes: ReadonlyMap<number, RowClassification>): ImportSummary {
  const s: ImportSummary = { total: 0, ready: 0, invalid: 0, duplicates: 0, conflicts: 0 };
  for (const c of classes.values()) {
    s.total++;
    if (c.kind === "ok") s.ready++;
    else if (c.kind === "invalid") s.invalid++;
    else if (c.kind === "duplicate-in-file") s.duplicates++;
    else s.conflicts++;
  }
  return s;
}

/** Choices offered for a row that needs a decision. Invalid rows can only be skipped. */
export function resolutionOptions(c: RowClassification): ResolutionChoice[] {
  switch (c.kind) {
    case "ok":
      return [];
    case "invalid":
      return ["skip"];
    case "duplicate-in-file":
      return ["skip", "import-anyway"];
    case "conflict":
      return ["skip", "update-existing", "import-anyway"];
  }
}

/** Rows that still need a decision: every non-ok row without a choice. */
export function unresolvedLines(
  classes: ReadonlyMap<number, RowClassification>,
  choices: Readonly<Record<number, ResolutionChoice | undefined>>,
): number[] {
  return [...classes.entries()]
    .filter(([line, c]) => c.kind !== "ok" && !choices[line])
    .map(([line]) => line);
}

export type ImportOutcome = { wouldCreate: number; wouldUpdate: number; wouldSkip: number };

/** What the final screen reports. Nothing is persisted; this only counts the user's choices. */
export function computeOutcome(
  classes: ReadonlyMap<number, RowClassification>,
  choices: Readonly<Record<number, ResolutionChoice | undefined>>,
): ImportOutcome {
  const out: ImportOutcome = { wouldCreate: 0, wouldUpdate: 0, wouldSkip: 0 };
  for (const [line, c] of classes) {
    if (c.kind === "ok") out.wouldCreate++;
    else {
      const choice = choices[line];
      if (choice === "import-anyway") out.wouldCreate++;
      else if (choice === "update-existing") out.wouldUpdate++;
      else out.wouldSkip++;
    }
  }
  return out;
}
