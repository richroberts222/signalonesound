import * as React from "react"

import { cn } from "@/lib/utils"

// A styled native <select>: the browser's own menu, which is the most accessible and works well on
// phones. Use this instead of a raw <select> (docs/ui.md).
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm [&_option]:bg-popover [&_option]:text-popover-foreground",
        className
      )}
      {...props}
    />
  )
}

export { NativeSelect }
