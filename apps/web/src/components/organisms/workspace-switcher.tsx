"use client";

import { MEMBER_ROLES } from "@tasks-dash/contracts";
import { useState } from "react";
import { Check, ChevronsUpDown, LoaderCircle, Plus } from "lucide-react";
import { WorkspaceLogo } from "@/components/atoms/workspace-logo";
import { NewWorkspaceModal } from "@/components/organisms/new-workspace-modal";
import { apiRequest } from "@/lib/api/api-request";
import { mutationErrorMessage } from "@/lib/api/mutation-result";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface WorkspaceOption {
  workspaceId: string;
  name: string;
  slug: string;
  role: string;
  active: boolean;
}

export function WorkspaceSwitcher({
  workspaces,
  compact = false,
  currentRole,
}: {
  workspaces: WorkspaceOption[];
  compact?: boolean;
  currentRole?: string;
}) {
  const active = workspaces.find((workspace) => workspace.active);
  const canCreateWorkspace = active?.role === MEMBER_ROLES.owner;
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function switchWorkspace(workspaceId: string): Promise<void> {
    if (!workspaceId || workspaceId === active?.workspaceId) return;
    setBusy(true);
    setError(null);
    try {
      await apiRequest(`/api/workspaces/${workspaceId}/switch`, {
        method: "POST",
      });
      window.location.assign("/");
    } catch (cause) {
      setBusy(false);
      setOpen(true);
      setError(mutationErrorMessage(cause, "Không thể chuyển workspace."));
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setError(null);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={busy}
          className={cn(
            "w-full justify-between gap-2 overflow-hidden bg-background/60 hover:bg-accent",
            compact ? "h-10 px-3 text-xs" : "h-12 px-3",
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            {active ? (
              <WorkspaceLogo
                workspaceId={active.workspaceId}
                workspaceName={active.name}
                size={24}
                className="size-6 rounded"
              />
            ) : (
              <span className="grid size-6 shrink-0 place-items-center rounded bg-primary/10 text-xs font-black uppercase text-primary">
                W
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground sm:text-sm">
                {active?.name ?? "Chọn workspace"}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {currentRole ?? active?.role ?? "Workspace"}
              </p>
            </div>
          </div>
          {busy ? (
            <LoaderCircle className="size-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground opacity-60" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-64 p-1.5 shadow-xl" align="start" sideOffset={6}>
        <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Workspaces
        </div>
        {error ? (
          <p className="mx-2 my-1 rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
            {error}
          </p>
        ) : null}
        <div className="mt-1 flex flex-col gap-0.5">
          {workspaces.map((workspace) => {
            const isActive = workspace.workspaceId === active?.workspaceId;
            return (
              <button
                key={workspace.workspaceId}
                type="button"
                onClick={() => void switchWorkspace(workspace.workspaceId)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-xs transition hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-accent/70 font-semibold text-foreground",
                )}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <WorkspaceLogo
                    workspaceId={workspace.workspaceId}
                    workspaceName={workspace.name}
                    size={20}
                    className="size-5 rounded"
                  />
                  <p className="truncate font-medium">{workspace.name}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge variant="outline" className="h-4 px-1 py-0 text-[9px]">
                    {isActive ? (currentRole ?? workspace.role) : workspace.role}
                  </Badge>
                  {isActive ? <Check className="size-3.5 text-primary" /> : null}
                </div>
              </button>
            );
          })}
        </div>

        {canCreateWorkspace ? (
          <>
            <Separator className="my-1.5" />
            <NewWorkspaceModal
              trigger={
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
                >
                  <Plus className="size-3.5" />
                  <span>Tạo Workspace mới</span>
                </button>
              }
            />
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
