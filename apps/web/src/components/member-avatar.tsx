"use client";

import type { MemberPresence } from "@tasks-dash/contracts";
import { useWorkspacePresence } from "@/components/layout/jira-app-shell";
import { MemberPresenceDot } from "@/components/member-presence-dot";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Github } from "lucide-react";
import { useState } from "react";

interface MemberAvatarProps {
  memberId?: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  presence?: MemberPresence | string;
  githubLogin?: string;
  discordUsername?: string;
  className?: string;
  fallbackClassName?: string;
  title?: string;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function MemberAvatar({
  memberId,
  name,
  email,
  avatarUrl,
  presence,
  githubLogin,
  discordUsername,
  className,
  fallbackClassName,
  title,
}: MemberAvatarProps) {
  const presenceByMemberId = useWorkspacePresence();
  const [copied, setCopied] = useState(false);

  const resolvedPresence =
    presence ?? (memberId ? presenceByMemberId[memberId] : undefined);

  const handleDiscordClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!discordUsername) return;
    try {
      await navigator.clipboard.writeText(discordUsername);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy discord username:", err);
    }
  };

  const trigger = (
    <span className="relative inline-flex select-none">
      <Avatar className={className}>
        <AvatarImage src={avatarUrl} alt={name} />
        <AvatarFallback className={cn(fallbackClassName)}>
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      {resolvedPresence ? <MemberPresenceDot status={resolvedPresence} /> : null}
    </span>
  );

  // If no social handles are provided, render static avatar
  if (!githubLogin && !discordUsername) {
    return (
      <span className="relative inline-flex" title={title}>
        {trigger}
      </span>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="relative inline-flex cursor-pointer hover:opacity-85 transition-opacity"
          title={title || `Click xem thông tin ${name}`}
        >
          {trigger}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-3 flex flex-col gap-2 bg-popover/95 backdrop-blur-md shadow-md border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-semibold text-sm truncate text-foreground">{name}</span>
          {email && (
            <span className="text-[11px] text-muted-foreground truncate leading-none mb-1">
              {email}
            </span>
          )}
          {githubLogin && (
            <a
              href={`https://github.com/${githubLogin}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-mono"
            >
              <Github className="size-3.5" />
              <span className="truncate">@{githubLogin}</span>
            </a>
          )}
          {discordUsername && (
            <button
              type="button"
              onClick={handleDiscordClick}
              className={cn(
                "inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-mono text-left",
                copied && "text-emerald-500 hover:text-emerald-600 font-semibold"
              )}
            >
              <svg className="size-3.5 fill-current" viewBox="0 0 127.14 96.36">
                <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.9-.65,1.76-1.34,2.58-2a75.58,75.58,0,0,0,72.76,0c.82.71,1.68,1.4,2.58,2a75.58,75.58,0,0,0,72.76,0c.82.71,1.68,1.4,2.58,2a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C130.1,50.22,123.23,27.42,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
              </svg>
              <span className="truncate">{copied ? "Đã copy!" : `@${discordUsername}`}</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
