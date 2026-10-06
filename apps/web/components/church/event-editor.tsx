"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, Plus, X } from "lucide-react";
import { ChurchMockNotice } from "@/components/church/mock-notice";
import { DeferredItems } from "@/components/church/deferred-items";
import { FilterChip } from "@/components/discover/filter-chip";
import { RevivalTypeBadge } from "@/components/discover/revival-type-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MAX_LINKS,
  addLink,
  canAddLink,
  canRemoveLink,
  enteredLinks,
  removeLink,
  toggleRevivalType,
  validateDraft,
} from "@/lib/church/event-draft";
import type { DraftErrors, EventDraft } from "@/lib/church/types";
import { formatDateSpan, formatTimeSpan } from "@/lib/discover/format";
import { REVIVAL_TYPES } from "@/lib/discover/revival-types";
import { cn } from "@/lib/utils";

export type EditorMode = "create" | "edit" | "replace";

const COPY: Record<EditorMode, { title: string; review: string; submit: string; doneTitle: string; doneBody: string }> = {
  create: {
    title: "Create an event",
    review: "Review event",
    submit: "Submit event (mock)",
    doneTitle: "Mock submission complete",
    doneBody: "No event was created. In the real product this is where your event would be submitted.",
  },
  edit: {
    title: "Edit event",
    review: "Review changes",
    submit: "Save changes (mock)",
    doneTitle: "Mock update complete",
    doneBody: "Nothing was changed. The event in your list still shows its original details.",
  },
  replace: {
    title: "Replace event",
    review: "Review replacement",
    submit: "Replace event (mock)",
    doneTitle: "Mock replacement complete",
    doneBody: "Nothing was replaced or removed. The original event is still in your list.",
  },
};

type Step = "form" | "review" | "done";

const STEP_LABELS = ["Details", "Review", "Mock result"] as const;

type EventEditorProps = {
  mode: EditorMode;
  initial: EventDraft;
  /** Where "Back" and "Done" lead. */
  returnHref: string;
  returnLabel: string;
};

/**
 * Details -> Review -> Mock result. State lives only in this component; there is
 * deliberately no request, storage, or persistence of any kind.
 */
export function EventEditor({ mode, initial, returnHref, returnLabel }: EventEditorProps) {
  const copy = COPY[mode];
  const [draft, setDraft] = useState<EventDraft>(initial);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [step, setStep] = useState<Step>("form");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Move focus to the step heading when the step changes (not on first render).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  const set = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  function goToReview(e: FormEvent) {
    e.preventDefault();
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length === 0) setStep("review");
  }

  function startOver() {
    setDraft(initial);
    setErrors({});
    setStep("form");
  }

  const errorCount = Object.keys(errors).length;
  const stepIndex = step === "form" ? 0 : step === "review" ? 1 : 2;

  return (
    <div className="flex flex-col gap-6">
      <ChurchMockNotice />

      <header className="flex flex-col gap-3">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-heading text-3xl leading-tight font-semibold tracking-tight outline-none sm:text-4xl"
        >
          {step === "done" ? copy.doneTitle : step === "review" ? `${copy.title}: review` : copy.title}
        </h1>
        <ol className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Progress">
          {STEP_LABELS.map((label, i) => (
            <li
              key={label}
              aria-current={i === stepIndex ? "step" : undefined}
              className={cn(
                "font-medium",
                i === stepIndex ? "text-primary" : "text-muted-foreground",
              )}
            >
              {i + 1}. {label}
            </li>
          ))}
        </ol>
      </header>

      {step === "form" ? (
        <form onSubmit={goToReview} noValidate className="flex flex-col gap-6">
          {errorCount > 0 ? (
            <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Please fix {errorCount === 1 ? "1 problem" : `${errorCount} problems`} below before reviewing.
            </p>
          ) : null}

          <Section title="Church/Ministry">
            <Field label="Church/Ministry Name" id="churchName" error={errors.churchName}>
              <Input
                id="churchName"
                value={draft.churchName}
                onChange={(e) => set("churchName", e.target.value)}
                aria-invalid={Boolean(errors.churchName)}
                aria-describedby={errors.churchName ? "churchName-error" : undefined}
                autoComplete="organization"
              />
            </Field>
          </Section>

          <Section title="Dates and Times">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date" id="date" error={errors.date}>
                <Input id="date" type="date" value={draft.date} onChange={(e) => set("date", e.target.value)} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? "date-error" : undefined} />
              </Field>
              <Field label="End date (multi-day events)" id="endDate" error={errors.endDate} optional>
                <Input id="endDate" type="date" value={draft.endDate} onChange={(e) => set("endDate", e.target.value)} aria-invalid={Boolean(errors.endDate)} aria-describedby={errors.endDate ? "endDate-error" : undefined} />
              </Field>
              <Field label="Start time" id="startTime" error={errors.startTime}>
                <Input id="startTime" type="time" value={draft.startTime} onChange={(e) => set("startTime", e.target.value)} aria-invalid={Boolean(errors.startTime)} aria-describedby={errors.startTime ? "startTime-error" : undefined} />
              </Field>
              <Field label="End time" id="endTime" error={errors.endTime} optional>
                <Input id="endTime" type="time" value={draft.endTime} onChange={(e) => set("endTime", e.target.value)} aria-invalid={Boolean(errors.endTime)} aria-describedby={errors.endTime ? "endTime-error" : undefined} />
              </Field>
            </div>
          </Section>

          <Section title="Address">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Venue Name" id="venueName" error={errors.venueName} className="sm:col-span-2">
                <Input id="venueName" value={draft.venueName} onChange={(e) => set("venueName", e.target.value)} aria-invalid={Boolean(errors.venueName)} aria-describedby={errors.venueName ? "venueName-error" : undefined} />
              </Field>
              <Field label="Street" id="street" error={errors.street} className="sm:col-span-2">
                <Input id="street" value={draft.street} onChange={(e) => set("street", e.target.value)} aria-invalid={Boolean(errors.street)} aria-describedby={errors.street ? "street-error" : undefined} autoComplete="address-line1" />
              </Field>
              <Field label="City" id="city" error={errors.city}>
                <Input id="city" value={draft.city} onChange={(e) => set("city", e.target.value)} aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? "city-error" : undefined} autoComplete="address-level2" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="State" id="state" error={errors.state}>
                  <Input id="state" value={draft.state} maxLength={2} onChange={(e) => set("state", e.target.value.toUpperCase())} aria-invalid={Boolean(errors.state)} aria-describedby={errors.state ? "state-error" : undefined} autoComplete="address-level1" />
                </Field>
                <Field label="ZIP" id="zip" error={errors.zip}>
                  <Input id="zip" inputMode="numeric" value={draft.zip} onChange={(e) => set("zip", e.target.value)} aria-invalid={Boolean(errors.zip)} aria-describedby={errors.zip ? "zip-error" : undefined} autoComplete="postal-code" />
                </Field>
              </div>
            </div>
          </Section>

          <Section title="Revival Types">
            <fieldset aria-describedby={errors.revivalTypes ? "revivalTypes-error" : undefined}>
              <legend className="mb-2 text-sm text-muted-foreground">
                Select every type that applies. You can choose more than one.
              </legend>
              <div className="flex flex-wrap gap-2">
                {REVIVAL_TYPES.map((t) => (
                  <FilterChip
                    key={t.id}
                    active={draft.revivalTypes.includes(t.id)}
                    onClick={() => set("revivalTypes", toggleRevivalType(draft.revivalTypes, t.id))}
                  >
                    {t.label}
                  </FilterChip>
                ))}
              </div>
            </fieldset>
            {errors.revivalTypes ? <FieldError id="revivalTypes-error">{errors.revivalTypes}</FieldError> : null}
          </Section>

          <Section title="Website/Social Links">
            <p className="text-sm text-muted-foreground">
              Add at least 1 and up to {MAX_LINKS}. {draft.links.length} of {MAX_LINKS} in use.
            </p>
            <ul className="flex flex-col gap-3">
              {draft.links.map((link, i) => {
                const err = errors[`links.${i}`];
                return (
                  <li key={i} className="flex flex-col gap-1">
                    <label htmlFor={`link-${i}`} className="text-sm font-medium">
                      Link {i + 1}
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`link-${i}`}
                        type="url"
                        inputMode="url"
                        placeholder="https://"
                        value={link}
                        onChange={(e) => set("links", draft.links.map((l, j) => (j === i ? e.target.value : l)))}
                        aria-invalid={Boolean(err)}
                        aria-describedby={err ? `link-${i}-error` : undefined}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={`Remove link ${i + 1}`}
                        disabled={!canRemoveLink(draft.links)}
                        onClick={() => set("links", removeLink(draft.links, i))}
                      >
                        <X aria-hidden />
                      </Button>
                    </div>
                    {err ? <FieldError id={`link-${i}-error`}>{err}</FieldError> : null}
                  </li>
                );
              })}
            </ul>
            {errors.links ? <FieldError id="links-error">{errors.links}</FieldError> : null}
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              disabled={!canAddLink(draft.links)}
              onClick={() => set("links", addLink(draft.links))}
            >
              <Plus aria-hidden /> Add link
            </Button>
            {!canAddLink(draft.links) ? (
              <p className="text-sm text-muted-foreground">Maximum of {MAX_LINKS} links reached.</p>
            ) : null}
          </Section>

          <DeferredItems />

          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="lg">
              {copy.review}
            </Button>
            <Link href={returnHref} className={buttonVariants({ variant: "ghost", size: "lg" })}>
              Cancel
            </Link>
          </div>
        </form>
      ) : null}

      {step === "review" ? (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-muted-foreground">
            Check the details below. This is the last step before the mock submission.
          </p>
          <ReviewSummary draft={draft} />
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={() => setStep("done")}>
              {copy.submit}
            </Button>
            <Button size="lg" variant="outline" onClick={() => setStep("form")}>
              Back to edit
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Mock only: submitting does not save anything.
          </p>
        </div>
      ) : null}

      {step === "done" ? (
        <div className="flex flex-col gap-6">
          <div role="status" className="flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4">
            <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="flex flex-col gap-1 text-sm">
              <p className="font-semibold">{copy.doneBody}</p>
              <p className="text-muted-foreground">
                This walkthrough does not store, publish, or send your information, so it will not
                appear in your event list or in Discover.
              </p>
            </div>
          </div>
          <ReviewSummary draft={draft} />
          <div className="flex flex-wrap gap-3">
            <Link href={returnHref} className={buttonVariants({ size: "lg" })}>
              {returnLabel}
            </Link>
            <Button size="lg" variant="outline" onClick={startOver}>
              Start over
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground">
      <h2 className="font-heading text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  id,
  error,
  optional,
  className,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {optional ? <span className="font-normal text-muted-foreground"> (optional)</span> : null}
      </label>
      {children}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </div>
  );
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="text-sm text-destructive">
      {children}
    </p>
  );
}

/** Read-only summary used by Review and by the mock result. */
function ReviewSummary({ draft }: { draft: EventDraft }) {
  const rows: [string, ReactNode][] = [
    ["Church/Ministry", draft.churchName.trim()],
    ["Date", formatDateSpan({ date: draft.date, endDate: draft.endDate || undefined })],
    ["Time", formatTimeSpan({ startTime: draft.startTime, endTime: draft.endTime || undefined })],
    ["Venue", draft.venueName.trim()],
    [
      "Address",
      `${draft.street.trim()}, ${draft.city.trim()}, ${draft.state.trim().toUpperCase()} ${draft.zip.trim()}`,
    ],
    [
      "Revival Types",
      <ul key="types" className="flex flex-wrap gap-1.5">
        {draft.revivalTypes.map((t) => (
          <li key={t}>
            <RevivalTypeBadge type={t} />
          </li>
        ))}
      </ul>,
    ],
    [
      "Website/Social Links",
      <ul key="links" className="flex flex-col gap-1 break-all">
        {enteredLinks(draft.links).map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>,
    ],
  ];

  return (
    <dl className="grid gap-3 rounded-xl border bg-card p-4 text-sm text-card-foreground sm:grid-cols-[11rem_1fr]">
      {rows.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="font-medium text-muted-foreground">{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
