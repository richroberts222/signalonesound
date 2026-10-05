import { FlaskConical } from "lucide-react";
import { formatDay } from "@/lib/discover/format";
import { MOCK_TODAY } from "@/lib/discover/mock-data";

/** Makes the mock status visible on every Discover screen. */
export function MockBanner() {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-highlight/60 bg-highlight/20 px-3 py-2 text-sm text-foreground">
      <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        Interactive mock for review. All churches, speakers, and events are fictional, and nothing is
        saved to a server. Mock “today” is {formatDay(MOCK_TODAY)}, 2026.
      </span>
    </p>
  );
}
