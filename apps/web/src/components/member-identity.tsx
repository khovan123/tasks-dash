"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MemberIdentityProps {
  name: string;
  avatarUrl?: string;
  email?: string;
  className?: string;
  avatarClassName?: string;
  textClassName?: string;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function MemberIdentity({
  name,
  avatarUrl,
  email,
  className,
  avatarClassName,
  textClassName,
}: MemberIdentityProps) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <Avatar className={cn("size-5", avatarClassName)}>
        <AvatarImage src={avatarUrl} alt={name} />
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <span className={cn("truncate", textClassName)} title={email ? `${name} • ${email}` : name}>
        {name}
      </span>
    </span>
  );
}
