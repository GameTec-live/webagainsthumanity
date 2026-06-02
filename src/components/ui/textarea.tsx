import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm transition outline-none focus:border-foreground focus:ring-2 focus:ring-ring/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
