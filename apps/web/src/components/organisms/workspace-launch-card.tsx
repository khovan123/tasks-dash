"use client";

import { useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { WorkspaceLogo } from "@/components/atoms/workspace-logo";
import { apiRequest } from "@/lib/api/api-request";
import { mutationErrorMessage } from "@/lib/api/mutation-result";
import { cn } from "@/lib/utils";

export function WorkspaceLaunchCard({
  workspaceId,
  active,
  workspaceName,
  workspaceSlug,
  workspaceRole,
}: {
  workspaceId: string;
  active: boolean;
  workspaceName: string;
  workspaceSlug: string;
  workspaceRole: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openWorkspace() {
    if (busy) return;
    if (active) {
      window.location.assign("/");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiRequest(`/api/workspaces/${workspaceId}/switch`, {
        method: "POST",
      });
      window.location.assign("/");
    } catch (cause) {
      setBusy(false);
      setError(mutationErrorMessage(cause, "Không thể mở workspace."));
    }
  }

  return (
    <button
      type="button"
      onClick={() => void openWorkspace()}
      disabled={busy}
      className={cn(
        "flex w-full items-center gap-5 rounded-[1.4rem] px-4 py-5 text-left transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70",
        active && "bg-slate-50/80",
      )}
    >
      <WorkspaceLogo
        workspaceId={workspaceId}
        workspaceName={workspaceName}
        size={56}
        className="size-14 rounded-2xl shadow-sm"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h3 className="truncate text-[2rem] font-bold leading-tight text-[#1f2937]">
            {workspaceName}
          </h3>
          {active ? (
            <span className="rounded-full bg-[#dcfce7] px-3 py-1 text-sm font-semibold text-[#15803d]">
              Most active
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {workspaceSlug} · {workspaceRole}
        </p>
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </div>

      <div className="flex size-12 shrink-0 items-center justify-center text-slate-700">
        {busy ? (
          <LoaderCircle className="size-6 animate-spin" />
        ) : (
          <ArrowRight className="size-7" />
        )}
      </div>
    </button>
  );
}
