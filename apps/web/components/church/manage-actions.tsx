"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Repeat, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Illustrative only. Recurrence rules and what each scope means are UNDECIDED
// (/docs/naming-conventions.md); these labels exist to explore the workflow.
const SCOPES = [
  { id: "occurrence", label: "This occurrence only" },
  { id: "following", label: "This and following occurrences" },
  { id: "series", label: "The entire series" },
] as const;

type ScopeId = (typeof SCOPES)[number]["id"];

type ManageActionsProps = {
  eventId: string;
  recurring: boolean;
};

/** Edit, Replace, and Remove affordances for one Event. None of them persists anything. */
export function ManageActions({ eventId, recurring }: ManageActionsProps) {
  const [scope, setScope] = useState<ScopeId>("occurrence");
  const [confirming, setConfirming] = useState(false);
  const [removed, setRemoved] = useState(false);
  const scopeLabel = SCOPES.find((s) => s.id === scope)!.label.toLowerCase();

  return (
    <div className="flex flex-col gap-5">
      {recurring ? (
        <fieldset className="flex flex-col gap-2 rounded-xl border p-4">
          <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold">
            <Repeat aria-hidden className="size-4 text-primary" /> Apply changes to
          </legend>
          <p className="text-sm text-muted-foreground">
            Illustrative choices for exploring how a recurring event could be managed. How
            recurring events work is not decided yet, and this choice changes nothing.
          </p>
          {SCOPES.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="scope"
                value={s.id}
                checked={scope === s.id}
                onChange={() => setScope(s.id)}
                className="size-4 accent-[var(--primary)]"
              />
              {s.label}
            </label>
          ))}
        </fieldset>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2">
        <li className="flex flex-col gap-2 rounded-xl border p-4">
          <h3 className="font-heading text-sm font-semibold">Edit / update</h3>
          <p className="text-sm text-muted-foreground">
            Change the details of this event, such as the time or venue.
          </p>
          <Link href={`/dashboard/church/events/${eventId}/edit`} className={cn(buttonVariants({ variant: "outline" }), "mt-auto w-fit")}>
            <Pencil aria-hidden /> Edit event
          </Link>
        </li>
        <li className="flex flex-col gap-2 rounded-xl border p-4">
          <h3 className="font-heading text-sm font-semibold">Replace</h3>
          <p className="text-sm text-muted-foreground">
            Start a new event from this one&apos;s details. In the real product the original would be
            retired.
          </p>
          <Link href={`/dashboard/church/events/new?replace=${eventId}`} className={cn(buttonVariants({ variant: "outline" }), "mt-auto w-fit")}>
            Replace event
          </Link>
        </li>
      </ul>

      <section className="flex flex-col gap-3 rounded-xl border border-destructive/30 p-4" aria-labelledby="remove-heading">
        <h3 id="remove-heading" className="font-heading text-sm font-semibold">
          Remove
        </h3>
        {removed ? (
          <p role="status" className="text-sm">
            Mock only: nothing was removed
            {recurring ? ` (you chose ${scopeLabel})` : ""}. This event is still in your list. In the
            real product it would no longer appear in Discover.
          </p>
        ) : confirming ? (
          <div className="flex flex-col gap-3">
            <p role="alert" className="text-sm">
              Remove this event{recurring ? ` (${scopeLabel})` : ""}? This is a mock, so nothing will
              actually be removed.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" onClick={() => setRemoved(true)}>
                <Trash2 aria-hidden /> Confirm remove (mock)
              </Button>
              <Button variant="outline" onClick={() => setConfirming(false)}>
                Keep event
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Take this event off your list so the public no longer sees it.
            </p>
            <Button variant="destructive" className="w-fit" onClick={() => setConfirming(true)}>
              <Trash2 aria-hidden /> Remove event
            </Button>
          </>
        )}
      </section>
    </div>
  );
}
