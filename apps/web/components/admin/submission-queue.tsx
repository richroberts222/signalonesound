"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Check, Pencil, X } from "lucide-react";
import { EmptyState } from "@/components/admin/empty-state";
import { RevivalTypeBadge } from "@/components/discover/revival-type-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { applyModeration, pendingCount } from "@/lib/admin/moderation";
import type { MockAdminEvent, MockSubmission, ModerationAction, SubmissionStatus } from "@/lib/admin/types";
import { formatDay, formatTime } from "@/lib/discover/format";
import { cn } from "@/lib/utils";

type Props = { submissions: MockSubmission[]; events: MockAdminEvent[] };

/** Pending-submission queue with inspect, approve, reject, and edit-before-approval. Mock only. */
export function SubmissionQueue({ submissions, events }: Props) {
  const [statuses, setStatuses] = useState<Record<string, SubmissionStatus>>(() =>
    Object.fromEntries(submissions.map((s) => [s.id, "pending" as SubmissionStatus])),
  );
  const [selectedId, setSelectedId] = useState<string | null>(submissions[0]?.id ?? null);
  const [editing, setEditing] = useState(false);
  const [edits, setEdits] = useState({ title: "", venueName: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [lastNote, setLastNote] = useState<string | null>(null);

  const pending = pendingCount(Object.values(statuses));
  const selected = submissions.find((s) => s.id === selectedId) ?? null;
  const selectedStatus = selected ? statuses[selected.id] : null;

  function select(id: string) {
    setSelectedId(id);
    setEditing(false);
    setEditError(null);
  }

  function decide(s: MockSubmission, action: ModerationAction, edited = false) {
    setStatuses((prev) => ({ ...prev, [s.id]: applyModeration(prev[s.id], action) }));
    setEditing(false);
    setLastNote(
      `Mock only: "${edited ? edits.title : s.title}" was ${action === "approve" ? (edited ? "approved with your edits" : "approved") : "rejected"} for this page view. Nothing was saved, published, or sent to the submitter.`,
    );
  }

  function startEdit(s: MockSubmission) {
    setEdits({ title: s.title, venueName: s.venueName });
    setEditError(null);
    setEditing(true);
  }

  function approveEdited(s: MockSubmission) {
    if (!edits.title.trim() || !edits.venueName.trim()) {
      setEditError("Title and venue are required before approval.");
      return;
    }
    decide(s, "approve", true);
  }

  const duplicate = selected?.possibleDuplicateOf
    ? events.find((e) => e.id === selected.possibleDuplicateOf)
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {pending} of {submissions.length} pending
      </p>
      {lastNote ? (
        <p role="status" className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
          {lastNote}
        </p>
      ) : null}

      {pending === 0 ? (
        <EmptyState title="The queue is clear">
          Every fictional submission has been decided in this mock view. Reload the page to reset it.
        </EmptyState>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <ul aria-label="Submissions" className="flex flex-col gap-2">
          {submissions.map((s) => {
            const status = statuses[s.id];
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => select(s.id)}
                  aria-pressed={selectedId === s.id}
                  className={cn(
                    "flex w-full flex-col gap-1.5 rounded-xl border bg-card p-3 text-left text-card-foreground transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    selectedId === s.id ? "border-primary/60 bg-primary/5" : "hover:border-primary/40",
                  )}
                >
                  <span className="flex flex-wrap items-start justify-between gap-2">
                    <span className="font-heading leading-snug font-semibold">{s.title}</span>
                    <Badge variant={status === "pending" ? "outline" : status === "approved" ? "default" : "destructive"}>
                      {status === "pending" ? "Pending" : status === "approved" ? "Approved (mock)" : "Rejected (mock)"}
                    </Badge>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {s.submittedBy} · {formatDay(s.submittedOn)}
                  </span>
                  {s.flags.length > 0 ? (
                    <span className="flex items-center gap-1 text-xs text-amber-400">
                      <AlertTriangle aria-hidden className="size-3.5" /> {s.flags.length} flag{s.flags.length === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        {selected && selectedStatus ? (
          <section aria-labelledby="inspect-heading" className="flex flex-col gap-4 rounded-xl border p-4">
            <h2 id="inspect-heading" className="font-heading text-xl font-semibold">
              {selected.title}
            </h2>
            <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="text-muted-foreground">Submitted by</dt>
              <dd>
                {selected.submittedBy}
                <span className="block text-muted-foreground">{selected.submitterNote}</span>
              </dd>
              <dt className="text-muted-foreground">When</dt>
              <dd>
                {formatDay(selected.date)} · {formatTime(selected.startTime)}
              </dd>
              <dt className="text-muted-foreground">Where</dt>
              <dd>
                {selected.venueName || <span className="text-destructive">Not provided</span>}, {selected.city}, {selected.state}
              </dd>
              <dt className="text-muted-foreground">Revival Types</dt>
              <dd>
                <ul className="flex flex-wrap gap-1.5">
                  {selected.revivalTypes.map((t) => (
                    <li key={t}>
                      <RevivalTypeBadge type={t} />
                    </li>
                  ))}
                </ul>
              </dd>
            </dl>

            <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3">
              <h3 className="text-sm font-semibold">Moderation context</h3>
              {selected.flags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No flags raised.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {selected.flags.map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-400" /> {f}
                    </li>
                  ))}
                </ul>
              )}
              {duplicate ? (
                <p className="text-sm">
                  Possible duplicate of{" "}
                  <Link href={`/admin/events/${duplicate.id}`} className="text-primary underline-offset-4 hover:underline">
                    {duplicate.title}
                  </Link>
                  .
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Flags are illustrative. The real moderation policy is not decided.
              </p>
            </div>

            {selectedStatus !== "pending" ? (
              <p role="status" className="text-sm">
                Decision recorded for this view only ({selectedStatus}). In the real product the decision,
                who made it, and when would be kept as history.
              </p>
            ) : editing ? (
              <div className="flex flex-col gap-3 rounded-lg border p-3">
                {editError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {editError}
                  </p>
                ) : null}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-title" className="text-sm font-medium">
                    Title
                  </label>
                  <Input id="edit-title" value={edits.title} aria-invalid={editError ? true : undefined} onChange={(e) => setEdits({ ...edits, title: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-venue" className="text-sm font-medium">
                    Venue name
                  </label>
                  <Input id="edit-venue" value={edits.venueName} aria-invalid={editError ? true : undefined} onChange={(e) => setEdits({ ...edits, venueName: e.target.value })} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => approveEdited(selected)}>
                    <Check aria-hidden /> Approve with edits (mock)
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Cancel edit
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => decide(selected, "approve")}>
                  <Check aria-hidden /> Approve (mock)
                </Button>
                <Button variant="outline" onClick={() => startEdit(selected)}>
                  <Pencil aria-hidden /> Edit before approval
                </Button>
                <Button variant="destructive" onClick={() => decide(selected, "reject")}>
                  <X aria-hidden /> Reject (mock)
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              These actions are mock-only. Nothing is persisted, published, or sent.
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
