"use client";

import type { MemberPresence } from "@tasks-dash/contracts";
import { Check, Github, MessageCircle } from "lucide-react";
import { useState } from "react";
import { MemberAvatar } from "@/components/molecules/member-avatar";
import { cn } from "@/lib/utils";

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

  async function copyDiscord(event: React.MouseEvent): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
    if (!discordUsername) return;
    try {
      await navigator.clipboard.writeText(discordUsername);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <MemberAvatar
        memberId={memberId}
        name={name}
        avatarUrl={avatarUrl}
        email={email}
        presence={presence}
        githubLogin={githubLogin}
        discordUsername={discordUsername}
        className={cn("size-5 shrink-0", avatarClassName)}
      />
      <span className="flex min-w-0 flex-col">
        <span
          className={cn("truncate font-medium text-foreground", textClassName)}
          title={email ? `${name} • ${email}` : name}
        >
          {name}
        </span>
        {email ? (
          <span className="mt-0.5 truncate text-xs leading-none text-muted-foreground" title={email}>
            {email}
          </span>
        ) : null}
        {githubLogin || discordUsername ? (
          <span className="mt-0.5 flex items-center gap-2 text-[10px]">
            {githubLogin ? (
              <a
                href={`https://github.com/${githubLogin}`}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="inline-flex items-center gap-1 font-mono text-muted-foreground transition-colors hover:text-foreground"
                title={`GitHub Profile: @${githubLogin}`}
              >
                <Github className="size-3" /> @{githubLogin}
              </a>
            ) : null}
            {githubLogin && discordUsername ? (
              <span className="text-muted-foreground/30">|</span>
            ) : null}
            {discordUsername ? (
              <button
                type="button"
                onClick={copyDiscord}
                className={cn(
                  "inline-flex items-center gap-1 font-mono text-muted-foreground transition-colors hover:text-foreground",
                  copied && "font-semibold text-emerald-500",
                )}
                title={copied ? "Đã copy!" : `Discord: @${discordUsername} (Click để copy)`}
              >
                {copied ? <Check className="size-3" /> : <MessageCircle className="size-3" />}
                {copied ? "Đã copy!" : `@${discordUsername}`}
              </button>
            ) : null}
          </span>
        ) : null}
      </span>
    </span>
  );
}
