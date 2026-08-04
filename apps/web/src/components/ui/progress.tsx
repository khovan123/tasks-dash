import * as React from "react";
import { cn } from "@/lib/utils";

export function Progress({
  value = 0,
  className,
  ...props
}: React.ComponentProps<"div"> & { value?: number }) {
  const normalized = Math.max(0, Math.min(100, value));
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={normalized}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/15", className)}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - normalized}%)` }}
      />
    </div>
  );
}
