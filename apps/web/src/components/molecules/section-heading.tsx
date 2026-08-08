import type { ReactNode } from "react";

export function SectionHeading({
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
        <h2 className="font-heading text-xl font-extrabold tracking-tight gradient-title">
          {title}
        </h2>
      </div>
      {meta ? (
        <div className="text-sm font-medium text-muted-foreground">{meta}</div>
      ) : null}
    </div>
  );
}
