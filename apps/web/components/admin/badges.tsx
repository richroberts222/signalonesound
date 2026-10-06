import { Badge } from "@/components/ui/badge";
import { EVENT_STATUS_LABEL, ORG_STATUS_LABEL, SOURCE_LABEL } from "@/lib/admin/labels";
import type { EventSource, EventStatus, OrgStatus } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

const SOURCE_TONE: Record<EventSource, string> = {
  church: "border-primary/40 text-primary",
  community: "border-amber-500/40 text-amber-400",
  admin: "border-orange-500/40 text-orange-400",
  import: "border-border text-muted-foreground",
};

/** Provenance badge; the one place event source is rendered. */
export function SourceBadge({ source }: { source: EventSource }) {
  return (
    <Badge variant="outline" className={cn(SOURCE_TONE[source])}>
      {SOURCE_LABEL[source]}
    </Badge>
  );
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <Badge variant={status === "published" ? "default" : status === "hidden" ? "secondary" : "outline"}>
      {EVENT_STATUS_LABEL[status]}
    </Badge>
  );
}

export function OrgStatusBadge({ status }: { status: OrgStatus }) {
  return (
    <Badge variant={status === "active" ? "default" : status === "paused" ? "secondary" : "outline"}>
      {ORG_STATUS_LABEL[status]}
    </Badge>
  );
}
