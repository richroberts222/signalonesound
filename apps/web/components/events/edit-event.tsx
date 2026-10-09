"use client";

import { useEffect, useMemo, useState } from "react";
import { createApiClient, createEventClient, type EventView } from "@signalone/validation";

import { EventEditor } from "./event-editor";

// Loads one event for its managers, then shows the editor. Anyone who does not manage it is told
// "not found" by the API, so the page reveals nothing about events they cannot manage.
export function EditEvent({ id }: { id: string }) {
  const client = useMemo(() => createEventClient(createApiClient({ baseUrl: "" })), []);
  const [event, setEvent] = useState<EventView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void client.get(id).then((result) => {
      if (!active) return;
      if (result.ok) setEvent(result.data);
      else setError(result.error.code === "not_found" ? "This event was not found." : result.error.message);
    });
    return () => {
      active = false;
    };
  }, [client, id]);

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive" data-testid="edit-event-error">
        {error}
      </p>
    );
  }
  if (!event) return <p>Loading...</p>;
  return <EventEditor orgId={event.organizationId} event={event} />;
}
