import { cn } from "@/lib/utils";

/**
 * Brand mark for Signal One Sound: the text name. The small SOS gradient icon is not shown here (the owner finds it
 * redundant beside the name); its file stays in public/brand to be placed somewhere else later.
 * The one place the product name is styled; the logo assets live in public/brand (docs/ui.md section 25).
 */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-heading inline-flex items-center text-base font-bold tracking-tight whitespace-nowrap", className)}>
      <span>
        Signal One <span className="text-gradient-gold">Sound</span>
      </span>
    </span>
  );
}
