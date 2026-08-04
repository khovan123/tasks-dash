"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api/api-request";

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
    <div
      className={compact ? "workspace-switcher compact" : "workspace-switcher"}
      style={{ minWidth: compact ? 190 : 280 }}
    >
      <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <span className="eyebrow">Workspace</span>
        <select
          value={active?.workspaceId ?? ""}
          disabled={busy}
          onChange={(event) => void switchWorkspace(event.target.value)}
          aria-label="Chuyển workspace"
        >
          {workspaces.map((workspace) => (
            <option key={workspace.workspaceId} value={workspace.workspaceId}>
              {workspace.name} · {workspace.role}
            </option>
          ))}
        </select>
      </label>
      {error ? <small className="error">{error}</small> : null}
    </div>
  );
}
