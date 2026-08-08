"use client";

import {
  MEMBER_PRESENCE,
  type MemberPresence,
} from "@tasks-dash/contracts";
import { cn } from "@/lib/utils";

export function MemberPresenceDot({
  status,
  className,
}: {
  status: MemberPresence | string;
  className?: string;
}) {
  const normalizedStatus = String(status).toUpperCase() as MemberPresence;
  const tone =
    normalizedStatus === MEMBER_PRESENCE.online
      ? "bg-emerald-500"
      : normalizedStatus === MEMBER_PRESENCE.away
        ? "bg-amber-500"
        : "bg-slate-300";

  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute -bottom-[4%] -right-[4%] size-[clamp(0.45rem,34%,0.95rem)] rounded-full border-2 border-background shadow-sm",
        tone,
        className,
      )}
    />
  );
}
