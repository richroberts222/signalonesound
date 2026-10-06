import { Badge } from "@/components/ui/badge";

// Items that are visible only so the mock is understandable. None is implemented
// and none carries a decision (product plan: Church Portal; naming-conventions.md).
const DEFERRED = [
  { label: "Flyer upload", status: "Undecided" },
  { label: "Livestream link", status: "Undecided" },
  { label: "Recurring schedule setup", status: "Undecided" },
  { label: "Speaker(s)", status: "Later phase" },
] as const;

/** Clearly deferred, non-interactive list of items outside this mock's scope. */
export function DeferredItems() {
  return (
    <section aria-labelledby="deferred-heading" className="rounded-xl border border-dashed p-4">
      <h3 id="deferred-heading" className="font-heading text-sm font-semibold">
        Not part of this mock
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        These are not decided or not in the startup scope, so nothing here collects them yet.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {DEFERRED.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
            {item.label}
            <Badge variant="outline">{item.status}</Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}
