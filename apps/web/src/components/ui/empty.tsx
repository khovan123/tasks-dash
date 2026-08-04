import * as React from "react";
import { cn } from "@/lib/utils";

export function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex min-h-48 flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/20 p-8 text-center",
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
  return <h2 className={cn("text-xl font-semibold", className)} {...props} />;
}

export function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />
  );
}

export function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap justify-center gap-2", className)} {...props} />;
}
