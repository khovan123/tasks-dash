"use client";

import { Avatar, Style } from "@dicebear/core";
import definition from "@dicebear/styles/loops.json";
import { cn } from "@/lib/utils";

const style = new Style(definition);

interface WorkspaceLogoProps {
  workspaceId: string;
  workspaceName: string;
  size?: number;
  className?: string;
}

export function WorkspaceLogo({
  workspaceId,
  workspaceName,
  size = 40,
  className,
}: WorkspaceLogoProps) {
  const avatar = new Avatar(style, {
    seed: `${workspaceId}:${workspaceName}`,
    size,
  });

  return (
    <img
      src={avatar.toDataUri()}
      alt={`${workspaceName} logo`}
      width={size}
      height={size}
      className={cn("shrink-0 select-none", className)}
      draggable={false}
    />
  );
}
