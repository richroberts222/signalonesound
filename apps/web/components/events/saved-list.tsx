"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createApiClient, createSavedClient, type SavedItem } from "@signalone/validation";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { EventCard } from "./event-card";

const STATE_LABEL: Partial<Record<SavedItem["state"], string>> = { past: "Over", cancelled: "Cancelled" };

// The member's own saved events (S6): upcoming first, then past ones. An event that was deleted or
// held after it was saved is shown only as removed, with no detail. Nobody else can see this list.
export function SavedList() {
  const client = useMemo(() => createSavedClient(createApiClient({ baseUrl: "" })), []);
  const [items, setItems] = useState<SavedItem[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (cursor?: string) => {
      const result = await client.list(cursor ? { cursor } : {});
      if (result.ok) {
        setItems((current) => (cursor ? [...current, ...result.data.items] : result.data.items));
        setNext(result.data.nextCursor);
        setError(null);
      } else {
        setError(result.error.message);
      }
      setLoading(false);
    },
    [client],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from the API
    void load();
  }, [load]);

  async function remove(eventId: string) {
    const result = await client.unsave(eventId);
    if (result.ok) setItems((current) => current.filter((i) => i.eventId !== eventId));
    else setError(result.error.message);
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      {error && (
        <p role="alert" className="text-sm text-destructive" data-testid="saved-error">
          {error}
        </p>
      )}
      {loading && <p>Loading...</p>}
      {!loading && !error && items.length === 0 && (
        <p data-testid="saved-empty">
          You have not saved any events yet.{" "}
          <Link href="/events" className="underline" data-testid="saved-find-events">
            Find events
          </Link>
        </p>
      )}
      <ul className="flex flex-col gap-3" aria-label="Saved events">
        {items.map((item, i) => (
          <li key={item.eventId} className="flex flex-col gap-2">
            {item.event ? (
              <>
                <EventCard event={item.event} index={i} />
                {STATE_LABEL[item.state] && <Badge variant="outline" className="w-fit">{STATE_LABEL[item.state]}</Badge>}
              </>
            ) : (
              <Card>
                <CardContent className="text-sm text-muted-foreground" data-testid={`saved-removed-${i}`}>
                  This event is no longer available.
                </CardContent>
              </Card>
            )}
            <Button variant="outline" size="sm" className="w-fit" onClick={() => void remove(item.eventId)} data-testid={`saved-remove-${i}`}>
              Remove from my list
            </Button>
          </li>
        ))}
      </ul>
      {next && (
        <Button variant="outline" className="w-fit" onClick={() => void load(next)} data-testid="saved-load-more">
          Load more
        </Button>
      )}
      <Link href="/events" className={buttonVariants({ variant: "outline", className: "w-fit" })} data-testid="saved-discover-link">
        Find more events
      </Link>
    </div>
  );
}
