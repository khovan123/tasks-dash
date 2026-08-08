import type { ReactNode } from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PageHero({
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
          <CardTitle className="font-heading text-3xl font-extrabold tracking-tight gradient-title sm:text-5xl">
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
