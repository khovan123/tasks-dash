"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { Link2 } from "lucide-react";
import { FormCard } from "@/components/organisms/form-card";
import {
  type DiscordFormValues,
  discordFormSchema,
} from "@/features/integrations/schemas/discord-form.schema";
import { apiRequest } from "@/lib/api/api-request";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DiscordConnectForm({ projectKeys }: { projectKeys: string[] }) {
  const router = useRouter();
  const [success, setSuccess] = useState(false);
  const form = useForm<DiscordFormValues>({
    resolver: zodResolver(discordFormSchema),
    defaultValues: { projectKey: "", webhookUrl: "" },
  });

  async function submit(values: DiscordFormValues): Promise<void> {
    form.clearErrors("root");
    setSuccess(false);
    try {
      await apiRequest("/api/integrations/discord/connect", {
        method: "POST",
        body: JSON.stringify(values),
      });
      form.reset();
      setSuccess(true);
      router.refresh();
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Kết nối Discord thất bại.",
      });
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <FormCard
          eyebrow="Manual webhook fallback"
          title="Gắn webhook có sẵn"
          description="Chỉ dùng khi project cần một channel/webhook đặc biệt không do Tasks Dash bot quản lý."
          footer={
            <Button disabled={form.formState.isSubmitting || projectKeys.length === 0}>
              <Link2 />
              {form.formState.isSubmitting ? "Đang xác minh…" : "Kết nối webhook thủ công"}
            </Button>
          }
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="discord-project">Dự án</FieldLabel>
              <Controller
                control={form.control}
                name="projectKey"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="discord-project" className="w-full">
                      <SelectValue placeholder="Chọn project key" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectKeys.map((key) => (
                        <SelectItem key={key} value={key}>
                          {key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.projectKey?.message ? (
                <FieldError>{form.formState.errors.projectKey.message}</FieldError>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="discord-webhook">Webhook URL</FieldLabel>
              <Input
                id="discord-webhook"
                {...form.register("webhookUrl")}
                type="url"
                autoComplete="off"
                placeholder="https://discord.com/api/webhooks/..."
                aria-invalid={Boolean(form.formState.errors.webhookUrl)}
              />
              <FieldDescription>URL được xác minh rồi mã hóa AES-256-GCM.</FieldDescription>
              {form.formState.errors.webhookUrl?.message ? (
                <FieldError>{form.formState.errors.webhookUrl.message}</FieldError>
              ) : null}
            </Field>
          </FieldGroup>
          {form.formState.errors.root?.message ? (
            <Alert variant="destructive">
              <AlertTitle>Không thể kết nối</AlertTitle>
              <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
            </Alert>
          ) : null}
          {success ? (
            <Alert variant="success">
              <AlertTitle>Đã kết nối</AlertTitle>
              <AlertDescription>Discord webhook đã được xác minh và lưu an toàn.</AlertDescription>
            </Alert>
          ) : null}
        </FormCard>
      </form>
    </FormProvider>
  );
}
