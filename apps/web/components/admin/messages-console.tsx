"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CONTACT_TOPICS, createApiClient, createContactClient, type ContactMessage } from "@signalone/validation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const topicLabel = (value: string) => CONTACT_TOPICS.find((t) => t.value === value)?.label ?? value;

// The platform admin's Messages inbox (S15): what people sent through the contact form, newest first. A
// message is shown as plain text. Mark it done when handled; delete it when it is no longer needed (this is how
// the personal information in it is removed). Anyone who is not an admin gets "not found" from the API.
export function MessagesConsole() {
  const client = useMemo(() => createContactClient(createApiClient({ baseUrl: "" })).admin, []);
  const [items, setItems] = useState<ContactMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await client.list("all");
    if (result.ok) setItems(result.data.items);
    else setError(result.error.code === "not_found" ? "This page is only for platform admins." : result.error.message);
  }, [client]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from the API
    void load();
  }, [load]);

  async function act(run: () => Promise<{ ok: boolean; error?: { message: string } }>, message: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await run();
    if (result.ok) {
      setNotice(message);
      await load();
    } else {
      setError(result.error?.message ?? "Something went wrong");
    }
    setBusy(false);
  }

  return (
    <div className="flex w-full max-w-4xl flex-col gap-4">
      {error && (
        <p role="alert" className="text-sm text-destructive" data-testid="messages-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-muted-foreground" data-testid="messages-notice">
          {notice}
        </p>
      )}
      {items?.length === 0 && <p data-testid="messages-empty">No messages yet.</p>}
      <ul className="flex flex-col gap-3" data-testid="messages-list">
        {items?.map((m, i) => (
          <li key={m.id}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {m.name} <span className="text-sm font-normal text-muted-foreground">&middot; {m.status === "done" ? "Done" : "New"}</span>
                </CardTitle>
                <CardDescription>
                  {topicLabel(m.topic)} &middot; {new Date(m.createdAt).toLocaleString()}
                  {m.replyEmail ? ` · reply to ${m.replyEmail}` : " · no reply address"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="whitespace-pre-line text-sm">{m.message}</p>
                <div className="flex flex-wrap gap-2">
                  {m.status === "new" ? (
                    <Button size="sm" disabled={busy} onClick={() => void act(() => client.setStatus(m.id, { status: "done" }), "Marked done.")} data-testid={`message-done-${i}`}>
                      Mark done
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void act(() => client.setStatus(m.id, { status: "new" }), "Marked new again.")} data-testid={`message-reopen-${i}`}>
                      Mark new
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" disabled={busy} onClick={() => void act(() => client.remove(m.id), "Message deleted.")} data-testid={`message-delete-${i}`}>
                    Delete
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
