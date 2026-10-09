"use client";

import { useEffect, useMemo, useState } from "react";
import { createApiClient, createOrganizationClient, type AdminRequests } from "@signalone/validation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// The platform admin's queue of claims waiting for a decision (S2). Every decision needs a reason and
// is recorded in the audit log by the server. A person who is not an admin sees nothing: the API
// answers "not found" to everyone else.
export function ManagerRequestsQueue() {
  const client = useMemo(() => createOrganizationClient(createApiClient({ baseUrl: "" })), []);
  const [data, setData] = useState<AdminRequests | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const result = await client.adminRequests();
    if (result.ok) setData(result.data);
    else setError(result.error.code === "not_found" ? "This page is only for platform admins." : result.error.message);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from the API
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function decide(id: string, decision: "approve" | "reject") {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await client.adminDecide(id, { decision, reason: reasons[id] ?? "" });
    if (result.ok) {
      setNotice(decision === "approve" ? "Approved." : "Rejected.");
      await load();
    } else {
      setError(result.error.fieldErrors?.reason?.[0] ?? result.error.message);
    }
    setBusy(false);
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      {error && (
        <p role="alert" className="text-sm text-destructive" data-testid="admin-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-muted-foreground" data-testid="admin-notice">
          {notice}
        </p>
      )}
      {data?.items.length === 0 && <p data-testid="admin-queue-empty">No requests are waiting.</p>}
      <ul className="flex flex-col gap-4" aria-label="Requests waiting for a decision">
        {data?.items.map((item, index) => (
          <li key={item.id}>
            <Card>
              <CardHeader>
                <CardTitle>{item.organization.name}</CardTitle>
                <CardDescription>
                  Requested {new Date(item.requestedAt).toLocaleString()} by {item.requesterId}. Contact: {item.contactEmail ?? "none"}.
                  {item.organization.otherPendingClaims > 0 && ` ${item.organization.otherPendingClaims} other claim(s) on this organization are also waiting.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm">{item.organization.description}</p>
                <ul className="text-sm">
                  {item.organization.links.map((link) => (
                    <li key={link}>
                      <a href={link} target="_blank" rel="noopener noreferrer" className="underline" data-testid={`admin-link-${index}`}>
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
                <Input
                  aria-label={`Reason for the decision on ${item.organization.name}`}
                  value={reasons[item.id] ?? ""}
                  onChange={(e) => setReasons({ ...reasons, [item.id]: e.target.value })}
                  placeholder="Reason (required)"
                  data-testid="admin-reason-input"
                />
                <div className="flex gap-2">
                  <Button onClick={() => void decide(item.id, "approve")} disabled={busy} data-testid={`admin-approve-${index}`}>
                    Approve
                  </Button>
                  <Button variant="outline" onClick={() => void decide(item.id, "reject")} disabled={busy} data-testid={`admin-reject-${index}`}>
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
