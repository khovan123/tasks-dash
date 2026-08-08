"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Bot, RefreshCw, ServerCog, Trash2 } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { FormCard } from "@/components/organisms/form-card";
import { useDiscordWorkspaceConfig } from "@/features/integrations/hooks/use-discord-workspace-config";
import {
  type DiscordWorkspaceFormValues,
  discordWorkspaceFormSchema,
} from "@/features/integrations/schemas/discord-workspace-form.schema";
import type { DiscordWorkspaceStatus } from "@/features/integrations/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DiscordWorkspaceConfigForm({
  status,
}: {
  status: DiscordWorkspaceStatus;
}) {
  const actions = useDiscordWorkspaceConfig();
  const initialGuildId = status.guildId || status.availableGuilds?.[0]?.id || "";
  const form = useForm<DiscordWorkspaceFormValues>({
    resolver: zodResolver(discordWorkspaceFormSchema),
    defaultValues: {
      guildId: initialGuildId,
      categoryId: status.categoryId ?? "",
      channelNameTemplate: status.channelNameTemplate || "{{projectKey}}-updates",
      docsChannelNameTemplate: status.docsChannelNameTemplate || "{{projectKey}}-docs",
    },
  });

  async function submit(values: DiscordWorkspaceFormValues): Promise<void> {
    form.clearErrors("root");
    const result = await actions.configure(values);
    if (!result.ok) form.setError("root", { message: result.error });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <FormCard
          eyebrow="Discord bot · workspace level"
          title="Kết nối Discord Server"
          description="Cài đặt bot và cấu hình Server Discord để tạo kênh tự động cho các dự án."
          footer={
            <>
              <Button asChild variant="outline" type="button">
                <a
                  href={status.installUrl ?? "/api/integrations/discord/install"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Bot data-icon="inline-start" /> Cài bot vào Server Discord
                </a>
              </Button>
              <Button disabled={actions.configuring || !status.botConfigured}>
                <ServerCog data-icon="inline-start" />
                {actions.configuring ? "Đang cấu hình…" : "Lưu cấu hình"}
              </Button>
              {status.configured ? (
                <>
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={actions.provisioning}
                    onClick={() => void actions.provisionAll()}
                  >
                    <RefreshCw data-icon="inline-start" />
                    {actions.provisioning ? "Đang reset…" : "Reset all"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        type="button"
                        disabled={actions.cleaning}
                      >
                        <Trash2 data-icon="inline-start" />
                        {actions.cleaning ? "Đang xóa…" : "Xóa tất cả Kênh Discord"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogMedia>
                          <AlertTriangle className="text-destructive" />
                        </AlertDialogMedia>
                        <AlertDialogTitle>
                          Xóa các kênh Discord do Tasks Dash tạo?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Hành động này xóa toàn bộ channel và category do bot provision
                          trong server hiện tại. Không thể hoàn tác.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={() => void actions.cleanChannels()}
                        >
                          Xác nhận xóa
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : null}
            </>
          }
        >
          {!status.botConfigured ? (
            <Alert variant="destructive">
              <AlertTitle>Discord bot secret chưa được cấu hình</AlertTitle>
              <AlertDescription>
                API cần DISCORD_APPLICATION_ID và DISCORD_BOT_TOKEN.
              </AlertDescription>
            </Alert>
          ) : null}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="discord-guild-id">Discord Server</FieldLabel>
              {status.availableGuilds?.length ? (
                <Select
                  value={form.watch("guildId")}
                  onValueChange={(value) =>
                    form.setValue("guildId", value, { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="discord-guild-id" className="w-full">
                    <SelectValue placeholder="Chọn Discord Server" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {status.availableGuilds.map((guild) => (
                        <SelectItem
                          key={guild.id}
                          value={guild.id}
                          disabled={guild.disabled}
                        >
                          {guild.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="discord-guild-id"
                  {...form.register("guildId")}
                  placeholder="Nhập ID Server Discord..."
                />
              )}
              <FieldDescription>
                {status.availableGuilds?.length
                  ? `Tự động phát hiện ${status.availableGuilds.length} Server Discord có Tasks Dash bot.`
                  : "ID Discord server đã cài Tasks Dash bot."}
              </FieldDescription>
              {form.formState.errors.guildId?.message ? (
                <FieldError>{form.formState.errors.guildId.message}</FieldError>
              ) : null}
            </Field>
          </FieldGroup>

          {status.configured ? (
            <Alert variant="success">
              <AlertTitle>Đã kết nối {status.guildName ?? status.guildId}</AlertTitle>
              <AlertDescription>Đã cài bot và kết nối thành công với Server Discord.</AlertDescription>
            </Alert>
          ) : null}
          {status.lastError ? (
            <Alert variant="destructive">
              <AlertTitle>Lần provision gần nhất thất bại</AlertTitle>
              <AlertDescription>{status.lastError}</AlertDescription>
            </Alert>
          ) : null}
          {form.formState.errors.root?.message || actions.error ? (
            <Alert variant="destructive">
              <AlertTitle>Discord operation failed</AlertTitle>
              <AlertDescription>
                {form.formState.errors.root?.message ?? actions.error}
              </AlertDescription>
            </Alert>
          ) : null}
          {actions.result ? (
            <Alert variant="success">
              <AlertTitle>Discord provisioning hoàn tất</AlertTitle>
              <AlertDescription>{actions.result}</AlertDescription>
            </Alert>
          ) : null}
        </FormCard>
      </form>
    </FormProvider>
  );
}
