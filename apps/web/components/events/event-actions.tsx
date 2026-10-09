"use client";

import { useState } from "react";
import type { PublicEvent } from "@signalone/validation";

import { buildIcs } from "@/lib/ics";
import { Button, buttonVariants } from "@/components/ui/button";

// Share, add to calendar, and directions for one event (S4). Sharing uses the phone's own share sheet
// when there is one, otherwise it copies the link. The calendar file is built on the device. The
// directions link sends only the venue's address to the map app, never the visitor's position.
export function EventActions({ event }: { event: PublicEvent }) {
  const [notice, setNotice] = useState<string | null>(null);
  const address = `${event.venueName}, ${event.street}, ${event.city}, ${event.state} ${event.zip}`;

  async function share() {
    const url = window.location.href;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: event.title, text: `${event.title} - ${event.organization.name}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNotice("Link copied.");
    } catch {
      setNotice("Sharing was cancelled.");
    }
  }

  function addToCalendar() {
    const file = buildIcs({ ...event, cancelled: event.status === "cancelled" });
    const url = URL.createObjectURL(new Blob([file], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "event.ics";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void share()} data-testid="event-share">
          Share
        </Button>
        <Button variant="outline" onClick={addToCalendar} data-testid="event-calendar">
          Add to calendar
        </Button>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline" })}
          data-testid="event-directions"
        >
          Directions
        </a>
      </div>
      {notice && (
        <p role="status" className="text-sm text-muted-foreground" data-testid="event-share-notice">
          {notice}
        </p>
      )}
    </div>
  );
}
