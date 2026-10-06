"use client";

import Link from "next/link";
import { useState } from "react";
import { MapPin, Users } from "lucide-react";
import { OrgStatusBadge } from "@/components/admin/badges";
import { EmptyState } from "@/components/admin/empty-state";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { matchesQuery } from "@/lib/admin/moderation";
import type { MockOrg } from "@/lib/admin/types";

/** Searchable list of fictional Church/Ministry records. */
export function OrgBrowser({ orgs }: { orgs: MockOrg[] }) {
  const [query, setQuery] = useState("");
  const shown = orgs.filter((o) => matchesQuery(query, [o.name, o.city, o.kind, o.status]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="org-search" className="text-sm font-medium">
          Search organizations
        </label>
        <Input
          id="org-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, city, church or ministry, status"
        />
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Showing {shown.length} of {orgs.length}
        </p>
      </div>

      {shown.length === 0 ? (
        <EmptyState title="No organizations match your search">
          Try a different name or city. In the real product this is also where &quot;add an
          organization&quot; would be offered.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/organizations/${o.id}`}
                className="flex h-full flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground shadow-xs transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="flex flex-wrap items-start justify-between gap-2">
                  <span className="font-heading text-lg leading-snug font-semibold">{o.name}</span>
                  <OrgStatusBadge status={o.status} />
                </span>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin aria-hidden className="size-4 text-primary" /> {o.city}, {o.state}
                </span>
                <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{o.kind}</Badge>
                  <span className="flex items-center gap-1">
                    <Users aria-hidden className="size-4" />
                    {o.managers.length === 0 ? "No managers" : `${o.managers.length} manager${o.managers.length === 1 ? "" : "s"}`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
