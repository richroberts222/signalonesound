import type { Metadata } from "next";
import { EventBrowser } from "@/components/admin/event-browser";
import { MOCK_ADMIN_EVENTS } from "@/lib/admin/mock-data";

export const metadata: Metadata = {
  title: "Events (admin mock) | Signal One Sound",
};

export default function AdminEventsPage() {
  return (
    <>
      <h1 className="font-heading text-3xl font-semibold tracking-tight">Events</h1>
      <EventBrowser events={MOCK_ADMIN_EVENTS} />
    </>
  );
}
