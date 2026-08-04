import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    data-slot="textarea"
    className={cn(
      "flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-colors outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
      "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
      "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
