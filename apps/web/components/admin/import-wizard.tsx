"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Copy, FileSpreadsheet, GitMerge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  classifyRows,
  computeOutcome,
  resolutionOptions,
  summarize,
  unresolvedLines,
} from "@/lib/admin/import";
import { IMPORT_FILE_NAME, IMPORT_ROWS, MOCK_ADMIN_EVENTS } from "@/lib/admin/mock-data";
import type { ResolutionChoice, RowClassification } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

type Step = "choose" | "preview" | "resolve" | "result";
const STEPS: { id: Step; label: string }[] = [
  { id: "choose", label: "Choose file" },
  { id: "preview", label: "Preview and validate" },
  { id: "resolve", label: "Resolve" },
  { id: "result", label: "Result" },
];

const CHOICE_LABEL: Record<ResolutionChoice, string> = {
  skip: "Skip this row",
  "import-anyway": "Import as a new record anyway",
  "update-existing": "Update the existing event",
};

function describe(c: RowClassification): string {
  switch (c.kind) {
    case "ok":
      return "Ready";
    case "invalid":
      return c.issues.map((i) => i.message).join(" ");
    case "duplicate-in-file":
      return `Duplicate of line ${c.ofLine} in this file.`;
    case "conflict":
      return c.reason;
  }
}

function StatusCell({ c }: { c: RowClassification }) {
  if (c.kind === "ok") {
    return (
      <span className="flex items-center gap-1 text-emerald-400">
        <CheckCircle2 aria-hidden className="size-4" /> Ready
      </span>
    );
  }
  const label = c.kind === "invalid" ? "Error" : c.kind === "conflict" ? "Conflict" : "Duplicate";
  const Icon = c.kind === "invalid" ? AlertCircle : c.kind === "conflict" ? GitMerge : Copy;
  return (
    <span className={cn("flex items-start gap-1", c.kind === "invalid" ? "text-destructive" : "text-amber-400")}>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        <span className="font-medium">{label}.</span> <span className="text-muted-foreground">{describe(c)}</span>
      </span>
    </span>
  );
}

/** Four-step mock import. It never reads the chosen file; the preview is always the fictional sample. */
export function ImportWizard() {
  const [step, setStep] = useState<Step>("choose");
  const [fileName, setFileName] = useState<string | null>(null);
  const [chooseError, setChooseError] = useState<string | null>(null);
  const [choices, setChoices] = useState<Record<number, ResolutionChoice | undefined>>({});
  const [resolveError, setResolveError] = useState<string | null>(null);

  const classes = useMemo(() => classifyRows(IMPORT_ROWS, MOCK_ADMIN_EVENTS), []);
  const summary = summarize(classes);
  const needsDecision = IMPORT_ROWS.filter((r) => classes.get(r.line)!.kind !== "ok");

  function reset() {
    setStep("choose");
    setFileName(null);
    setChoices({});
    setChooseError(null);
    setResolveError(null);
  }

  function toPreview() {
    if (!fileName) {
      setChooseError("Choose a CSV or spreadsheet file, or use the sample file, to continue.");
      return;
    }
    setChooseError(null);
    setStep("preview");
  }

  function toResult() {
    const missing = unresolvedLines(classes, choices);
    if (missing.length > 0) {
      setResolveError(`Choose what to do with line${missing.length === 1 ? "" : "s"} ${missing.join(", ")} before finishing.`);
      return;
    }
    setResolveError(null);
    setStep("result");
  }

  const outcome = computeOutcome(classes, choices);

  return (
    <div className="flex flex-col gap-5">
      <ol aria-label="Import steps" className="flex flex-wrap gap-2 text-sm">
        {STEPS.map((s, i) => (
          <li
            key={s.id}
            aria-current={s.id === step ? "step" : undefined}
            className={cn(
              "rounded-full border px-3 py-1",
              s.id === step ? "border-primary/50 bg-primary/15 text-primary" : "text-muted-foreground",
            )}
          >
            {i + 1}. {s.label}
          </li>
        ))}
      </ol>

      {step === "choose" ? (
        <section aria-labelledby="choose-heading" className="flex flex-col gap-4 rounded-xl border p-4">
          <h2 id="choose-heading" className="font-heading text-xl font-semibold">
            Choose a file
          </h2>
          <p className="text-sm text-muted-foreground">
            This mock does not read your file. Whatever you choose, the next step previews a fictional
            sample. No file is uploaded, and no spreadsheet service is used.
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="import-file" className="text-sm font-medium">
              CSV or spreadsheet file
            </label>
            <input
              id="import-file"
              type="file"
              accept=".csv,.xlsx,.xls,text/csv"
              onChange={(e) => {
                setFileName(e.target.files?.[0]?.name ?? null);
                setChooseError(null);
              }}
              className="w-full rounded-lg border bg-background p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:text-secondary-foreground"
            />
          </div>
          <div>
            <Button
              variant="outline"
              onClick={() => {
                setFileName(IMPORT_FILE_NAME);
                setChooseError(null);
              }}
            >
              <FileSpreadsheet aria-hidden /> Use sample file ({IMPORT_FILE_NAME})
            </Button>
          </div>
          {fileName ? (
            <p role="status" className="text-sm">
              Selected: <strong>{fileName}</strong> (not read; preview uses fictional rows)
            </p>
          ) : null}
          {chooseError ? (
            <p role="alert" className="text-sm text-destructive">
              {chooseError}
            </p>
          ) : null}
          <Button className="w-fit" onClick={toPreview}>
            Preview rows
          </Button>
        </section>
      ) : null}

      {step === "preview" ? (
        <section aria-labelledby="preview-heading" className="flex flex-col gap-4">
          <h2 id="preview-heading" className="font-heading text-xl font-semibold">
            Preview and validate
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Validation summary">
            {[
              ["Ready", summary.ready],
              ["Errors", summary.invalid],
              ["Duplicates", summary.duplicates],
              ["Conflicts", summary.conflicts],
            ].map(([label, n]) => (
              <li key={label} className="rounded-xl border bg-card p-3">
                <p className="text-2xl font-semibold">{n}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </li>
            ))}
          </ul>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <caption className="sr-only">Fictional import rows with validation status</caption>
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  {["Line", "Organization", "Event", "Date", "Start", "Venue", "City", "ZIP", "Status"].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {IMPORT_ROWS.map((r) => {
                  const c = classes.get(r.line)!;
                  return (
                    <tr key={r.line} className={cn("border-t align-top", c.kind === "invalid" && "bg-destructive/5")}>
                      <td className="px-3 py-2">{r.line}</td>
                      <td className="px-3 py-2">{r.organization || <em className="text-destructive">empty</em>}</td>
                      <td className="px-3 py-2">{r.eventTitle}</td>
                      <td className="px-3 py-2">{r.date}</td>
                      <td className="px-3 py-2">{r.startTime}</td>
                      <td className="px-3 py-2">{r.venue}</td>
                      <td className="px-3 py-2">{r.city}</td>
                      <td className="px-3 py-2">{r.zip}</td>
                      <td className="px-3 py-2">
                        <StatusCell c={c} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setStep(needsDecision.length > 0 ? "resolve" : "result")}>
              {needsDecision.length > 0 ? `Review ${needsDecision.length} rows that need a decision` : "Finish"}
            </Button>
            <Button variant="outline" onClick={reset}>
              Choose a different file
            </Button>
          </div>
        </section>
      ) : null}

      {step === "resolve" ? (
        <section aria-labelledby="resolve-heading" className="flex flex-col gap-4">
          <h2 id="resolve-heading" className="font-heading text-xl font-semibold">
            Resolve errors, duplicates, and conflicts
          </h2>
          <p className="text-sm text-muted-foreground">
            Illustrative choices. Rows with errors can only be skipped here; in the real product they
            might be fixable in place. How duplicates and conflicts are matched and resolved is not decided.
          </p>
          {resolveError ? (
            <p role="alert" className="text-sm text-destructive">
              {resolveError}
            </p>
          ) : null}
          <ul className="flex flex-col gap-3">
            {needsDecision.map((r) => {
              const c = classes.get(r.line)!;
              return (
                <li key={r.line}>
                  <fieldset className="flex flex-col gap-2 rounded-xl border p-4">
                    <legend className="flex flex-wrap items-center gap-2 px-1 text-sm font-semibold">
                      Line {r.line}: {r.eventTitle || "Untitled"}
                      <Badge variant={c.kind === "invalid" ? "destructive" : "outline"}>
                        {c.kind === "invalid" ? "Error" : c.kind === "conflict" ? "Conflict" : "Duplicate"}
                      </Badge>
                    </legend>
                    <p className="text-sm text-muted-foreground">{describe(c)}</p>
                    {resolutionOptions(c).map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={`resolve-${r.line}`}
                          checked={choices[r.line] === opt}
                          onChange={() => {
                            setChoices({ ...choices, [r.line]: opt });
                            setResolveError(null);
                          }}
                          className="size-4 accent-[var(--primary)]"
                        />
                        {CHOICE_LABEL[opt]}
                      </label>
                    ))}
                  </fieldset>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button onClick={toResult}>Finish import (mock)</Button>
            <Button variant="outline" onClick={() => setStep("preview")}>
              Back to preview
            </Button>
          </div>
        </section>
      ) : null}

      {step === "result" ? (
        <section aria-labelledby="result-heading" className="flex flex-col gap-4 rounded-xl border border-primary/40 p-4">
          <h2 id="result-heading" className="font-heading text-xl font-semibold">
            Mock import complete: nothing was persisted
          </h2>
          <p role="status" className="text-sm">
            No organizations or events were created, updated, or removed, and no import batch was
            recorded. This is what the import <em>would</em> have done based on your choices:
          </p>
          <ul className="grid grid-cols-3 gap-2" aria-label="Would-be outcome">
            <li className="rounded-xl border bg-card p-3">
              <p className="text-2xl font-semibold">{outcome.wouldCreate}</p>
              <p className="text-sm text-muted-foreground">would be created</p>
            </li>
            <li className="rounded-xl border bg-card p-3">
              <p className="text-2xl font-semibold">{outcome.wouldUpdate}</p>
              <p className="text-sm text-muted-foreground">would be updated</p>
            </li>
            <li className="rounded-xl border bg-card p-3">
              <p className="text-2xl font-semibold">{outcome.wouldSkip}</p>
              <p className="text-sm text-muted-foreground">would be skipped</p>
            </li>
          </ul>
          <Button variant="outline" className="w-fit" onClick={reset}>
            Start over
          </Button>
        </section>
      ) : null}
    </div>
  );
}
