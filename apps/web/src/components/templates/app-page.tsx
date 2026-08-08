import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AppPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8",
        className,
      )}
    >
      {children}
    </main>
  );
}
