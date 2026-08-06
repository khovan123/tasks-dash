import * as React from "react";
import { cn } from "@/lib/utils";

export function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex min-h-48 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/40 dark:bg-slate-950/40 p-8 text-center shadow-sm dark:shadow-inner",
        className,
      )}
      {...props}
    />
  );
}

export function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid max-w-md gap-2", className)} {...props} />;
}

export function EmptyTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-xl font-extrabold text-foreground font-heading", className)} {...props} />;
}

export function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p className={cn("text-sm leading-relaxed text-muted-foreground font-normal", className)} {...props} />
  );
}

export function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap justify-center gap-2", className)} {...props} />;
}
