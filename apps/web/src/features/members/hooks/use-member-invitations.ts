"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MemberRole } from "@tasks-dash/contracts";
import { apiRequest } from "@/lib/api/api-request";
import {
  mutationErrorMessage,
  mutationFailure,
  mutationSuccess,
  type MutationResult,
} from "@/lib/api/mutation-result";

export interface InviteMemberPayload {
  email: string;
  role: MemberRole;
  projectIds?: string[];
  allProjects?: boolean;
}

export function useMemberInvitations() {
  const router = useRouter();
  const [busyInvitationId, setBusyInvitationId] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  async function runInvitationAction(
    invitationId: string,
    action: () => Promise<void>,
  ): Promise<MutationResult<void>> {
    setBusyInvitationId(invitationId);
    setActionError(null);
    try {
      await action();
      router.refresh();
      return mutationSuccess(undefined);
    } catch (cause) {
      const message = mutationErrorMessage(cause, "Không thể cập nhật lời mời.");
      setActionError(message);
      return mutationFailure(message);
    } finally {
      setBusyInvitationId(null);
    }
  }

  async function invite(
    payload: InviteMemberPayload,
  ): Promise<MutationResult<void>> {
    setInviting(true);
    setInviteError(null);
    try {
      await apiRequest("/api/workspace/invitations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.refresh();
      return mutationSuccess(undefined);
    } catch (cause) {
      const message = mutationErrorMessage(cause, "Không thể gửi lời mời.");
      setInviteError(message);
      return mutationFailure(message);
    } finally {
      setInviting(false);
    }
  }

  function resend(invitationId: string): Promise<MutationResult<void>> {
    return runInvitationAction(invitationId, async () => {
      await apiRequest(`/api/workspace/invitations/${invitationId}/resend`, {
        method: "POST",
      });
    });
  }

  function revoke(invitationId: string): Promise<MutationResult<void>> {
    return runInvitationAction(invitationId, async () => {
      await apiRequest(`/api/workspace/invitations/${invitationId}`, {
        method: "DELETE",
      });
    });
  }

  function clearErrors(): void {
    setActionError(null);
    setInviteError(null);
  }

  return {
    actionError,
    busyInvitationId,
    clearErrors,
    invite,
    inviteError,
    inviting,
    resend,
    revoke,
    runInvitationAction,
  };
}
