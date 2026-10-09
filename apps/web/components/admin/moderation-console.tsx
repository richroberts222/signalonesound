"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createApiClient, createModerationClient, type Overview, type ReportList } from "@signalone/validation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

type Outcome = { ok: boolean; error?: { message: string; fieldErrors?: Record<string, string[]> } };

// The platform admin's moderation console (S8): what needs attention, the report queue, and actions on
// an event, a church or a member. Every action needs a reason and is written to the audit log by the
// server. Anyone who is not an admin gets "not found" from the API and sees nothing here.
export function ModerationConsole() {
  const client = useMemo(() => createModerationClient(createApiClient({ baseUrl: "" })), []);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [reports, setReports] = useState<ReportList | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [targetId, setTargetId] = useState("");
  const [targetReason, setTargetReason] = useState("");
  const [eventsAction, setEventsAction] = useState<"keep" | "hide">("keep");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [o, r] = await Promise.all([client.overview(), client.reports("open")]);
    if (o.ok) setOverview(o.data);
    else return setError(o.error.code === "not_found" ? "This page is only for platform admins." : o.error.message);
    if (r.ok) setReports(r.data);
  }, [client]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from the API
    void load();
  }, [load]);

  async function act(run: () => Promise<Outcome>, message: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await run();
    if (result.ok) {
      setNotice(message);
      await load();
    } else {
      setError(result.error?.fieldErrors?.reason?.[0] ?? result.error?.message ?? "Something went wrong");
    }
    setBusy(false);
  }

  const reasonOf = (key: string) => reasons[key] ?? "";
  const target = targetId.trim();
  const reasonBody = { reason: targetReason };

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      {error && (
        <p role="alert" className="text-sm text-destructive" data-testid="moderation-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-muted-foreground" data-testid="moderation-notice">
          {notice}
        </p>
      )}

      {overview && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5" aria-label="What needs attention">
          {(
            [
              ["openReports", "Open reports"],
              ["pendingClaims", "Pending claims"],
              ["hiddenEvents", "Hidden events"],
              ["unpublishedOrganizations", "Unpublished churches"],
              ["suspendedMembers", "Suspended members"],
            ] as const
          ).map(([key, label]) => (
            <li key={key}>
              <Card size="sm">
                <CardContent>
                  <p className="text-2xl font-bold" data-testid={`admin-card-${key}`}>
                    {overview[key]}
                  </p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="reports-heading" className="flex flex-col gap-3">
        <h2 id="reports-heading" className="font-heading text-xl font-bold">
          Open reports
        </h2>
        {reports?.items.length === 0 && <p data-testid="reports-empty">No open reports.</p>}
        <ul className="flex flex-col gap-3">
          {reports?.items.map((r, i) => (
            <li key={r.id}>
              <Card>
                <CardHeader>
                  <CardTitle>{r.subjectTitle}</CardTitle>
                  <CardDescription>
                    {r.subjectType === "event" ? "Event" : "Church or ministry"} {r.subjectId} &middot; {r.reason} &middot; {new Date(r.createdAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {r.details && <p className="whitespace-pre-line text-sm">{r.details}</p>}
                  <Input
                    aria-label={`Reason for the decision on the report about ${r.subjectTitle}`}
                    value={reasonOf(r.id)}
                    onChange={(e) => setReasons({ ...reasons, [r.id]: e.target.value })}
                    placeholder="Reason (required)"
                    data-testid="admin-reason-input"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" disabled={busy} onClick={() => void act(() => client.decideReport(r.id, { decision: "dismiss", reason: reasonOf(r.id) }), "Report dismissed.")} data-testid={`report-dismiss-${i}`}>
                      Dismiss
                    </Button>
                    <Button size="sm" disabled={busy} onClick={() => void act(() => client.decideReport(r.id, { decision: "action", reason: reasonOf(r.id) }), "Report marked as acted on.")} data-testid={`report-action-${i}`}>
                      Mark as acted on
                    </Button>
                    <Button variant="destructive" size="sm" disabled={busy} onClick={() => void act(() => (r.subjectType === "event" ? client.hideEvent(r.subjectId, { reason: reasonOf(r.id) }) : client.unpublishOrganization(r.subjectId, { reason: reasonOf(r.id) })), "Hidden from the public.")} data-testid={`report-hide-${i}`}>
                      {r.subjectType === "event" ? "Hide the event" : "Unpublish the church"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Act on an event, a church or a member</CardTitle>
          <CardDescription>Paste the id (an event or church id, or a member id that starts with user_). A reason is required and is recorded.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-target">Id</Label>
            <Input id="admin-target" value={targetId} onChange={(e) => setTargetId(e.target.value)} autoComplete="off" data-testid="admin-target-input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admin-target-reason">Reason</Label>
            <Input id="admin-target-reason" value={targetReason} onChange={(e) => setTargetReason(e.target.value)} data-testid="admin-target-reason" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={busy || !target} onClick={() => void act(() => client.hideEvent(target, reasonBody), "Event hidden.")} data-testid="admin-hide-event">Hide event</Button>
            <Button variant="outline" size="sm" disabled={busy || !target} onClick={() => void act(() => client.restoreEvent(target, reasonBody), "Event restored.")} data-testid="admin-restore-event">Restore event</Button>
            <Button variant="outline" size="sm" disabled={busy || !target} onClick={() => void act(() => client.unpublishOrganization(target, reasonBody), "Church unpublished.")} data-testid="admin-unpublish-org">Unpublish church</Button>
            <Button variant="outline" size="sm" disabled={busy || !target} onClick={() => void act(() => client.restoreOrganization(target, reasonBody), "Church restored.")} data-testid="admin-restore-org">Restore church</Button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-events-action">When suspending, the events of their churches</Label>
              <NativeSelect id="admin-events-action" value={eventsAction} onChange={(e) => setEventsAction(e.target.value as "keep" | "hide")} data-testid="admin-events-action">
                <option value="keep">Stay public</option>
                <option value="hide">Are hidden</option>
              </NativeSelect>
            </div>
            <Button variant="destructive" size="sm" disabled={busy || !target} onClick={() => void act(() => client.suspendMember(target, { reason: targetReason, eventsAction }), "Member suspended.")} data-testid="admin-suspend-member">Suspend member</Button>
            <Button variant="outline" size="sm" disabled={busy || !target} onClick={() => void act(() => client.reinstateMember(target, reasonBody), "Member reinstated.")} data-testid="admin-reinstate-member">Reinstate member</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
