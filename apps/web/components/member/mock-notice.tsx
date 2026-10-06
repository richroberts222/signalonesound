import { FlaskConical } from "lucide-react";

/** Makes the mock status visible on every member/account screen. */
export function MemberMockNotice() {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-muted-foreground">
      <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        Interactive mock for review. Preferences, locations, and the invite link are fictional.
        Nothing here is saved, sent, or delivered, and changes reset when you reload.
      </span>
    </p>
  );
}
