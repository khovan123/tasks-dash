import type { ReactNode } from "react";

export function AppTopbar({ children }: { children: ReactNode }) {
  return (
    <header className="flex min-h-12 flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
      {children}
    </header>
  );
}

export function AppNav({ children }: { children: ReactNode }) {
  return <nav className="flex flex-wrap items-center gap-2 text-sm">{children}</nav>;
}
