import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * The Signal One Sound logo: the fire S, the people and cross, and the sound-wave S with the dove, lined up on the
 * same top and bottom, with the name and "Holy, United, Awakened" beneath. The one place the brand mark is drawn;
 * the asset lives in public/brand (docs/ui.md section 25). `large` is for the home page, `compact` for the rest.
 */
export function BrandWordmark({ size = "compact", className }: { size?: "large" | "compact"; className?: string }) {
  return (
    <Image
      src="/brand/signal-one-sound-logo.png"
      alt=""
      width={1004}
      height={586}
      priority
      className={cn("h-auto", size === "large" ? "w-64 sm:w-80" : "w-36 sm:w-44", className)}
    />
  );
}
