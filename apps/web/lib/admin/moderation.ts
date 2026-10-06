import type { ModerationAction, SubmissionStatus } from "./types";

// Illustrative moderation-state logic for the mock queue (Issue #76). Only a
// pending submission can be decided, and a decision is final within the mock.
// The real moderation policy, states, and appeal/undo rules are undecided.

export function applyModeration(status: SubmissionStatus, action: ModerationAction): SubmissionStatus {
  if (status !== "pending") return status;
  return action === "approve" ? "approved" : "rejected";
}

export function pendingCount(statuses: Iterable<SubmissionStatus>): number {
  let n = 0;
  for (const s of statuses) if (s === "pending") n++;
  return n;
}

/** Case-insensitive match of a search query against any of the given fields. */
export function matchesQuery(query: string, fields: readonly string[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f.toLowerCase().includes(q));
}
