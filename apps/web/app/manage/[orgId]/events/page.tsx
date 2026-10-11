import type { Metadata } from "next";
import Link from "next/link";

import { ChurchProfileCard } from "@/components/churches/church-profile-card";
import { EventsList } from "@/components/events/events-list";

export const metadata: Metadata = { title: "Events | Signal One Sound" };

// Protected by proxy.ts for sign-in; the API decides whether the person manages this organization.
export default async function ManageEventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { orgId } = await params;
  const { filter } = await searchParams;
  const initial = filter === "past" || filter === "drafts" ? filter : "upcoming";
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:p-8">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">Events</h1>
      <ChurchProfileCard orgId={orgId} />
      <Link href={`/manage/${orgId}/profile`} className="w-fit text-sm text-primary underline-offset-4 hover:underline" data-testid="manage-profile-link">
        Edit church profile and service times
      </Link>
      <EventsList orgId={orgId} initialFilter={initial} />
    </main>
  );
}
