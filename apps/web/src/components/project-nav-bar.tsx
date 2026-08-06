"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderKanban,
  FileArchive,
  Figma,
  Zap,
  Settings,
  LayoutDashboard,
  Kanban,
  Workflow,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PROJECT_NAV_LINKS = [
  { suffix: "", label: "Summary", icon: LayoutDashboard },
  { suffix: "/board", label: "Board", icon: Kanban },
  { suffix: "/backlog", label: "Backlog", icon: FolderKanban },
  { suffix: "/members", label: "Members", icon: Users },
  { suffix: "/docs", label: "Docs", icon: FileArchive },
  { suffix: "/designer", label: "Designer", icon: Figma },
  { suffix: "/automations", label: "Automation", icon: Zap },
  { suffix: "/workflow", label: "Workflow", icon: Workflow },
  { suffix: "/settings", label: "Settings", icon: Settings },
] as const;

export function ProjectNavBar({
  projectKey,
  projectName,
}: {
  projectKey: string;
  projectName: string;
}) {
  const pathname = usePathname();

  return (
    <div className="sticky top-16 z-20 border-b bg-background/85 backdrop-blur-xl px-6 py-4 transition-colors duration-300">
      <div className="flex flex-col gap-4">

        {/* Horizontal Navigation */}
        <nav className="flex items-center gap-2 overflow-x-auto pb-0 scrollbar-none">
          {PROJECT_NAV_LINKS.map((link) => {
            const href = `/projects/${projectKey}${link.suffix}`;
            const isActive = link.suffix
              ? pathname === href
              : pathname === `/projects/${projectKey}`;
            const Icon = link.icon;

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-2 px-3 pt-2 pb-3 text-xs sm:text-sm font-semibold transition-all duration-200 select-none",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2.5px] bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
