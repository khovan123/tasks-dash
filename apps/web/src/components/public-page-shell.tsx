"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PublicPageShellProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  footerClassName?: string;
  containerClassName?: string;
  footer?: ReactNode;
}

const DEFAULT_FOOTER = (
  <>
    <p>Tasks Dash public integration pages.</p>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Link href="/legal" className="transition hover:text-foreground">
        Legal Hub
      </Link>
      <Link href="/verify-user" className="transition hover:text-foreground">
        Verify User
      </Link>
      <Link href="/login/code" className="transition hover:text-foreground">
        Login Code
      </Link>
      <Link href="/terms-of-service" className="transition hover:text-foreground">
        Terms of Service
      </Link>
      <Link href="/privacy-policy" className="transition hover:text-foreground">
        Privacy Policy
      </Link>
      <span>Updated August 6, 2026.</span>
    </div>
  </>
);

export function PublicPageShell({
  children,
  className,
  contentClassName,
  footerClassName,
  containerClassName,
  footer = DEFAULT_FOOTER,
}: PublicPageShellProps) {
  return (
    <main
      className={cn(
        "relative min-h-screen overflow-hidden bg-background text-foreground",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/18 blur-3xl" />
        <div className="absolute bottom-12 right-0 h-72 w-72 rounded-full bg-info/12 blur-3xl" />
        <div className="absolute left-0 top-1/3 h-64 w-64 rounded-full bg-warning/10 blur-3xl" />
      </div>

      <div
        className={cn(
          "relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-10 sm:px-8 lg:px-10",
          containerClassName,
        )}
      >
        <header className="mb-10 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-sm font-semibold text-foreground/90 transition hover:text-foreground"
          >
            <img
              src="/assets/images/logo.png"
              alt="Tasks Dash"
              className="h-10 w-10 rounded-2xl border border-white/10 bg-card object-contain p-1 shadow-lg"
            />
            <span>Tasks Dash</span>
          </Link>

          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/legal" className="transition hover:text-foreground">
              Legal
            </Link>
            <Link href="/terms-of-service" className="transition hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy-policy" className="transition hover:text-foreground">
              Privacy
            </Link>
          </nav>
        </header>

        <div className={cn("flex flex-1 flex-col", contentClassName)}>{children}</div>

        <footer
          className={cn(
            "mt-8 flex flex-col gap-2 border-t border-border/70 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between",
            footerClassName,
          )}
        >
          {footer}
        </footer>
      </div>
    </main>
  );
}
