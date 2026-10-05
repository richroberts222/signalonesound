"use client";

import { useState } from "react";
import { Navigation, Share2 } from "lucide-react";
import { SaveButton } from "@/components/discover/save-button";
import { Button } from "@/components/ui/button";
import { directionsUrl } from "@/lib/discover/format";
import type { MockEvent } from "@/lib/discover/types";

/**
 * Share / Save / Directions for one Event.
 * - Share: real Web Share sheet when the device has one, else copies the link.
 * - Save: mock, remembered in this browser only.
 * - Directions: real Google Maps link for the (fictional) venue address.
 */
export function EventActions({ event }: { event: MockEvent }) {
  const [status, setStatus] = useState("");

  const share = async () => {
    const url = `${window.location.origin}/discover/${event.id}`;
    const data = { title: event.title, text: `${event.title}: join us on Signal One Sound.`, url };
    try {
      if (typeof navigator.share === "function") {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(url);
      setStatus("Link copied. Paste it anywhere to share this event.");
    } catch (error) {
      if ((error as Error).name === "AbortError") return; // user closed the share sheet
      setStatus(`Copy this link to share: ${url}`);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="lg"
          nativeButton={false}
          render={<a href={directionsUrl(event.venue)} target="_blank" rel="noopener noreferrer" />}
        >
          <Navigation /> Directions
        </Button>
        <Button type="button" size="lg" variant="outline" onClick={share}>
          <Share2 /> Share
        </Button>
        <SaveButton
          eventId={event.id}
          eventTitle={event.title}
          showLabel
          onToggled={(saved) =>
            setStatus(saved ? "Saved (mock: kept in this browser only)." : "Removed from saved.")
          }
        />
      </div>
      <p role="status" className="min-h-5 text-sm text-muted-foreground">
        {status}
      </p>
    </div>
  );
}
