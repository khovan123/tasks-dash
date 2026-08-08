"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DiscordWorkspaceFormValues } from "@/features/integrations/schemas/discord-workspace-form.schema";
import type {
  DiscordCleanupResult,
  DiscordProvisionResult,
} from "@/features/integrations/types";
import { apiRequest } from "@/lib/api/api-request";
import {
  mutationErrorMessage,
  mutationFailure,
  mutationSuccess,
  type MutationResult,
} from "@/lib/api/mutation-result";

export function useDiscordWorkspaceConfig() {
  const router = useRouter();
  const [configuring, setConfiguring] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function begin(): void {
    setResult(null);
    setError(null);
  }

  async function configure(
    values: DiscordWorkspaceFormValues,
  ): Promise<MutationResult<void>> {
    begin();
    setConfiguring(true);
    try {
      const response = await apiRequest<Partial<DiscordProvisionResult>>(
        "/api/integrations/discord/workspace/configure",
        {
          method: "POST",
          body: JSON.stringify({
            guildId: values.guildId,
            categoryId: values.categoryId || undefined,
            channelNameTemplate: values.channelNameTemplate,
            docsChannelNameTemplate: values.docsChannelNameTemplate,
          }),
        },
      );
      setResult(
        `Đã provision ${response.provisionedProjects?.length ?? 0} project; ${response.failedProjects?.length ?? 0} lỗi.`,
      );
      router.refresh();
      return mutationSuccess(undefined);
    } catch (cause) {
      const message = mutationErrorMessage(
        cause,
        "Không thể cấu hình Discord workspace.",
      );
      setError(message);
      return mutationFailure(message);
    } finally {
      setConfiguring(false);
    }
  }

  async function provisionAll(): Promise<MutationResult<void>> {
    begin();
    setProvisioning(true);
    try {
      const response = await apiRequest<DiscordProvisionResult>(
        "/api/integrations/discord/workspace/provision-all",
        { method: "POST" },
      );
      setResult(
        `Đã kiểm tra ${response.provisionedProjects.length} project; ${response.failedProjects.length} lỗi.`,
      );
      router.refresh();
      return mutationSuccess(undefined);
    } catch (cause) {
      const message = mutationErrorMessage(
        cause,
        "Không thể provision Discord channels.",
      );
      setError(message);
      return mutationFailure(message);
    } finally {
      setProvisioning(false);
    }
  }

  async function cleanChannels(): Promise<MutationResult<void>> {
    begin();
    setCleaning(true);
    try {
      const response = await apiRequest<DiscordCleanupResult>(
        "/api/integrations/discord/workspace/channels",
        { method: "DELETE" },
      );
      setResult(
        `Đã xóa ${response.deletedChannelsCount} kênh và ${response.deletedCategoriesCount} danh mục Discord.`,
      );
      router.refresh();
      return mutationSuccess(undefined);
    } catch (cause) {
      const message = mutationErrorMessage(cause, "Không thể xóa kênh Discord.");
      setError(message);
      return mutationFailure(message);
    } finally {
      setCleaning(false);
    }
  }

  return {
    cleanChannels,
    cleaning,
    configure,
    configuring,
    error,
    provisionAll,
    provisioning,
    result,
  };
}
