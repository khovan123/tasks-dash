import Link from "next/link";
import { Zap } from "lucide-react";
import { apiData } from "@/lib/server/api-data";
import { AutomationCreateForm } from "@/components/automation-create-form";
import {
  AppPage,
  AppTopbar,
  PageHero,
  SectionHeading,
} from "@/components/layout/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export const dynamic = "force-dynamic";

interface AutomationRule {
  _id: string;
  name: string;
  enabled: boolean;
  trigger: string;
  executionMode: string;
  runCount: number;
  lastRunAt?: string;
  lastResult?: string;
  lastError?: string;
}

export default async function AutomationsPage({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const rules = await apiData<AutomationRule[]>(`/projects/${key}/automations`);

  return (
    <AppPage>
      <AppTopbar>
        <Button asChild variant="ghost"><Link href={`/projects/${key}`}>← {key}</Link></Button>
        <Button asChild variant="outline" size="sm"><Link href="/settings/integrations">Tích hợp</Link></Button>
      </AppTopbar>
      <PageHero
        eyebrow="Real execution engine"
        title={`Automation · ${key}`}
        description="Rules được lưu trong MongoDB và chạy bởi webhook hoặc scheduler thật."
        aside={<Zap className="size-14 text-primary" />}
      />
      <Card>
        <CardHeader>
          <SectionHeading eyebrow="Automation rules" title="Rules hiện tại" meta={`${rules.length} rules`} />
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Chưa có automation rule</EmptyTitle>
                <EmptyDescription>Tạo rule GitHub → Discord đầu tiên bên dưới.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-3">
              {rules.map((rule) => (
                <article key={rule._id} className="grid gap-4 rounded-lg border bg-muted/20 p-4 sm:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>{rule.name}</strong>
                      <Badge variant={rule.enabled ? "success" : "secondary"}>{rule.enabled ? "Enabled" : "Disabled"}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{rule.trigger} · {rule.executionMode}</p>
                  </div>
                  <div className="text-sm sm:text-right">
                    <strong>{rule.lastResult ?? "Chưa chạy"}</strong>
                    <p className="text-muted-foreground">{rule.runCount} lần chạy</p>
                  </div>
                  {rule.lastError ? (
                    <Alert variant="destructive" className="sm:col-span-2">
                      <AlertTitle>Lần chạy gần nhất thất bại</AlertTitle>
                      <AlertDescription>{rule.lastError}</AlertDescription>
                    </Alert>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <AutomationCreateForm projectKey={key} />
    </AppPage>
  );
}
