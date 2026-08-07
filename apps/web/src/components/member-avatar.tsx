"use client";

import type { MemberPresence } from "@tasks-dash/contracts";
import { useWorkspacePresence } from "@/components/layout/jira-app-shell";
import { MemberPresenceDot } from "@/components/member-presence-dot";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, Github } from "lucide-react";
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
  const normalizedPresence = String(resolvedPresence ?? "").toUpperCase();
  const presenceLabel =
    normalizedPresence === "ONLINE"
      ? "Đang hoạt động"
      : normalizedPresence === "AWAY"
        ? "Tạm vắng"
        : "Ngoại tuyến";
  const presenceTone =
    normalizedPresence === "ONLINE"
      ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
      : normalizedPresence === "AWAY"
        ? "bg-amber-500/12 text-amber-700 dark:text-amber-400"
        : "bg-slate-500/12 text-slate-600 dark:text-slate-400";

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
        className="w-84 rounded-[28px] border-border/70 bg-card/98 p-0 shadow-[0_18px_45px_-20px_rgba(15,23,42,0.28)] backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-[28px] bg-linear-to-br from-card via-card to-secondary/35 p-4">
          <div className="mb-3 flex items-start gap-3">
            <div className="relative shrink-0">
              <Avatar className="size-15 ring-1 ring-border/60 shadow-sm">
                <AvatarImage src={avatarUrl} alt={name} />
                <AvatarFallback className="text-sm font-bold">
                  {initials(name)}
                </AvatarFallback>
              </Avatar>
              {resolvedPresence ? <MemberPresenceDot status={resolvedPresence} /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Workspace Member
              </p>
              <p className="mt-1 truncate text-lg font-bold text-foreground">
                {name}
              </p>
              {email ? (
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {email}
                </p>
              ) : null}
              {resolvedPresence ? (
                <span
                  className={cn(
                    "mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    presenceTone,
                  )}
                >
                  {presenceLabel}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2">
            {githubLogin ? (
              <a
                href={`https://github.com/${githubLogin}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 px-3.5 py-3 transition hover:border-primary/25 hover:bg-accent/35"
              >
                <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#24292f] text-white dark:bg-white dark:text-[#24292f] shadow-sm">
                  <Github className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    GitHub
                  </p>
                  <p className="truncate font-mono text-sm text-foreground">
                    @{githubLogin}
                  </p>
                </div>
              </a>
            ) : null}

            {discordUsername ? (
              <button
                type="button"
                onClick={handleDiscordClick}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-background/70 px-3.5 py-3 text-left transition hover:border-primary/25 hover:bg-accent/35",
                  copied && "border-emerald-500/25 bg-emerald-500/5",
                )}
              >
                <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#5865F2] text-white shadow-sm">
                  <svg className="size-4 fill-current" viewBox="0 0 127.14 96.36">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.9-.65,1.76-1.34,2.58-2a75.58,75.58,0,0,0,72.76,0c.82.71,1.68,1.4,2.58,2a75.58,75.58,0,0,0,72.76,0c.82.71,1.68,1.4,2.58,2a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C130.1,50.22,123.23,27.42,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Discord
                  </p>
                  <p className="truncate font-mono text-sm text-foreground">
                    @{discordUsername}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold",
                    copied
                      ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {copied ? <Check className="size-3.5" /> : null}
                  {copied ? "Copied" : "Copy"}
                </span>
              </button>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
