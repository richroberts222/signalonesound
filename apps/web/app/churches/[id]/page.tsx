import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { churchPlace, directionsUrl, eventSearchQuerySchema, formatServiceWhen } from "@signalone/validation";

import { EventCard } from "@/components/events/event-card";
import { ReportButton } from "@/components/events/report-button";
import { getChurchesService, getDiscoverService } from "@/lib/composition";
import { ServiceError } from "@/lib/services/errors";

// A public church or ministry page: its description, links and upcoming events. Only an approved
// organization has one; anything else does not exist here. Rendered on the server.
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const load = cache(async (id: string) => {
  if (!UUID.test(id)) return null;
  try {
    return await getChurchesService().get(id);
  } catch (error) {
    if (error instanceof ServiceError && error.code === "not_found") return null;
    throw error;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const org = await load((await params).id);
  if (!org) return { title: "Church not found | Signal One Sound" };
  return { title: `${org.name} | Signal One Sound`, description: org.description || `Upcoming events from ${org.name}.` };
}

export default async function ChurchPage({ params }: { params: Promise<{ id: string }> }) {
  const org = await load((await params).id);
  if (!org) notFound();
  const upcoming = await getDiscoverService().searchEvents(eventSearchQuerySchema.parse({ organizationId: org.id, limit: 50 }));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">{org.name}</h1>
      {org.profile && (
        <p className="text-muted-foreground" data-testid="church-address">
          {[org.profile.street, churchPlace(org.profile.city, org.profile.state, org.profile.country) + (org.profile.country === "US" && org.profile.zip ? ` ${org.profile.zip}` : "")].filter(Boolean).join(", ")}
          {" "}
          <a href={directionsUrl(org.profile)} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline" data-testid="church-directions">
            Directions
          </a>
        </p>
      )}
      {org.description && <p className="whitespace-pre-line leading-relaxed">{org.description}</p>}
      <section aria-labelledby="church-services-heading" className="flex flex-col gap-2" data-testid="church-services">
        <h2 id="church-services-heading" className="font-heading text-xl font-bold">
          Regular services
        </h2>
        {org.services.length === 0 ? (
          <p className="text-muted-foreground" data-testid="church-no-services">
            This church has not added its service times yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {org.services.map((s, i) => (
              <li key={`${s.weekday}-${s.startTime}-${s.label}-${i}`} className="flex flex-col rounded-lg border p-3" data-testid={`church-service-${i}`}>
                <span className="font-medium">
                  {formatServiceWhen(s.weekday, s.startTime)} <span className="font-normal text-muted-foreground">&middot; {s.label}</span>
                </span>
                {s.note && <span className="text-sm text-muted-foreground">{s.note}</span>}
              </li>
            ))}
          </ul>
        )}
        {org.profile && org.services.length > 0 && <p className="text-xs text-muted-foreground">Times are in the church&apos;s own time zone.</p>}
      </section>
      <ul className="flex flex-col gap-1">
        {org.links.map((link, i) => (
          <li key={link}>
            <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline" data-testid={`church-link-${i}`}>
              {link}
            </a>
          </li>
        ))}
      </ul>
      <h2 className="font-heading text-xl font-bold">Upcoming events</h2>
      {upcoming.items.length === 0 ? (
        <p data-testid="church-no-events">No upcoming events.</p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Upcoming events">
          {upcoming.items.map((e, i) => (
            <li key={e.id}>
              <EventCard event={e} index={i} />
            </li>
          ))}
        </ul>
      )}
      <ReportButton subjectType="organization" subjectId={org.id} />
    </main>
  );
}
