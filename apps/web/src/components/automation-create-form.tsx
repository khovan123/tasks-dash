"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AUTOMATION_ACTIONS,
  AUTOMATION_EXECUTION_MODES,
  AUTOMATION_TRIGGERS,
} from "@tasks-dash/contracts";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import {
  DiscordAutomationValues,
  discordAutomationSchema,
} from "@/features/automations/schemas/discord-automation.schema";
import { apiRequest } from "@/lib/api/api-request";

export function AutomationCreateForm({ projectKey }: { projectKey: string }) {
  const router = useRouter();
  const form = useForm<DiscordAutomationValues>({
    resolver: zodResolver(discordAutomationSchema),
    defaultValues: {
      name: "",
      trigger: AUTOMATION_TRIGGERS.pullRequestOpened,
      title: "{{projectKey}} · {{title}}",
      message: "Pull request #{{pullRequestNumber}}: {{pullRequestUrl}}",
    },
  });

  async function submit(values: DiscordAutomationValues): Promise<void> {
    form.clearErrors("root");
    try {
      await apiRequest(`/api/projects/${projectKey}/automations`, {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          enabled: true,
          trigger: values.trigger,
          executionMode: AUTOMATION_EXECUTION_MODES.event,
          conditions: [],
          actions: [
            {
              type: AUTOMATION_ACTIONS.notifyDiscord,
              config: { title: values.title, message: values.message },
            },
          ],
        }),
      });
      form.reset();
      router.refresh();
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Không thể tạo automation.",
      });
    }
  }

  return (
    <FormProvider {...form}>
      <form className="form-card" onSubmit={form.handleSubmit(submit)} noValidate>
        <div className="section-heading"><div><span>EVENT AUTOMATION</span><h2>Thông báo Discord từ GitHub PR</h2></div></div>
        <div className="form-grid">
          <label>Tên rule<input {...form.register("name")} placeholder="Notify Discord when PR opens" /></label>
          <label>Trigger<select {...form.register("trigger")}><option value={AUTOMATION_TRIGGERS.pullRequestOpened}>Pull request opened</option><option value={AUTOMATION_TRIGGERS.pullRequestMerged}>Pull request merged</option></select></label>
          <label className="wide">Tiêu đề<input {...form.register("title")} /></label>
          <label className="wide">Nội dung<textarea {...form.register("message")} /></label>
        </div>
        {form.formState.errors.root?.message ? <p className="error">{form.formState.errors.root.message}</p> : null}
        <button className="primary" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Đang tạo…" : "Tạo automation"}</button>
      </form>
    </FormProvider>
  );
}
