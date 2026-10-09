"use client";

import { useMemo, useState } from "react";
import { REPORT_REASONS, createApiClient, createModerationClient } from "@signalone/validation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

// Report an event or a church (S8). Anyone can, signed in or not. A report never records who sent it:
// no account, no name, and the network address is kept only as a hash for a day to stop floods.
export function ReportButton({ subjectType, subjectId }: { subjectType: "event" | "organization"; subjectId: string }) {
  const client = useMemo(() => createModerationClient(createApiClient({ baseUrl: "" })), []);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await client.report({ subjectType, subjectId, reason, ...(details.trim() ? { details } : {}) });
    if (result.ok) setDone(true);
    else setError(result.error.fieldErrors?.reason?.[0] ?? result.error.message);
    setBusy(false);
  }

  if (done) {
    return (
      <p role="status" className="text-sm text-muted-foreground" data-testid="report-thanks">
        Thank you. An admin will look at your report.
      </p>
    );
  }
  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="w-fit text-muted-foreground" onClick={() => setOpen(true)} data-testid="report-button">
        Report this {subjectType === "event" ? "event" : "church"}
      </Button>
    );
  }
  return (
    <form onSubmit={send} className="flex max-w-md flex-col gap-3 rounded-xl border border-border p-4" noValidate aria-label="Report">
      <p className="text-sm text-muted-foreground">Please do not include personal information about yourself or anyone else. Your report is anonymous.</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-reason">What is wrong?</Label>
        <NativeSelect id="report-reason" value={reason} onChange={(e) => setReason(e.target.value)} data-testid="report-reason-select">
          <option value="">Choose</option>
          {REPORT_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="report-details">Details (optional)</Label>
        <Input id="report-details" value={details} onChange={(e) => setDetails(e.target.value)} data-testid="report-details-input" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy || reason === ""} data-testid="report-submit">
          Send report
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="report-cancel">
          Cancel
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive" data-testid="report-error">
          {error}
        </p>
      )}
    </form>
  );
}
