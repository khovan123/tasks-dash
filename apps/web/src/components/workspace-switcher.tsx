"use client";

import { MEMBER_ROLES } from "@tasks-dash/contracts";
import { useState } from "react";
import { Check, ChevronsUpDown, LoaderCircle, Plus } from "lucide-react";
import { apiRequest } from "@/lib/api/api-request";
import { NewWorkspaceModal } from "@/components/new-workspace-modal";
import { WorkspaceLogo } from "@/components/workspace-logo";
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
}: {
  workspaces: WorkspaceOption[];
  compact?: boolean;
}) {
  const active = workspaces.find((workspace) => workspace.active);
  const canCreateWorkspace = active?.role === MEMBER_ROLES.owner;
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function switchWorkspace(workspaceId: string): Promise<void> {
    if (!workspaceId || workspaceId === active?.workspaceId) return;
    setBusy(true);
    setOpen(false);
    try {
      await apiRequest(`/api/workspaces/${workspaceId}/switch`, {
        method: "POST",
      });
      window.location.assign("/");
    } catch {
      setBusy(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
              <span className="grid size-6 shrink-0 place-items-center rounded bg-primary/10 text-xs font-black text-primary uppercase">
                W
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-foreground text-xs sm:text-sm">
                {active?.name ?? "Chọn workspace"}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {active?.role ?? "Workspace"}
              </p>
            </div>
          </div>
          {busy ? (
            <LoaderCircle className="size-4 animate-spin text-muted-foreground shrink-0" />
          ) : (
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground opacity-60" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-64 p-1.5 shadow-xl"
        align="start"
        sideOffset={6}
      >
        <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Workspaces
        </div>
        <div className="flex flex-col gap-0.5 mt-1">
          {workspaces.map((ws) => {
            const isActive = ws.workspaceId === active?.workspaceId;
            return (
              <button
                key={ws.workspaceId}
                type="button"
                onClick={() => void switchWorkspace(ws.workspaceId)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-xs transition hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-accent/70 font-semibold text-foreground",
                )}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <WorkspaceLogo
                    workspaceId={ws.workspaceId}
                    workspaceName={ws.name}
                    size={20}
                    className="size-5 rounded"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{ws.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {ws.slug}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                    {ws.role}
                  </Badge>
                  {isActive ? (
                    <Check className="size-3.5 text-primary" />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        <Separator className="my-1.5" />

        {canCreateWorkspace ? (
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
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
