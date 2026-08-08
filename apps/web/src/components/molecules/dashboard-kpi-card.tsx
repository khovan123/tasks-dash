import type { ReactNode } from "react";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DashboardKpiCard({
  label,
  value,
  helper,
  icon,
  iconClassName,
}: {
  label: ReactNode;
  value: ReactNode;
  helper: ReactNode;
  icon: ReactNode;
  iconClassName?: string;
}) {
  return (
    <Card className="gap-4 py-5">
      <CardHeader className="grid grid-cols-[1fr_auto] items-start px-5">
        <div>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="mt-2 text-3xl">{value}</CardTitle>
        </div>
        <div
          className={cn(
            "rounded-lg bg-muted p-2.5 text-foreground",
            iconClassName,
          )}
        >
          {icon}
        </div>
      </CardHeader>
      <CardFooter className="px-5 text-xs text-muted-foreground">
        {helper}
      </CardFooter>
    </Card>
  );
}
