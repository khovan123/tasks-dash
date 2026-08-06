import { Crown, Eye, Palette, FileText, Code2, ShieldAlert } from "lucide-react";
import { MemberRole } from "@tasks-dash/contracts";
import { cn } from "@/lib/utils";

interface RoleBadgeProps {
  role: MemberRole;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  let Icon = Eye;
  let colorClass = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800";
  let label = "Viewer";

  switch (role) {
    case "OWNER":
      Icon = Crown;
      colorClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50";
      label = "Owner";
      break;
    case "DESIGNER":
      Icon = Palette;
      colorClass = "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900/50";
      label = "Designer";
      break;
    case "BA":
      Icon = FileText;
      colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50";
      label = "BA";
      break;
    case "DEV":
      Icon = Code2;
      colorClass = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50";
      label = "Dev";
      break;
    case "VIEWER":
    default:
      Icon = Eye;
      colorClass = "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950/30 dark:text-slate-400 dark:border-slate-800";
      label = "Viewer";
      break;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-all duration-200 shadow-sm",
        colorClass,
        className
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      {label}
    </span>
  );
}
