"use client";

import { useMemo, useState } from "react";
import { createApiClient, createModerationClient, type AuditLog } from "@signalone/validation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// The audit log for platform admins (S8): who did what to whom, when and why, filtered by actor,
// subject and date. Nothing here can change or delete an entry. Exporting is recorded in the log.
export function AuditViewer() {
  const client = useMemo(() => createModerationClient(createApiClient({ baseUrl: "" })), []);
  const [actor, setActor] = useState("");
  const [subject, setSubject] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [log, setLog] = useState<AuditLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const query = { actor: actor.trim(), subject: subject.trim(), from, to };

  async function search(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await client.searchAudit(query);
    if (result.ok) setLog(result.data);
    else setError(result.error.code === "not_found" ? "This page is only for platform admins." : result.error.message);
    setBusy(false);
  }

  async function exportLog() {
    setBusy(true);
    setError(null);
    const result = await client.exportAudit(query);
    if (result.ok) {
      const url = URL.createObjectURL(new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "audit-log.json";
      link.click();
      URL.revokeObjectURL(url);
    } else {
      setError(result.error.message);
    }
    setBusy(false);
  }

  return (
    <div className="flex w-full max-w-5xl flex-col gap-4">
      <form onSubmit={search} className="grid gap-3 sm:grid-cols-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-actor">Who</Label>
          <Input id="audit-actor" value={actor} onChange={(e) => setActor(e.target.value)} data-testid="audit-filter-actor" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-subject">What it was done to</Label>
          <Input id="audit-subject" value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="audit-filter-subject" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-from">From</Label>
          <Input id="audit-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} data-testid="audit-filter-from" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audit-to">To</Label>
          <Input id="audit-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} data-testid="audit-filter-to" />
        </div>
        <div className="flex gap-2 sm:col-span-4">
          <Button type="submit" disabled={busy} data-testid="audit-search">
            Show
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void exportLog()} data-testid="audit-export">
            Export for a legal request
          </Button>
        </div>
      </form>
      {error && (
        <p role="alert" className="text-sm text-destructive" data-testid="audit-error">
          {error}
        </p>
      )}
      {log && log.items.length === 0 && <p data-testid="audit-empty">No entries match.</p>}
      {log && log.items.length > 0 && (
        <Table>
          <TableCaption>Audit log</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Why</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {log.items.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{new Date(e.at).toLocaleString()}</TableCell>
                <TableCell className="break-all">{e.actorId}</TableCell>
                <TableCell>{e.action}</TableCell>
                <TableCell className="break-all">{e.subject}</TableCell>
                <TableCell>{e.detail}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
