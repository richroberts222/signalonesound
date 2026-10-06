import { FlaskConical } from "lucide-react";

/** Makes the exploratory status and the absence of real admin authority visible on every admin screen. */
export function AdminMockNotice() {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-muted-foreground">
      <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        <strong className="font-semibold text-foreground">Exploratory admin mock.</strong> Signing
        in does not make you a Signal One Sound admin; real roles and permissions are not decided or
        built. All organizations, events, submissions, and import rows are fictional, and nothing
        here is saved, sent, or changed.
      </span>
    </p>
  );
}
