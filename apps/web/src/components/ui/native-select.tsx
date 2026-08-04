import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(({ className, children, ...props }, ref) => (
  <div data-slot="native-select-wrapper" className="relative w-full">
    <select
      ref={ref}
      data-slot="native-select"
      className={cn(
        "h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-9 text-sm shadow-xs outline-none transition-colors",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
    />
  </div>
));
NativeSelect.displayName = "NativeSelect";

export function NativeSelectOption(props: React.ComponentProps<"option">) {
  return <option data-slot="native-select-option" {...props} />;
}

export function NativeSelectOptGroup(props: React.ComponentProps<"optgroup">) {
  return <optgroup data-slot="native-select-optgroup" {...props} />;
}
