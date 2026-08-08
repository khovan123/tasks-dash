import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthOptionCardProps {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  action: string;
  variant?: "primary" | "secondary";
}

export function AuthOptionCard({
  href,
  icon,
  title,
  description,
  action,
  variant = "secondary",
}: AuthOptionCardProps) {
  const primary = variant === "primary";

  return (
    <Link
      href={href}
      className={cn(
        "group rounded-[1.75rem] border px-6 py-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl",
        primary
          ? "border-primary/20 bg-primary text-primary-foreground shadow-[0_20px_50px_rgba(99,102,241,0.28)] hover:bg-primary/95 hover:shadow-[0_26px_60px_rgba(99,102,241,0.34)]"
          : "border-border/80 bg-card/80 text-foreground hover:border-primary/30",
      )}
    >
      <div className="flex items-start gap-4 text-left">
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-2xl ring-1",
            primary
              ? "bg-white/14 ring-white/15"
              : "bg-primary/10 text-primary ring-primary/10",
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold leading-tight">{title}</div>
          <p
            className={cn(
              "mt-2 text-sm leading-6",
              primary ? "text-primary-foreground/78" : "text-muted-foreground",
            )}
          >
            {description}
          </p>
          <span
            className={cn(
              "mt-4 inline-flex items-center gap-2 text-sm font-semibold",
              !primary && "text-primary",
            )}
          >
            {action}
            <ArrowRight className="size-4 transition group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}
