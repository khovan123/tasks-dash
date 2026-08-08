import type { ReactNode } from "react";

export function LabeledValueCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card/60 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-lg font-bold">{value}</div>
    </div>
  );
}
