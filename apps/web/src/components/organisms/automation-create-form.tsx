"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AUTOMATION_ACTIONS,
  AUTOMATION_EXECUTION_MODES,
  AUTOMATION_TRIGGERS,
} from "@tasks-dash/contracts";
import { useRouter } from "next/navigation";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { Clock, Info, MessageSquare, Plus, Zap } from "lucide-react";
import { SearchableSelect } from "@/components/molecules/searchable-select";
import { FormCard } from "@/components/organisms/form-card";
import {
  AUTOMATION_CHANNEL_OPTIONS,
  AUTOMATION_CRON_PRESETS,
  AUTOMATION_HELPER_VARIABLES,
  AUTOMATION_TRIGGER_GROUPS,
  AUTOMATION_TRIGGER_OPTIONS,
  renderAutomationSamplePreview,
} from "@/features/automations/config";
import {
  type DiscordAutomationValues,
  discordAutomationSchema,
} from "@/features/automations/schemas/discord-automation.schema";
import { apiRequest } from "@/lib/api/api-request";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupTextarea,
  InputGroupText,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";

export function AutomationCreateForm({ projectKey }: { projectKey: string }) {
  const router = useRouter();
  const [discordChannels, setDiscordChannels] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const form = useForm<DiscordAutomationValues>({
    resolver: zodResolver(discordAutomationSchema),
    defaultValues: {
      name: "",
      trigger: AUTOMATION_TRIGGERS.pullRequestOpened,
      cronExpression: "0 9 * * *",
      channelType: "updates",
      title: "{{projectKey}} · {{title}}",
      message: "Pull request #{{pullRequestNumber}}: {{pullRequestUrl}}",
    },
  });

  useEffect(() => {
    let active = true;
    async function fetchDiscordChannels() {
      setIsLoadingChannels(true);
      try {
        const channels = await apiRequest<Array<{ id: string; name: string }>>(
          `/api/integrations/discord/projects/${projectKey}/channels`,
        );
        if (active && channels.length > 0) {
          setDiscordChannels(channels);
          form.setValue("channelType", channels[0].id || channels[0].name);
        }
      } catch {
        // Optional remote catalog: shared predefined channels remain available.
      } finally {
        if (active) setIsLoadingChannels(false);
      }
    }
    void fetchDiscordChannels();
    return () => {
      active = false;
    };
  }, [form, projectKey]);

  const triggerOptions = useMemo(
    () =>
      AUTOMATION_TRIGGER_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
        group: option.group,
      })),
    [],
  );
  const channelOptions = useMemo(
    () =>
      (discordChannels.length > 0 ? discordChannels : AUTOMATION_CHANNEL_OPTIONS).map(
        (channel) => ({ value: channel.id, label: channel.name }),
      ),
    [discordChannels],
  );

  const watchedTrigger = form.watch("trigger");
  const previewTitle = renderAutomationSamplePreview(form.watch("title"), projectKey);
  const previewMessage = renderAutomationSamplePreview(form.watch("message"), projectKey);

  async function submit(values: DiscordAutomationValues): Promise<void> {
    form.clearErrors("root");
    const isScheduled = values.trigger === AUTOMATION_TRIGGERS.scheduled;
    try {
      await apiRequest(`/api/projects/${projectKey}/automations`, {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          enabled: true,
          trigger: values.trigger,
          executionMode: isScheduled
            ? AUTOMATION_EXECUTION_MODES.scheduled
            : AUTOMATION_EXECUTION_MODES.event,
          cronExpression: isScheduled ? values.cronExpression : undefined,
          conditions: [],
          actions: [
            {
              type: AUTOMATION_ACTIONS.notifyDiscord,
              config: {
                title: values.title,
                message: values.message,
                channelType: values.channelType,
              },
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

  function appendVariable(fieldName: "title" | "message", code: string) {
    const current = form.getValues(fieldName) || "";
    form.setValue(fieldName, current ? `${current} ${code}` : code, {
      shouldValidate: true,
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <FormCard
          eyebrow="Event automation tùy biến"
          title="Tạo automation của bạn"
          description="Tùy chỉnh trigger từ GitHub App Webhooks hoặc hệ thống để gửi thông báo Discord."
          footer={
            <Button disabled={form.formState.isSubmitting}>
              <Zap data-icon="inline-start" />
              {form.formState.isSubmitting ? "Đang tạo…" : "Tạo automation"}
            </Button>
          }
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="automation-name">Tên rule *</FieldLabel>
              <Input
                id="automation-name"
                {...form.register("name")}
                placeholder="Thông báo Discord khi PR được duyệt"
              />
              {form.formState.errors.name?.message ? (
                <FieldError>{form.formState.errors.name.message}</FieldError>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="automation-trigger">Trigger sự kiện *</FieldLabel>
              <Controller
                control={form.control}
                name="trigger"
                render={({ field }) => (
                  <SearchableSelect
                    triggerId="automation-trigger"
                    value={field.value}
                    options={triggerOptions}
                    groupOrder={AUTOMATION_TRIGGER_GROUPS}
                    onValueChange={field.onChange}
                    placeholder="Chọn trigger sự kiện..."
                    searchPlaceholder="Tìm kiếm trigger..."
                    emptyText="Không tìm thấy trigger nào."
                    contentClassName="w-112.5"
                  />
                )}
              />
              {form.formState.errors.trigger?.message ? (
                <FieldError>{form.formState.errors.trigger.message}</FieldError>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="automation-channel">
                Kênh Discord nhận thông báo *
              </FieldLabel>
              <Controller
                control={form.control}
                name="channelType"
                render={({ field }) => (
                  <SearchableSelect
                    triggerId="automation-channel"
                    value={field.value}
                    options={channelOptions}
                    onValueChange={field.onChange}
                    placeholder="Chọn kênh Discord..."
                    searchPlaceholder="Tìm kiếm kênh..."
                    emptyText="Không tìm thấy kênh nào."
                    contentClassName="w-112.5"
                  />
                )}
              />
              <FieldDescription>
                {isLoadingChannels
                  ? "Đang tải danh sách kênh Discord từ Server dự án…"
                  : discordChannels.length > 0
                    ? "Danh sách kênh Discord được đồng bộ tự động từ Discord Server của dự án."
                    : "Không lấy được catalog động; đang dùng danh sách kênh mặc định."}
              </FieldDescription>
            </Field>
          </FieldGroup>

          {watchedTrigger === AUTOMATION_TRIGGERS.scheduled ? (
            <Field className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
              <FieldLabel
                htmlFor="automation-cron"
                className="flex items-center gap-2 font-semibold text-foreground"
              >
                <Clock className="size-4 text-muted-foreground" />
                Lịch chạy định kỳ (Cron Expression) *
              </FieldLabel>
              <Input
                id="automation-cron"
                {...form.register("cronExpression")}
                placeholder="0 9 * * *"
                className="bg-background font-mono"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="mr-1 self-center text-xs text-muted-foreground">Lịch mẫu:</span>
                {AUTOMATION_CRON_PRESETS.map((preset) => (
                  <Badge
                    key={preset.cron}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() =>
                      form.setValue("cronExpression", preset.cron, {
                        shouldValidate: true,
                      })
                    }
                  >
                    {preset.label}{" "}
                    <span className="ml-1 font-mono text-[10px] opacity-60">
                      ({preset.cron})
                    </span>
                  </Badge>
                ))}
              </div>
              <FieldDescription>
                Định dạng chuẩn Cron: <code>phút giờ ngày tháng thứ</code>.
              </FieldDescription>
              {form.formState.errors.cronExpression?.message ? (
                <FieldError>{form.formState.errors.cronExpression.message}</FieldError>
              ) : null}
            </Field>
          ) : null}

          <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Info className="size-4 text-primary" />
              Biến có sẵn (bấm để chèn nhanh)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AUTOMATION_HELPER_VARIABLES.map((variable) => (
                <Badge
                  key={variable.code}
                  variant="outline"
                  className="cursor-pointer bg-background font-mono text-[11px]"
                  onClick={() => appendVariable("message", variable.code)}
                  title={`Chèn ${variable.code} vào Nội dung`}
                >
                  <Plus className="mr-0.5 size-3" />
                  {variable.label}{" "}
                  <span className="font-mono opacity-60">({variable.code})</span>
                </Badge>
              ))}
            </div>
          </div>

          <Field>
            <FieldLabel htmlFor="automation-title">Tiêu đề thông báo *</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="automation-title"
                {...form.register("title")}
                placeholder="{{projectKey}} · {{title}}"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  variant="ghost"
                  size="xs"
                  onClick={() => appendVariable("title", "{{projectKey}}")}
                >
                  <Plus data-icon="inline-start" /> Project key
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {form.formState.errors.title?.message ? (
              <FieldError>{form.formState.errors.title.message}</FieldError>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="automation-message">Nội dung chi tiết *</FieldLabel>
            <InputGroup>
              <InputGroupTextarea
                id="automation-message"
                rows={4}
                {...form.register("message")}
                placeholder="Pull request #{{pullRequestNumber}}: {{pullRequestUrl}}"
              />
              <InputGroupAddon align="block-end" className="border-t">
                <InputGroupText>
                  <Info data-icon="inline-start" /> Hỗ trợ Markdown Discord
                </InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            {form.formState.errors.message?.message ? (
              <FieldError>{form.formState.errors.message.message}</FieldError>
            ) : null}
          </Field>

          <div className="flex flex-col gap-2 pt-2">
            <Separator />
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <MessageSquare className="size-4 text-primary" />
              Xem trước thông báo Discord
            </div>
            <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-black text-primary-foreground">
                  TD
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">Tasks Dash Bot</span>
                    <Badge variant="secondary" className="px-1 py-0.5 text-[9px]">BOT</Badge>
                  </div>
                  <div className="flex flex-col gap-1.5 rounded-md border-l-4 border-primary bg-muted/40 p-3 text-sm">
                    {previewTitle ? (
                      <div className="font-bold leading-snug">{previewTitle}</div>
                    ) : (
                      <div className="text-xs italic text-muted-foreground">(Chưa nhập tiêu đề)</div>
                    )}
                    {previewMessage ? (
                      <div className="whitespace-pre-wrap rounded border bg-background p-2.5 font-mono text-xs leading-relaxed">
                        {previewMessage}
                      </div>
                    ) : (
                      <div className="text-xs italic text-muted-foreground">(Chưa nhập nội dung)</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {form.formState.errors.root?.message ? (
            <FieldError>{form.formState.errors.root.message}</FieldError>
          ) : null}
        </FormCard>
      </form>
    </FormProvider>
  );
}
