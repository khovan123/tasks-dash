import * as React from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
  spinnerClassName?: string;
}

function Loading({
  message = "Đang tải...",
  className,
  spinnerClassName,
  ...props
}: LoadingProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3 p-6", className)}
      {...props}
    >
      <Spinner className={cn("size-8 text-primary", spinnerClassName)} />
      {message && (
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}

export { Loading };
