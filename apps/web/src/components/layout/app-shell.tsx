import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
        "mx-auto min-h-[calc(100vh-4rem)] w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8",
        className,
      )}
    >
      {children}
    </main>
  );
}

export function AppTopbar({ children }: { children: ReactNode }) {
  return (
    <header className="flex min-h-12 flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
      {children}
    </header>
  );
}

export function AppNav({ children }: { children: ReactNode }) {
  return <nav className="flex flex-wrap items-center gap-2 text-sm">{children}</nav>;
}

export function PageHero({
  eyebrow,
  title,
  description,
  aside,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-primary/15 bg-card/90 shadow-lg shadow-primary/5 backdrop-blur",
        className,
      )}
    >
      <CardHeader className="gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
          <CardTitle className="text-3xl tracking-tight sm:text-5xl">{title}</CardTitle>
          <CardDescription className="max-w-3xl text-base leading-relaxed">
            {description}
          </CardDescription>
        </div>
        {aside ? <div className="mt-4 sm:mt-0">{aside}</div> : null}
      </CardHeader>
    </Card>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string;
  title: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </p>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      {meta ? <div className="text-sm font-medium text-muted-foreground">{meta}</div> : null}
    </div>
  );
}

export function FormCard({
  title,
  eyebrow,
  description,
  children,
  footer,
}: {
  title: ReactNode;
  eyebrow: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </p>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
      {footer ? <CardFooter className="gap-2">{footer}</CardFooter> : null}
    </Card>
  );
}
