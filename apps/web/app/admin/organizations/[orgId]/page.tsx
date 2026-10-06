import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EventStatusBadge, OrgStatusBadge, SourceBadge } from "@/components/admin/badges";
import { ConfirmMockAction } from "@/components/admin/confirm-mock-action";
import { MockEditForm } from "@/components/admin/mock-edit-form";
import { MOCK_ADMIN_EVENTS, MOCK_ORGS } from "@/lib/admin/mock-data";
import { formatDay } from "@/lib/discover/format";

export const metadata: Metadata = {
  title: "Organization (admin mock) | Signal One Sound",
};

export default async function AdminOrganizationPage({
  params,
}: PageProps<"/admin/organizations/[orgId]">) {
  const { orgId } = await params;
  const org = MOCK_ORGS.find((o) => o.id === orgId);
  if (!org) notFound();
  const events = MOCK_ADMIN_EVENTS.filter((e) => e.orgId === org.id);

  return (
    <>
      <Link
        href="/admin/organizations"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" /> Back to organizations
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight">{org.name}</h1>
          <OrgStatusBadge status={org.status} />
        </div>
        <p className="text-muted-foreground">{org.kind}</p>
      </header>

      <section aria-labelledby="details-heading" className="flex flex-col gap-3 rounded-xl border p-4">
        <h2 id="details-heading" className="font-heading text-lg font-semibold">
          Details
        </h2>
        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted-foreground">Address</dt>
          <dd>
            {org.street}, {org.city}, {org.state} {org.zip}
          </dd>
          <dt className="text-muted-foreground">Contact</dt>
          <dd>
            {org.contactEmail} · {org.phone}
          </dd>
          <dt className="text-muted-foreground">Website</dt>
          <dd className="break-all">{org.website}</dd>
          <dt className="text-muted-foreground">Record origin</dt>
          <dd>{org.origin}</dd>
          <dt className="text-muted-foreground">Last updated</dt>
          <dd>{formatDay(org.lastUpdated)}</dd>
        </dl>
        <MockEditForm
          idPrefix="org"
          subject="Organization"
          fields={[
            { name: "name", label: "Name", value: org.name, required: true },
            { name: "street", label: "Street", value: org.street },
            { name: "city", label: "City", value: org.city, required: true },
            { name: "phone", label: "Phone", value: org.phone },
            { name: "email", label: "Contact email", value: org.contactEmail },
            { name: "website", label: "Website", value: org.website },
          ]}
        />
      </section>

      <section aria-labelledby="managers-heading" className="flex flex-col gap-2 rounded-xl border p-4">
        <h2 id="managers-heading" className="font-heading text-lg font-semibold">
          Managers
        </h2>
        <p className="text-sm text-muted-foreground">
          Who may manage this organization&apos;s data. Illustrative only: the ownership and
          permission model, invitations, and how managers are verified are not decided.
        </p>
        {org.managers.length === 0 ? (
          <p className="text-sm">No managers yet. Staff would be the only editors of this record.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {org.managers.map((m) => (
              <li key={m.name}>
                <span className="font-medium">{m.name}</span>{" "}
                <span className="text-muted-foreground">· {m.relationship}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="events-heading" className="flex flex-col gap-2 rounded-xl border p-4">
        <h2 id="events-heading" className="font-heading text-lg font-semibold">
          Events ({events.length})
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events are linked to this organization.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Link href={`/admin/events/${e.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                  {e.title}
                </Link>
                <span className="text-muted-foreground">{formatDay(e.date)}</span>
                <EventStatusBadge status={e.status} />
                <SourceBadge source={e.source} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="pause-heading" className="flex flex-col gap-3 rounded-xl border border-destructive/30 p-4">
        <h2 id="pause-heading" className="font-heading text-lg font-semibold">
          Pause organization
        </h2>
        <p className="text-sm text-muted-foreground">
          Would hide this organization and its events from Discover until reinstated.
        </p>
        <ConfirmMockAction
          label="Pause organization"
          prompt={`Pause ${org.name}?`}
          doneMessage="Mock only: nothing was paused. This organization's status and events are unchanged."
        />
      </section>
    </>
  );
}
