import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-10 w-full rounded-md border border-input bg-background px-3 text-sm transition outline-none focus:border-foreground focus:ring-2 focus:ring-ring/20 disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
