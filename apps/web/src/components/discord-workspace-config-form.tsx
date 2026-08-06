"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Bot, RefreshCw, ServerCog, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { useState } from "react";
import {
  DiscordWorkspaceFormValues,
  discordWorkspaceFormSchema,
} from "@/features/integrations/schemas/discord-workspace-form.schema";
import { apiRequest } from "@/lib/api/api-request";
import { FormCard } from "@/components/layout/app-shell";
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

export interface DiscordWorkspaceStatus {
  botConfigured: boolean;
  configured: boolean;
  guildId?: string | null;
  guildName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  channelNameTemplate: string;
  docsChannelNameTemplate: string;
  enabled: boolean;
  lastProvisionedAt?: string | null;
  lastError?: string | null;
  installUrl?: string | null;
  availableGuilds?: Array<{ id: string; name: string; disabled?: boolean }>;
}

export function DiscordWorkspaceConfigForm({
  status,
}: {
  status: DiscordWorkspaceStatus;
}) {
  const router = useRouter();
  const [result, setResult] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const initialGuildId =
    status.guildId ||
    (status.availableGuilds?.length ? status.availableGuilds[0].id : "");

  const form = useForm<DiscordWorkspaceFormValues>({
    resolver: zodResolver(discordWorkspaceFormSchema),
    defaultValues: {
      guildId: initialGuildId,
      categoryId: status.categoryId ?? "",
      channelNameTemplate:
        status.channelNameTemplate || "{{projectKey}}-updates",
      docsChannelNameTemplate:
        status.docsChannelNameTemplate || "{{projectKey}}-docs",
    },
  });

  async function submit(values: DiscordWorkspaceFormValues): Promise<void> {
    form.clearErrors("root");
    setResult(null);
    try {
      const response = await apiRequest<{
        provisionedProjects?: string[];
        failedProjects?: Array<{ projectKey: string; error: string }>;
      }>("/api/integrations/discord/workspace/configure", {
        method: "POST",
        body: JSON.stringify({
          guildId: values.guildId,
          categoryId: values.categoryId || undefined,
          channelNameTemplate: values.channelNameTemplate,
          docsChannelNameTemplate: values.docsChannelNameTemplate,
        }),
      });
      setResult(
        `Đã provision ${response.provisionedProjects?.length ?? 0} project; ${response.failedProjects?.length ?? 0} lỗi.`,
      );
      router.refresh();
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "Không thể cấu hình Discord workspace.",
      });
    }
  }

  async function provisionAll(): Promise<void> {
    setProvisioning(true);
    setResult(null);
    try {
      const response = await apiRequest<{
        provisionedProjects: string[];
        failedProjects: Array<{ projectKey: string; error: string }>;
      }>("/api/integrations/discord/workspace/provision-all", {
        method: "POST",
      });
      setResult(
        `Đã kiểm tra ${response.provisionedProjects.length} project; ${response.failedProjects.length} lỗi.`,
      );
      router.refresh();
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "Không thể provision Discord channels.",
      });
    } finally {
      setProvisioning(false);
    }
  }

  async function cleanChannels(): Promise<void> {
    setCleaning(true);
    setResult(null);
    try {
      const res = await apiRequest<{
        deletedChannelsCount: number;
        deletedCategoriesCount: number;
      }>("/api/integrations/discord/workspace/channels", { method: "DELETE" });
      setResult(
        `Đã xóa thành công ${res.deletedChannelsCount} kênh và ${res.deletedCategoriesCount} danh mục Discord khỏi Server.`,
      );
      router.refresh();
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "Không thể xóa kênh Discord.",
      });
    } finally {
      setCleaning(false);
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <FormCard
          eyebrow="Discord bot · workspace level"
          title="Kết nối Discord Server"
          description="Cài đặt bot và cấu hình Server Discord để phục vụ việc tạo kênh tự động cho các dự án của bạn."
          footer={
            <>
              <Button asChild variant="outline" type="button">
                <a
                  href="/api/integrations/discord/install"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Bot data-icon="inline-start" /> Cài bot vào Server Discord
                </a>
              </Button>
              <Button
                disabled={form.formState.isSubmitting || !status.botConfigured}
              >
                <ServerCog data-icon="inline-start" />
                {form.formState.isSubmitting
                  ? "Đang cấu hình…"
                  : "Lưu cấu hình"}
              </Button>
              {status.configured ? (
                <>
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={provisioning}
                    onClick={() => void provisionAll()}
                  >
                    <RefreshCw data-icon="inline-start" />
                    {provisioning ? "Reseting..." : "Reset all"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        type="button"
                        disabled={cleaning}
                      >
                        <Trash2 data-icon="inline-start" />
                        {cleaning ? "Đang xóa…" : "Xóa tất cả Kênh Discord"}
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
                          Hành động này sẽ xóa toàn bộ channel và category do bot
                          provision trong server Discord hiện tại. Không thể hoàn tác.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={() => void cleanChannels()}
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
              {status.availableGuilds && status.availableGuilds.length > 0 ? (
                <Select
                  value={form.watch("guildId")}
                  onValueChange={(value) =>
                    form.setValue("guildId", value, {
                      shouldValidate: true,
                    })
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
                  ? `Tự động phát hiện ${status.availableGuilds.length} Server Discord có Tasks Dash bot. Chọn Server và bấm 'Lưu'.`
                  : "ID Discord server đã cài Tasks Dash bot."}
              </FieldDescription>
              {form.formState.errors.guildId?.message ? (
                <FieldError>{form.formState.errors.guildId.message}</FieldError>
              ) : null}
            </Field>
          </FieldGroup>

          {status.configured ? (
            <Alert variant="success">
              <AlertTitle>
                Đã kết nối {status.guildName ?? status.guildId}
              </AlertTitle>
              <AlertDescription>
                Đã cài bot và kết nối thành công với Server Discord.
              </AlertDescription>
            </Alert>
          ) : null}
          {status.lastError ? (
            <Alert variant="destructive">
              <AlertTitle>Lần provision gần nhất thất bại</AlertTitle>
              <AlertDescription>{status.lastError}</AlertDescription>
            </Alert>
          ) : null}
          {form.formState.errors.root?.message ? (
            <FieldError>{form.formState.errors.root.message}</FieldError>
          ) : null}
          {result ? (
            <Alert variant="success">
              <AlertTitle>Discord provisioning hoàn tất</AlertTitle>
              <AlertDescription>{result}</AlertDescription>
            </Alert>
          ) : null}
        </FormCard>
      </form>
    </FormProvider>
  );
}
