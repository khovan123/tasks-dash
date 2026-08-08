"use client";

import type { ReactNode } from "react";
import { PublicPageShell } from "@/components/templates/public-page-shell";

interface PublicInfoPageProps {
  eyebrow: string;
  title: string;
  summary: string;
  children: ReactNode;
}

export function PublicInfoPage({
  eyebrow,
  title,
  summary,
  children,
}: PublicInfoPageProps) {
  return (
    <PublicPageShell>
      <section className="glass-card mb-8 rounded-[2rem] px-6 py-8 sm:px-10 sm:py-12">
        <div className="mb-4 inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          {eyebrow}
        </div>
        <h1 className="gradient-title max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
          {summary}
        </p>
      </section>
      <section className="glass-card rounded-[2rem] px-6 py-8 sm:px-10 sm:py-10">
        <div className="prose prose-slate max-w-none dark:prose-invert">{children}</div>
      </section>
    </PublicPageShell>
  );
}
