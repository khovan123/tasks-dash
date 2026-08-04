import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function Field({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field"
      className={cn("grid gap-2", className)}
      {...props}
    />
  );
}

export function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn("grid gap-4 md:grid-cols-2", className)}
      {...props}
    />
  );
}

export function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return <Label data-slot="field-label" className={cn(className)} {...props} />;
}

export function FieldDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-sm leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}

export function FieldError({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-error"
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    />
  );
}

export function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn("grid gap-4 rounded-lg border bg-muted/20 p-4", className)}
      {...props}
    />
  );
}

export function FieldLegend({ className, ...props }: React.ComponentProps<"legend">) {
  return (
    <legend
      data-slot="field-legend"
      className={cn("px-1 text-sm font-semibold", className)}
      {...props}
    />
  );
}
