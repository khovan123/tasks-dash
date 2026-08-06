import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
        "mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8",
        className,
      )}
    >
      {children}
    </main>
  );
}

export function AppTopbar({ children }: { children: ReactNode }) {
  return (
    <header className="flex min-h-12 flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
      {children}
    </header>
  );
}

export function AppNav({ children }: { children: ReactNode }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm">{children}</nav>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  aside,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "glass-card overflow-hidden border-border/70 bg-card/90 p-2 shadow-xl backdrop-blur-2xl sm:p-4",
        className,
      )}
    >
      <CardHeader className="gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex flex-col gap-3">
          <CardTitle className="text-3xl font-extrabold tracking-tight sm:text-5xl font-heading gradient-title">
            {title}
          </CardTitle>
          <CardDescription className="max-w-3xl text-base leading-relaxed text-muted-foreground">
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
  eyebrow?: string;
  title: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-extrabold tracking-tight font-heading gradient-title">
          {title}
        </h2>
      </div>
      {meta ? (
        <div className="text-sm font-medium text-muted-foreground">{meta}</div>
      ) : null}
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
  eyebrow?: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card className="glass-card border-border/70 bg-card/90 shadow-xl backdrop-blur-2xl">
      <CardHeader className="flex flex-col gap-2">
        <CardTitle className="text-2xl font-extrabold font-heading gradient-title">
          {title}
        </CardTitle>
        {description ? (
          <CardDescription className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-5">{children}</CardContent>
      {footer ? (
        <CardFooter className="mt-2 gap-3 border-t pt-4">
          {footer}
        </CardFooter>
      ) : null}
    </Card>
  );
}
