import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Brand mark for Signal One Sound: the small SOS gradient icon beside the text name.
 * The one place the product name is styled; the logo assets live in public/brand (docs/ui.md section 25).
 */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-heading inline-flex items-center gap-2 text-base font-bold tracking-tight whitespace-nowrap",
        className,
      )}
    >
      <Image src="/brand/sos-icon.svg" alt="" width={34} height={12} unoptimized className="h-auto w-9" />
      <span>
        Signal One <span className="text-gradient-gold">Sound</span>
      </span>
    </span>
  );
}
