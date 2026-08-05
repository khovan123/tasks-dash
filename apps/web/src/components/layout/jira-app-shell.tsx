"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ChevronRight,
  FileArchive,
  Figma,
  FolderKanban,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  Users,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import type { WorkspaceOption } from "@/components/workspace-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface JiraShellSession {
  name: string;
  login: string;
  email: string;
  avatarUrl: string;
  workspaceId: string;
}

export interface JiraShellProject {
  key: string;
  name: string;
  color?: string;
}

interface JiraAppShellProps {
  children: ReactNode;
  session: JiraShellSession;
  projects: JiraShellProject[];
  workspaces: WorkspaceOption[];
}

const GLOBAL_LINKS = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard, exact: true },
  { href: "/workspaces", label: "Workspaces", icon: Workflow },
  { href: "/workspace/members", label: "Thành viên", icon: Users },
  { href: "/settings/integrations", label: "Tích hợp", icon: Settings },
] as const;

const PROJECT_LINKS = [
  { suffix: "", label: "Tổng quan", icon: LayoutDashboard },
  { suffix: "/backlog", label: "Backlog", icon: FolderKanban },
  { suffix: "/docs", label: "Tài liệu", icon: FileArchive },
  { suffix: "/designer", label: "Designer", icon: Figma },
  { suffix: "/automations", label: "Automation", icon: Zap },
] as const;

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function routeLabel(pathname: string, projects: JiraShellProject[]): string {
  if (pathname === "/") return "Portfolio overview";
  if (pathname === "/workspaces") return "Workspace management";
  if (pathname.startsWith("/workspace/members")) return "Workspace members";
  if (pathname.startsWith("/settings")) return "Integrations";
  const project = projects.find((item) => pathname.startsWith(`/projects/${item.key}`));
  if (!project) return "Tasks Dash";
  if (pathname.endsWith("/backlog")) return `${project.key} · Backlog`;
  if (pathname.endsWith("/docs")) return `${project.key} · Documents`;
  if (pathname.endsWith("/designer")) return `${project.key} · Designer`;
  if (pathname.endsWith("/automations")) return `${project.key} · Automation`;
  return `${project.key} · Project overview`;
}

export function JiraAppShell({
  children,
  session,
  projects,
  workspaces,
}: JiraAppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [projectQuery, setProjectQuery] = useState("");
  const activeWorkspace = workspaces.find((workspace) => workspace.active);
  const filteredProjects = useMemo(() => {
    const query = projectQuery.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter(
      (project) =>
        project.key.toLowerCase().includes(query) ||
        project.name.toLowerCase().includes(query),
    );
  }, [projectQuery, projects]);

  if (pathname.startsWith("/invite")) return children;

  const activeProject = projects.find((project) =>
    pathname.startsWith(`/projects/${project.key}`),
  );

  const sidebar = (
    <aside className="flex h-full w-72 flex-col bg-slate-950 text-slate-200 shadow-2xl shadow-slate-950/25">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <div className="grid size-9 place-items-center rounded-lg bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
          <Boxes className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-white">Tasks Dash</p>
          <p className="truncate text-[11px] text-slate-400">
            {activeWorkspace?.name ?? "Workspace"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Đóng menu"
        >
          <X />
        </Button>
      </div>

      <div className="space-y-3 border-b border-white/10 p-3">
        <WorkspaceSwitcher workspaces={workspaces} compact />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={projectQuery}
            onChange={(event) => setProjectQuery(event.target.value)}
            placeholder="Tìm dự án…"
            className="h-9 border-white/10 bg-white/5 pl-9 text-slate-100 placeholder:text-slate-500 focus-visible:border-indigo-400"
          />
        </div>
      </div>

      <nav className="space-y-1 px-3 py-3">
        {GLOBAL_LINKS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-indigo-500 text-white shadow-sm"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between px-6 pb-2 pt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
        <span>Dự án</span>
        <Link
          href="/#create-project"
          onClick={() => setMobileOpen(false)}
          className="rounded p-1 transition hover:bg-white/10 hover:text-white"
          aria-label="Tạo dự án"
        >
          <Plus className="size-3.5" />
        </Link>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        {filteredProjects.length ? (
          filteredProjects.map((project) => {
            const active = pathname.startsWith(`/projects/${project.key}`);
            return (
              <div key={project.key}>
                <Link
                  href={`/projects/${project.key}`}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
                    active
                      ? "bg-white/10 text-white"
                      : "text-slate-300 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <span
                    className="grid size-7 shrink-0 place-items-center rounded-md text-[10px] font-black text-white"
                    style={{ backgroundColor: project.color ?? "#4f46e5" }}
                  >
                    {project.key.slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{project.name}</span>
                  <ChevronRight
                    className={cn("size-3.5 text-slate-600 transition", active && "rotate-90 text-slate-400")}
                  />
                </Link>
                {active ? (
                  <div className="ml-6 mt-1 space-y-0.5 border-l border-white/10 pl-3">
                    {PROJECT_LINKS.map((link) => {
                      const href = `/projects/${project.key}${link.suffix}`;
                      const selected = link.suffix
                        ? pathname === href
                        : pathname === `/projects/${project.key}`;
                      const Icon = link.icon;
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-2 rounded px-2 py-1.5 text-xs transition",
                            selected
                              ? "bg-indigo-500/20 font-semibold text-indigo-200"
                              : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                          )}
                        >
                          <Icon className="size-3.5" />
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })
        ) : (
          <p className="px-3 py-4 text-sm text-slate-500">Không tìm thấy dự án.</p>
        )}
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-9 border border-white/10">
            <AvatarImage src={session.avatarUrl} alt={session.name || session.login} />
            <AvatarFallback>{initials(session.name || session.login)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {session.name || session.login}
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              <Badge className="border-white/10 bg-white/10 text-[10px] text-slate-300" variant="outline">
                {activeWorkspace?.role ?? "MEMBER"}
              </Badge>
            </div>
          </div>
          <LogoutButton className="size-8 px-0 text-slate-400 hover:bg-white/10 hover:text-white" iconOnly />
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">{sidebar}</div>

      {mobileOpen ? (
        <>
          <button
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
            aria-label="Đóng menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">{sidebar}</div>
        </>
      ) : null}

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
          >
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {routeLabel(pathname, projects)}
            </p>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {activeProject
                ? `${activeProject.name} · ${activeWorkspace?.name ?? session.workspaceId}`
                : activeWorkspace?.name ?? session.workspaceId}
            </p>
          </div>
          <div className="hidden sm:block">
            <WorkspaceSwitcher workspaces={workspaces} compact />
          </div>
          <Button asChild size="sm">
            <Link href="/#create-project">
              <Plus /> Tạo dự án
            </Link>
          </Button>
          <Avatar className="size-8 border">
            <AvatarImage src={session.avatarUrl} alt={session.name || session.login} />
            <AvatarFallback>{initials(session.name || session.login)}</AvatarFallback>
          </Avatar>
        </header>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
