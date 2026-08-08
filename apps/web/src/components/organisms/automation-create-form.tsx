"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AUTOMATION_ACTIONS,
  AUTOMATION_EXECUTION_MODES,
  AUTOMATION_TRIGGERS,
} from "@tasks-dash/contracts";
import { useRouter } from "next/navigation";
import { Controller, FormProvider, useForm } from "react-hook-form";
import {
  Check,
  ChevronsUpDown,
  Clock,
  Info,
  MessageSquare,
  Plus,
  Zap,
} from "lucide-react";
import {
  AUTOMATION_CHANNEL_OPTIONS,
  AUTOMATION_CRON_PRESETS,
  AUTOMATION_HELPER_VARIABLES,
  AUTOMATION_TRIGGER_GROUPS,
  AUTOMATION_TRIGGER_OPTIONS,
  renderAutomationSamplePreview,
} from "@/features/automations/config";
import {
  DiscordAutomationValues,
  discordAutomationSchema,
} from "@/features/automations/schemas/discord-automation.schema";
import { apiRequest } from "@/lib/api/api-request";
import { FormCard } from "@/components/organisms/form-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupTextarea,
  InputGroupText,
} from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

export function AutomationCreateForm({ projectKey }: { projectKey: string }) {
  const router = useRouter();
  const [discordChannels, setDiscordChannels] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [openTrigger, setOpenTrigger] = useState(false);
  const [openChannel, setOpenChannel] = useState(false);

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
        if (active && Array.isArray(channels) && channels.length > 0) {
          setDiscordChannels(channels);
          form.setValue("channelType", channels[0].id || channels[0].name);
        }
      } catch {
        // Fallback to the shared predefined channel catalog.
      } finally {
        if (active) setIsLoadingChannels(false);
      }
    }
    void fetchDiscordChannels();
    return () => {
      active = false;
    };
  }, [projectKey, form]);

  const watchedTrigger = form.watch("trigger");
  const watchedTitle = form.watch("title");
  const watchedMessage = form.watch("message");
  const previewTitle = renderAutomationSamplePreview(watchedTitle, projectKey);
  const previewMessage = renderAutomationSamplePreview(watchedMessage, projectKey);

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
        message:
          error instanceof Error ? error.message : "Không thể tạo automation.",
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
          description="Tùy chỉnh bất kỳ trigger nào từ GitHub App Webhooks hoặc hệ thống để bắn thông báo Discord theo ý bạn."
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
              <FieldLabel htmlFor="automation-trigger">
                Trigger sự kiện *
              </FieldLabel>
              <Controller
                control={form.control}
                name="trigger"
                render={({ field }) => (
                  <Popover open={openTrigger} onOpenChange={setOpenTrigger}>
                    <PopoverTrigger asChild>
                      <Button
                        id="automation-trigger"
                        variant="outline"
                        role="combobox"
                        aria-expanded={openTrigger}
                        className="w-full justify-between font-normal"
                      >
                        {field.value
                          ? AUTOMATION_TRIGGER_OPTIONS.find(
                              (trigger) => trigger.value === field.value,
                            )?.label
                          : "Chọn trigger sự kiện..."}
                        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-112.5 p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Tìm kiếm trigger..." />
                        <CommandList>
                          <CommandEmpty>
                            Không tìm thấy trigger nào.
                          </CommandEmpty>
                          {AUTOMATION_TRIGGER_GROUPS.map((groupName) => (
                            <CommandGroup key={groupName} heading={groupName}>
                              {AUTOMATION_TRIGGER_OPTIONS.filter(
                                (trigger) => trigger.group === groupName,
                              ).map((option) => (
                                <CommandItem
                                  key={option.value}
                                  value={option.label}
                                  onSelect={() => {
                                    field.onChange(option.value);
                                    setOpenTrigger(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 size-4",
                                      field.value === option.value
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  {option.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                render={({ field }) => {
                  const channelList =
                    discordChannels.length > 0
                      ? discordChannels
                      : AUTOMATION_CHANNEL_OPTIONS;
                  const selectedChannel = channelList.find(
                    (channel) => channel.id === field.value,
                  );
                  return (
                    <Popover open={openChannel} onOpenChange={setOpenChannel}>
                      <PopoverTrigger asChild>
                        <Button
                          id="automation-channel"
                          variant="outline"
                          role="combobox"
                          aria-expanded={openChannel}
                          className="w-full justify-between font-normal"
                        >
                          {selectedChannel
                            ? selectedChannel.name
                            : "Chọn kênh Discord..."}
                          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-112.5 p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Tìm kiếm kênh..." />
                          <CommandList>
                            <CommandEmpty>
                              Không tìm thấy kênh nào.
                            </CommandEmpty>
                            <CommandGroup>
                              {channelList.map((channel) => (
                                <CommandItem
                                  key={channel.id}
                                  value={channel.name}
                                  onSelect={() => {
                                    field.onChange(channel.id);
                                    setOpenChannel(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 size-4",
                                      field.value === channel.id
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  {channel.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  );
                }}
              />
              <FieldDescription>
                {isLoadingChannels
                  ? "Đang tải danh sách kênh Discord từ Server dự án…"
                  : discordChannels.length > 0
                    ? "Danh sách kênh Discord được đồng bộ tự động từ Discord Server của dự án."
                    : "Chọn kênh Discord trong server dự án để gửi thông báo này tới."}
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
                className="font-mono bg-background"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="mr-1 self-center text-xs text-muted-foreground">
                  Lịch mẫu:
                </span>
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
                Định dạng chuẩn Cron: <code>phút giờ ngày tháng thứ</code> (Ví
                dụ: <code>0 9 * * *</code> = 9:00 sáng mỗi ngày).
              </FieldDescription>
              {form.formState.errors.cronExpression?.message ? (
                <FieldError>
                  {form.formState.errors.cronExpression.message}
                </FieldError>
              ) : null}
            </Field>
          ) : null}

          <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Info className="size-4 text-primary" />
              Biến có sẵn (Bấm để chèn nhanh vào Nội dung)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AUTOMATION_HELPER_VARIABLES.map((variable) => (
                <div key={variable.code} className="inline-flex items-center gap-1">
                  <Badge
                    variant="outline"
                    className="cursor-pointer bg-background font-mono text-[11px]"
                    onClick={() => appendVariable("message", variable.code)}
                    title={`Chèn ${variable.code} vào Nội dung`}
                  >
                    <Plus className="mr-0.5 size-3" />
                    {variable.label}{" "}
                    <span className="opacity-60 font-mono">
                      ({variable.code})
                    </span>
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <Field>
            <FieldLabel htmlFor="automation-title">
              Tiêu đề thông báo *
            </FieldLabel>
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
                  <Plus data-icon="inline-start" />
                  Project key
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {form.formState.errors.title?.message ? (
              <FieldError>{form.formState.errors.title.message}</FieldError>
            ) : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="automation-message">
              Nội dung chi tiết *
            </FieldLabel>
            <InputGroup>
              <InputGroupTextarea
                id="automation-message"
                rows={4}
                {...form.register("message")}
                placeholder="Pull request #{{pullRequestNumber}}: {{pullRequestUrl}}"
              />
              <InputGroupAddon align="block-end" className="border-t">
                <InputGroupText>
                  <Info data-icon="inline-start" />
                  Hỗ trợ Markdown Discord
                </InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            <FieldDescription>
              Hỗ trợ xuống dòng và định dạng Discord markdown (`**bold**`,
              `*italic*`, `[link](url)`).
            </FieldDescription>
            {form.formState.errors.message?.message ? (
              <FieldError>{form.formState.errors.message.message}</FieldError>
            ) : null}
          </Field>

          <div className="flex flex-col gap-2 pt-2">
            <Separator />
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <MessageSquare className="size-4 text-primary" />
              Xem trước thông báo Discord (Live Preview)
            </div>

            <div className="rounded-lg border bg-card p-4 font-sans text-card-foreground shadow-sm">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-black text-primary-foreground shadow-sm">
                  TD
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">Tasks Dash Bot</span>
                    <Badge
                      variant="secondary"
                      className="px-1 py-0.5 text-[9px]"
                    >
                      BOT
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Hôm nay lúc 19:24
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 rounded-md border-l-4 border-primary bg-muted/40 p-3 text-sm shadow-sm">
                    {previewTitle ? (
                      <div className="font-bold leading-snug">
                        {previewTitle}
                      </div>
                    ) : (
                      <div className="text-xs italic text-muted-foreground">
                        (Chưa nhập tiêu đề)
                      </div>
                    )}
                    {previewMessage ? (
                      <div className="whitespace-pre-wrap rounded border bg-background p-2.5 font-mono text-xs leading-relaxed text-foreground">
                        {previewMessage}
                      </div>
                    ) : (
                      <div className="text-xs italic text-muted-foreground">
                        (Chưa nhập nội dung)
                      </div>
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
