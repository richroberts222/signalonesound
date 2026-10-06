import type { ReactNode } from "react";

/** Shared empty/no-results panel for admin lists. */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div role="status" className="flex flex-col gap-1 rounded-xl border border-dashed p-6 text-center">
      <p className="font-heading font-semibold">{title}</p>
      {children ? <p className="text-sm text-muted-foreground">{children}</p> : null}
    </div>
  );
}
