import { Activity } from "lucide-react";
import { ActivityChart } from "@/components/molecules/activity-chart";
import { SectionHeading } from "@/components/molecules/section-heading";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { DashboardActivityPoint } from "@/features/dashboard/types";

export function DashboardActivityCard({
  activity,
}: {
  activity: DashboardActivityPoint[];
}) {
  return (
    <Card>
      <CardHeader>
        <SectionHeading
          eyebrow="Last seven days"
          title="Daily work activity"
          meta={<Activity className="size-5 text-primary" />}
        />
      </CardHeader>
      <CardContent>
        <ActivityChart data={activity} />
      </CardContent>
    </Card>
  );
}
