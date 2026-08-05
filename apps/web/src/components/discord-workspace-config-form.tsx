"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Bot, RefreshCw, ServerCog } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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
}

export function DiscordWorkspaceConfigForm({ status }: { status: DiscordWorkspaceStatus }) {
  const router = useRouter();
  const [result, setResult] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const form = useForm<DiscordWorkspaceFormValues>({
    resolver: zodResolver(discordWorkspaceFormSchema),
    defaultValues: {
      guildId: status.guildId ?? "",
      categoryId: status.categoryId ?? "",
      channelNameTemplate: status.channelNameTemplate || "{{projectKey}}-updates",
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
          error instanceof Error ? error.message : "Không thể cấu hình Discord workspace.",
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
      }>("/api/integrations/discord/workspace/provision-all", { method: "POST" });
      setResult(
        `Đã kiểm tra ${response.provisionedProjects.length} project; ${response.failedProjects.length} lỗi.`,
      );
      router.refresh();
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Không thể provision Discord channels.",
      });
    } finally {
      setProvisioning(false);
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <FormCard
          eyebrow="Discord bot · workspace level"
          title="Tự tạo channel Updates và Docs"
          description="Cài bot một lần. Mỗi project nhận một channel GitHub updates và một channel lưu attachment tài liệu; folder và metadata được quản lý trên Tasks Dash."
          footer={
            <>
              <Button asChild variant="outline" type="button">
                <a href="/api/integrations/discord/install"><Bot /> Cài bot vào Discord</a>
              </Button>
              <Button disabled={form.formState.isSubmitting || !status.botConfigured}>
                <ServerCog />
                {form.formState.isSubmitting ? "Đang cấu hình…" : "Lưu và provision"}
              </Button>
              {status.configured ? (
                <Button
                  variant="secondary"
                  type="button"
                  disabled={provisioning}
                  onClick={() => void provisionAll()}
                >
                  <RefreshCw /> {provisioning ? "Đang provision…" : "Provision lại tất cả"}
                </Button>
              ) : null}
            </>
          }
        >
          {!status.botConfigured ? (
            <Alert variant="destructive">
              <AlertTitle>Discord bot secret chưa được cấu hình</AlertTitle>
              <AlertDescription>API cần DISCORD_APPLICATION_ID và DISCORD_BOT_TOKEN.</AlertDescription>
            </Alert>
          ) : null}

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="discord-guild-id">Discord Guild ID</FieldLabel>
              <Input id="discord-guild-id" {...form.register("guildId")} placeholder="123456789012345678" />
              <FieldDescription>ID Discord server đã cài Tasks Dash bot.</FieldDescription>
              {form.formState.errors.guildId?.message ? <FieldError>{form.formState.errors.guildId.message}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="discord-category-id">Category ID tùy chọn</FieldLabel>
              <Input id="discord-category-id" {...form.register("categoryId")} placeholder="Để trống nếu tạo ở server root" />
              <FieldDescription>Cả Updates và Docs channel nằm trong category này.</FieldDescription>
              {form.formState.errors.categoryId?.message ? <FieldError>{form.formState.errors.categoryId.message}</FieldError> : null}
            </Field>
          </FieldGroup>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="discord-updates-template">Updates channel template</FieldLabel>
              <Input id="discord-updates-template" {...form.register("channelNameTemplate")} placeholder="{{projectKey}}-updates" />
              <FieldDescription>Nhận GitHub PR/push automation.</FieldDescription>
              {form.formState.errors.channelNameTemplate?.message ? <FieldError>{form.formState.errors.channelNameTemplate.message}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="discord-docs-template">Docs channel template</FieldLabel>
              <Input id="discord-docs-template" {...form.register("docsChannelNameTemplate")} placeholder="{{projectKey}}-docs" />
              <FieldDescription>Lưu file attachment và version tài liệu.</FieldDescription>
              {form.formState.errors.docsChannelNameTemplate?.message ? <FieldError>{form.formState.errors.docsChannelNameTemplate.message}</FieldError> : null}
            </Field>
          </FieldGroup>

          <FieldDescription>
            Hỗ trợ biến {"{{projectKey}}"} và {"{{projectName}}"}; tên tự lowercase, bỏ dấu và giới hạn 100 ký tự.
          </FieldDescription>

          {status.configured ? (
            <Alert variant="success">
              <AlertTitle>Đã kết nối {status.guildName ?? status.guildId}</AlertTitle>
              <AlertDescription>
                Updates: {status.channelNameTemplate} · Docs: {status.docsChannelNameTemplate}
              </AlertDescription>
            </Alert>
          ) : null}
          {status.lastError ? (
            <Alert variant="destructive">
              <AlertTitle>Lần provision gần nhất thất bại</AlertTitle>
              <AlertDescription>{status.lastError}</AlertDescription>
            </Alert>
          ) : null}
          {form.formState.errors.root?.message ? <FieldError>{form.formState.errors.root.message}</FieldError> : null}
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
