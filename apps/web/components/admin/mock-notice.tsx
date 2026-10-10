import { FlaskConical } from "lucide-react";

/**
 * Says which parts of the admin area are real and which are still previews. Only platform admins can use the
 * real tools (their API answers "not found" to everyone else); the browse and import sections are previews.
 */
export function AdminMockNotice() {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-muted-foreground" data-testid="admin-notice">
      <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        <strong className="font-semibold text-foreground">Admin area.</strong> Moderation, Billing and the audit log are the
        real tools, and only platform admins can use them. The Organizations, Events, Submissions and Import sections are still
        previews: they show sample data and save nothing.
      </span>
    </p>
  );
}
