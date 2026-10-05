import { cn } from "@/lib/utils";

/**
 * Temporary text wordmark for Signal One Sound (no approved logo yet).
 * The one place the product name is styled; a future logo/brand mark replaces
 * this implementation (docs/ui.md section 24), not the screens that use it.
 */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-heading text-base font-semibold tracking-tight whitespace-nowrap",
        className,
      )}
    >
      Signal One <span className="text-primary">Sound</span>
    </span>
  );
}
