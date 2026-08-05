"use client";

import Link from "next/link";
import { useState } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { apiRequest } from "@/lib/api/api-request";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function switchWorkspace(workspaceId: string): Promise<void> {
    if (!workspaceId || workspaceId === active?.workspaceId) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/api/workspaces/${workspaceId}/switch`, {
        method: "POST",
      });
      window.location.assign("/");
    } catch (cause) {
      setBusy(false);
      setError(cause instanceof Error ? cause.message : "Không thể đổi workspace.");
    }
  }

  return (
    <Field className={cn(compact ? "w-full min-w-0" : "w-full min-w-64")}>
      <FieldLabel className={compact ? "sr-only" : undefined}>Workspace</FieldLabel>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <NativeSelect
            value={active?.workspaceId ?? ""}
            disabled={busy}
            onChange={(event) => void switchWorkspace(event.target.value)}
            aria-label="Chuyển workspace"
            className={compact ? "h-8 text-xs" : undefined}
          >
            {workspaces.map((workspace) => (
              <NativeSelectOption
                key={workspace.workspaceId}
                value={workspace.workspaceId}
              >
                {workspace.name} · {workspace.role}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {busy ? (
            <LoaderCircle className="pointer-events-none absolute right-8 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
        </div>
        <Button
          asChild
          type="button"
          variant={compact ? "ghost" : "outline"}
          size={compact ? "icon-sm" : "icon"}
          className="shrink-0"
          title="Tạo workspace mới"
        >
          <Link href="/workspaces/new" aria-label="Tạo workspace mới">
            <Plus />
          </Link>
        </Button>
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}
