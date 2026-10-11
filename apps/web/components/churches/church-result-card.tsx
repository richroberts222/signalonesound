import Link from "next/link";
import { WEEKDAYS, churchPlace, formatServiceTime, type ChurchResult } from "@signalone/validation";

import { Card, CardContent } from "@/components/ui/card";

/** "Sun 10:00 AM, Wed 7:00 PM": the next services in one line, in the church's own time zone. */
export function servicesLine(services: ChurchResult["nextServices"]): string {
  return services.map((s) => `${WEEKDAYS[s.weekday]?.slice(0, 3) ?? ""} ${formatServiceTime(s.startTime)}`).join(", ");
}

// One church in the Find a Church list (S18): its name, where it is, how far, and when it meets next. The whole card is one link.
export function ChurchResultCard({ church, index }: { church: ChurchResult; index: number }) {
  const place = churchPlace(church.city, church.state, church.country);
  return (
    <Card className="transition-colors hover:border-primary">
      <CardContent>
        <Link href={`/churches/${church.id}`} className="flex flex-col gap-1 outline-none focus-visible:underline" data-testid={`church-result-${index}`}>
          <span className="font-heading text-lg font-bold">{church.name}</span>
          <span className="text-sm text-muted-foreground">
            {place}
            {church.distanceMiles !== null && <> &middot; {church.distanceMiles < 0.1 ? "Under 0.1" : church.distanceMiles.toFixed(1)} miles away</>}
          </span>
          {church.nextServices.length > 0 ? (
            <span className="text-sm" data-testid={`church-result-services-${index}`}>
              <span className="text-muted-foreground">Next: </span>
              {servicesLine(church.nextServices)}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground" data-testid={`church-result-services-${index}`}>
              Service times not added yet
            </span>
          )}
        </Link>
      </CardContent>
    </Card>
  );
}
