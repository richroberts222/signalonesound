import { FlaskConical } from "lucide-react";

/** Makes the mock status visible on every Church/Ministry screen. */
export function ChurchMockNotice() {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-muted-foreground">
      <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        Interactive mock for review. The church, events, and links are fictional. Nothing you do
        here is saved or sent to a server, and the event list never changes.
      </span>
    </p>
  );
}
