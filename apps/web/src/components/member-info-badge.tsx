"use client";

import type { MemberPresence } from "@tasks-dash/contracts";
import { MemberAvatar } from "@/components/member-avatar";
import { cn } from "@/lib/utils";
import { Github } from "lucide-react";
import { useState } from "react";

interface MemberInfoBadgeProps {
  memberId?: string;
  name: string;
  avatarUrl?: string;
  email?: string;
  presence?: MemberPresence;
  githubLogin?: string;
  discordUsername?: string;
  className?: string;
  avatarClassName?: string;
  textClassName?: string;
}

export function MemberInfoBadge({
  memberId,
  name,
  avatarUrl,
  email,
  presence,
  githubLogin,
  discordUsername,
  className,
  avatarClassName,
  textClassName,
}: MemberInfoBadgeProps) {
  const [copied, setCopied] = useState(false);

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

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <MemberAvatar
        memberId={memberId}
        name={name}
        avatarUrl={avatarUrl}
        presence={presence}
        className={cn("size-5 shrink-0", avatarClassName)}
      />
      <div className="flex flex-col min-w-0">
        <span
          className={cn("truncate font-medium text-foreground", textClassName)}
          title={email ? `${name} • ${email}` : name}
        >
          {name}
        </span>
        {email && (
          <span
            className="truncate text-xs text-muted-foreground mt-0.5 leading-none"
            title={email}
          >
            {email}
          </span>
        )}

        {/* GitHub & Discord Links */}
        {(githubLogin || discordUsername) && (
          <div className="flex items-center gap-2 mt-0.5 text-[10px]">
            {githubLogin && (
              <a
                href={`https://github.com/${githubLogin}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors font-mono"
                title={`GitHub Profile: @${githubLogin}`}
              >
                <Github className="size-3 text-[#24292f] dark:text-white" />
                <span>@{githubLogin}</span>
              </a>
            )}
            {githubLogin && discordUsername && (
              <span className="text-muted-foreground/30">|</span>
            )}
            {discordUsername && (
              <button
                type="button"
                onClick={handleDiscordClick}
                className={cn(
                  "inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors font-mono",
                  copied &&
                    "text-emerald-500 hover:text-emerald-600 font-semibold",
                )}
                title={
                  copied
                    ? "Đã copy!"
                    : `Discord: @${discordUsername} (Click để copy)`
                }
              >
                <svg
                  className={cn(
                    "size-3 fill-current",
                    copied ? "text-emerald-500" : "text-[#5865F2]",
                  )}
                  viewBox="0 0 127.14 96.36"
                >
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.9-.65,1.76-1.34,2.58-2a75.58,75.58,0,0,0,72.76,0c.82.71,1.68,1.4,2.58,2a75.58,75.58,0,0,0,72.76,0c.82.71,1.68,1.4,2.58,2a68.43,68.43,0,0,1-10.5,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31-18.83C130.1,50.22,123.23,27.42,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
                </svg>
                <span>{copied ? "Đã copy!" : `@${discordUsername}`}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </span>
  );
}
