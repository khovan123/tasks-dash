"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { apiRequest } from "@/lib/api/api-request";
import {
  DiscordFormValues,
  discordFormSchema,
} from "@/features/integrations/schemas/discord-form.schema";

export function DiscordConnectForm({ projectKeys }: { projectKeys: string[] }) {
  const router = useRouter();
  const form = useForm<DiscordFormValues>({
    resolver: zodResolver(discordFormSchema),
    defaultValues: { projectKey: "", webhookUrl: "" },
  });
  const success = form.formState.isSubmitSuccessful && !form.formState.errors.root;

  async function submit(values: DiscordFormValues): Promise<void> {
    form.clearErrors("root");
    try {
      await apiRequest("/api/integrations/discord/connect", {
        method: "POST",
        body: JSON.stringify(values),
      });
      form.reset();
      router.refresh();
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Kết nối Discord thất bại.",
      });
    }
  }

  return (
    <FormProvider {...form}>
      <form className="form-card" onSubmit={form.handleSubmit(submit)} noValidate>
        <div className="section-heading"><div><span>DISCORD AUTOMATION</span><h2>Kết nối webhook theo dự án</h2></div></div>
        <div className="form-grid">
          <label>Dự án<select {...form.register("projectKey")} aria-invalid={Boolean(form.formState.errors.projectKey)}><option value="">Chọn project key</option>{projectKeys.map((key) => <option key={key} value={key}>{key}</option>)}</select></label>
          <label className="wide">Webhook URL<input {...form.register("webhookUrl")} type="url" autoComplete="off" placeholder="https://discord.com/api/webhooks/..." aria-invalid={Boolean(form.formState.errors.webhookUrl)} /></label>
        </div>
        {form.formState.errors.root?.message ? <p className="error">{form.formState.errors.root.message}</p> : null}
        {success ? <p className="form-message">Discord đã được xác minh và kết nối.</p> : null}
        <button className="primary" disabled={form.formState.isSubmitting || projectKeys.length === 0}>{form.formState.isSubmitting ? "Đang xác minh…" : "Kết nối Discord"}</button>
      </form>
    </FormProvider>
  );
}
