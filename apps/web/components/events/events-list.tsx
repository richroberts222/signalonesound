"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EVENT_FILTERS, createApiClient, createEventClient, type EventView } from "@signalone/validation";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";

type Filter = (typeof EVENT_FILTERS)[number];
const FILTER_LABELS: Record<Filter, string> = { upcoming: "Upcoming", past: "Past", drafts: "Drafts" };
const STATUS_LABELS: Record<string, string> = { draft: "Draft", published: "Published", cancelled: "Cancelled", deleted: "Deleted" };

const when = (e: EventView) =>
  new Intl.DateTimeFormat("en-US", { timeZone: e.timeZone, weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(
    new Date(e.startsAt),
  );

// A manager's events for one Church/Ministry (S3): upcoming, past or drafts, with edit, publish,
// cancel and delete. Every action goes through the API, which decides who may do what; this list only
// shows the server's answer.
export function EventsList({ orgId, initialFilter }: { orgId: string; initialFilter: Filter }) {
  const client = useMemo(() => createEventClient(createApiClient({ baseUrl: "" })), []);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [items, setItems] = useState<EventView[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const load = useCallback(
    async (cursor?: string) => {
      const result = await client.list(orgId, { filter, ...(cursor ? { cursor } : {}) });
      if (result.ok) {
        setItems((current) => (cursor ? [...current, ...result.data.items] : result.data.items));
        setNext(result.data.nextCursor);
        setError(null);
      } else {
        setError(result.error.code === "not_found" ? "You do not manage this church or ministry." : result.error.message);
      }
      setLoading(false);
    },
    [client, orgId, filter],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load from the API when the filter changes
    setLoading(true);
    void load();
  }, [load]);

  async function act(run: () => Promise<{ ok: boolean; error?: { message: string } }>, message: string) {
    setError(null);
    setNotice(null);
    const result = await run();
    if (result.ok) {
      setNotice(message);
      setConfirmingDelete(null);
      await load();
    } else {
      setError(result.error?.message ?? "Something went wrong");
    }
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/manage/${orgId}/events/new`} className={buttonVariants()} data-testid="events-new-button">
          New event
        </Link>
        <NativeSelect aria-label="Show" className="w-40" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} data-testid="events-filter">
          {EVENT_FILTERS.map((f) => (
            <option key={f} value={f}>
              {FILTER_LABELS[f]}
            </option>
          ))}
        </NativeSelect>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive" data-testid="events-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-muted-foreground" data-testid="events-notice">
          {notice}
        </p>
      )}
      {loading && <p>Loading...</p>}
      {!loading && !error && items.length === 0 && <p data-testid="events-empty">No {FILTER_LABELS[filter].toLowerCase()} events.</p>}

      <ul className="flex flex-col gap-3" aria-label="Events">
        {items.map((e, i) => (
          <li key={e.id}>
            <Card>
              <CardContent className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{e.title}</h2>
                  <Badge data-testid={`event-status-${i}`}>{STATUS_LABELS[e.status] ?? e.status}</Badge>
                  {e.seriesId && <Badge variant="outline">Repeats</Badge>}
                  {!e.hasLocation && <Badge variant="outline">Location not found yet</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {when(e)} &middot; {e.venueName}, {e.city}, {e.state}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/manage/events/${e.id}`} className={buttonVariants({ variant: "outline", size: "sm" })} data-testid={`event-edit-${i}`}>
                    Edit
                  </Link>
                  {e.status === "draft" && (
                    <Button size="sm" onClick={() => void act(() => client.publish(e.id), "Published.")} data-testid={`event-publish-${i}`}>
                      Publish
                    </Button>
                  )}
                  {e.status === "published" && (
                    <Button size="sm" variant="outline" onClick={() => void act(() => client.cancel(e.id), "Cancelled.")} data-testid={`event-cancel-${i}`}>
                      Cancel event
                    </Button>
                  )}
                  {confirmingDelete === e.id ? (
                    <>
                      <Button size="sm" variant="destructive" onClick={() => void act(() => client.remove(e.id), "Deleted.")} data-testid={`event-delete-confirm-${i}`}>
                        Yes, delete
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setConfirmingDelete(null)} data-testid={`event-delete-cancel-${i}`}>
                        Keep
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setConfirmingDelete(e.id)} data-testid={`event-delete-${i}`}>
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      {next && (
        <Button variant="outline" className="w-fit" onClick={() => void load(next)} data-testid="events-load-more">
          Load more
        </Button>
      )}
    </div>
  );
}
