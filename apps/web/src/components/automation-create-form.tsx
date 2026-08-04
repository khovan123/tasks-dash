"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AUTOMATION_ACTIONS,
  AUTOMATION_EXECUTION_MODES,
  AUTOMATION_TRIGGERS,
} from "@tasks-dash/contracts";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { Zap } from "lucide-react";
import {
  DiscordAutomationValues,
  discordAutomationSchema,
} from "@/features/automations/schemas/discord-automation.schema";
import { apiRequest } from "@/lib/api/api-request";
import { FormCard } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

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
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <FormCard
          eyebrow="Event automation"
          title="Thông báo Discord từ GitHub PR"
          footer={
            <Button disabled={form.formState.isSubmitting}>
              <Zap />
              {form.formState.isSubmitting ? "Đang tạo…" : "Tạo automation"}
            </Button>
          }
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="automation-name">Tên rule</FieldLabel>
              <Input id="automation-name" {...form.register("name")} placeholder="Notify Discord when PR opens" />
            </Field>
            <Field>
              <FieldLabel htmlFor="automation-trigger">Trigger</FieldLabel>
              <NativeSelect id="automation-trigger" {...form.register("trigger")}>
                <NativeSelectOption value={AUTOMATION_TRIGGERS.pullRequestOpened}>Pull request opened</NativeSelectOption>
                <NativeSelectOption value={AUTOMATION_TRIGGERS.pullRequestMerged}>Pull request merged</NativeSelectOption>
              </NativeSelect>
            </Field>
          </FieldGroup>
          <Field>
            <FieldLabel htmlFor="automation-title">Tiêu đề</FieldLabel>
            <Input id="automation-title" {...form.register("title")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="automation-message">Nội dung</FieldLabel>
            <Textarea id="automation-message" {...form.register("message")} />
          </Field>
          {form.formState.errors.root?.message ? (
            <FieldError>{form.formState.errors.root.message}</FieldError>
          ) : null}
        </FormCard>
      </form>
    </FormProvider>
  );
}
