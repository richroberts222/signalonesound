import { Badge } from "@/components/ui/badge";
import { revivalTypeLabel, type RevivalTypeId } from "@/lib/discover/revival-types";

/** The one visual representation of a Revival Type tag on an Event. */
export function RevivalTypeBadge({ type }: { type: RevivalTypeId }) {
  return <Badge variant="secondary">{revivalTypeLabel(type)}</Badge>;
}
