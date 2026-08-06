"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const activityChartConfig = {
  created: {
    label: "Created",
    color: "var(--color-primary)",
  },
  completed: {
    label: "Completed",
    color: "var(--color-secondary-foreground)",
  },
} satisfies ChartConfig;

interface ActivityItem {
  day: string;
  created: number;
  completed: number;
}

interface ActivityChartProps {
  data: ActivityItem[];
}

export function ActivityChart({ data }: ActivityChartProps) {
  if (!data.length) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Chưa có hoạt động trong bảy ngày gần nhất.
      </p>
    );
  }

  return (
    <div>
      <ChartContainer
        config={activityChartConfig}
        className="h-44 w-full"
      >
        <BarChart accessibilityLayer data={data}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value: string) => value.slice(5)}
          />
          <ChartTooltip
            content={<ChartTooltipContent indicator="dashed" />}
          />
          <Bar
            dataKey="created"
            fill="var(--color-created)"
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
          />
          <Bar
            dataKey="completed"
            fill="var(--color-completed)"
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
          />
        </BarChart>
      </ChartContainer>
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-primary" />
          Created
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-secondary-foreground" />
          Completed
        </span>
      </div>
    </div>
  );
}
