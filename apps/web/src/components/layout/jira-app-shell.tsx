"use client";

import { MEMBER_ROLES } from "@tasks-dash/contracts";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Check,
  ChevronRight,
  ChevronDown,
  FileArchive,
  Figma,
  FolderKanban,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  Scale,
  User2,
  Users,
  Workflow,
  X,
  Zap,
  Blocks,
} from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import type { WorkspaceOption } from "@/components/workspace-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { NewWorkspaceModal } from "@/components/new-workspace-modal";
import { NewProjectModal } from "@/components/new-project-modal";
import { ProjectLogo } from "@/components/project-logo";
import { WorkspaceLogo } from "@/components/workspace-logo";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

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
] as const;

const PROJECT_LINKS = [
  { suffix: "", label: "Tổng quan", icon: LayoutDashboard },
  { suffix: "/backlog", label: "Backlog", icon: FolderKanban },
  { suffix: "/docs", label: "Tài liệu", icon: FileArchive },
  { suffix: "/designer", label: "Designer", icon: Figma },
  { suffix: "/automations", label: "Automation", icon: Zap },
  { suffix: "/settings", label: "Cài đặt dự án", icon: Settings },
] as const;

const PUBLIC_ROUTES = [
  "/invite",
  "/login",
  "/login/code",
  "/workspaces",
  "/legal",
  "/verify-user",
  "/terms-of-service",
  "/privacy-policy",
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

export function JiraAppShell({
  children,
  session,
  projects,
  workspaces,
}: JiraAppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [projectQuery, setProjectQuery] = useState("");
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(() =>
    [
      "/workspaces",
      "/workspace/members",
      "/settings",
      "/legal",
      "/verify-user",
      "/terms-of-service",
      "/privacy-policy",
    ].some((prefix) => pathname.startsWith(prefix)),
  );
  const [expandedProjects, setExpandedProjects] = useState<
    Record<string, boolean>
  >(() => {
    const match = pathname.match(/^\/projects\/([^/]+)/);
    return match ? { [match[1].toUpperCase()]: true } : {};
  });

  useEffect(() => {
    const match = pathname.match(/^\/projects\/([^/]+)/);
    if (match) {
      const key = match[1].toUpperCase();
      setExpandedProjects((prev) =>
        prev[key] ? prev : { ...prev, [key]: true },
      );
    }
  }, [pathname]);

  const [orderedProjects, setOrderedProjects] =
    useState<JiraShellProject[]>(projects);
  const [draggedProjectKey, setDraggedProjectKey] = useState<string | null>(
    null,
  );

  // Sync projects and restore ordered list from localStorage
  useEffect(() => {
    const storageKey = `tasks-dash:projects-order:${session.workspaceId}`;
    const savedOrder = localStorage.getItem(storageKey);
    if (savedOrder) {
      try {
        const orderedKeys = JSON.parse(savedOrder) as string[];
        const sorted = [...projects].sort((a, b) => {
          const indexA = orderedKeys.indexOf(a.key);
          const indexB = orderedKeys.indexOf(b.key);
          if (indexA === -1 && indexB === -1) return 0;
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        setOrderedProjects(sorted);
        return;
      } catch (err) {
        console.error("Failed to parse projects order", err);
      }
    }
    setOrderedProjects(projects);
  }, [projects, session.workspaceId]);

  function persistProjectOrder(nextProjects: JiraShellProject[]) {
    setOrderedProjects(nextProjects);
    const storageKey = `tasks-dash:projects-order:${session.workspaceId}`;
    localStorage.setItem(
      storageKey,
      JSON.stringify(nextProjects.map((p) => p.key)),
    );
  }

  function handleProjectDragStart(
    event: React.DragEvent<HTMLDivElement>,
    key: string,
  ) {
    setDraggedProjectKey(key);
    event.dataTransfer.setData("text/plain", key);
  }

  function handleProjectDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleProjectDrop(
    event: React.DragEvent<HTMLDivElement>,
    targetKey: string,
  ) {
    event.preventDefault();
    const sourceKey =
      draggedProjectKey ?? event.dataTransfer.getData("text/plain");
    setDraggedProjectKey(null);
    if (!sourceKey || sourceKey === targetKey) return;

    const sourceIndex = orderedProjects.findIndex((p) => p.key === sourceKey);
    const targetIndex = orderedProjects.findIndex((p) => p.key === targetKey);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const next = [...orderedProjects];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    persistProjectOrder(next);
  }

  const activeWorkspace = workspaces.find((workspace) => workspace.active);
  const canManageWorkspace = activeWorkspace?.role === MEMBER_ROLES.owner;
  const filteredProjects = useMemo(() => {
    const query = projectQuery.trim().toLowerCase();
    if (!query) return orderedProjects;
    return orderedProjects.filter(
      (project) =>
        project.key.toLowerCase().includes(query) ||
        project.name.toLowerCase().includes(query),
    );
  }, [projectQuery, orderedProjects]);

  if (PUBLIC_ROUTES.some((prefix) => pathname.startsWith(prefix))) {
    return children;
  }

  const activeProject = projects.find((project) =>
    pathname.startsWith(`/projects/${project.key}`),
  );

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r bg-background text-foreground shadow-xl transition-colors duration-300">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <img
            src="/assets/images/logo.png"
            alt="Tasks Dash Logo"
            className="size-8 rounded-lg object-contain"
          />
          <span className="font-bold text-sm text-foreground tracking-tight">
            Tasks Dash
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Đóng menu"
        >
          <X />
        </Button>
      </div>

      <Separator />

      <div className="flex flex-col gap-3 p-3">
        <WorkspaceSwitcher workspaces={workspaces} compact />
        <Popover open={projectPickerOpen} onOpenChange={setProjectPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={projectPickerOpen}
              className="w-full justify-between"
            >
              <span className="inline-flex min-w-0 items-center gap-2 truncate">
                <Search data-icon="inline-start" />
                {projectQuery ? `Tìm: ${projectQuery}` : "Tìm dự án"}
              </span>
              <ChevronDown
                className={cn(
                  "transition-transform",
                  projectPickerOpen && "rotate-180",
                )}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Tìm theo key hoặc tên…"
                value={projectQuery}
                onValueChange={setProjectQuery}
              />
              <CommandList>
                <CommandEmpty>Không tìm thấy dự án.</CommandEmpty>
                <CommandGroup heading="Projects">
                  {filteredProjects.map((project) => {
                    const isSelected = pathname.startsWith(
                      `/projects/${project.key}`,
                    );
                    return (
                      <CommandItem
                        key={project.key}
                        value={`${project.key} ${project.name}`}
                        onSelect={() => {
                          setProjectPickerOpen(false);
                          setMobileOpen(false);
                          window.location.assign(`/projects/${project.key}`);
                        }}
                      >
                        <ProjectLogo
                          projectKey={project.key}
                          projectName={project.name}
                          size={24}
                          className="size-6 rounded-md"
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {project.name}
                        </span>
                        {isSelected ? <Check className="text-primary" /> : null}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <Separator />

      <nav className="flex flex-col gap-1 px-3 py-3">
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
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between px-6 pb-2 pt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        <span>Dự án</span>
        {canManageWorkspace ? (
          <NewProjectModal
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Tạo dự án"
              >
                <Plus className="size-3.5" />
              </Button>
            }
          />
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3 pb-3">
        <div className="flex flex-col gap-1">
          {filteredProjects.length ? (
            filteredProjects.map((project) => {
              const isSelected = pathname.startsWith(
                `/projects/${project.key}`,
              );
              const isDragging = draggedProjectKey === project.key;
              return (
                <div
                  key={project.key}
                  draggable
                  onDragStart={(e) => handleProjectDragStart(e, project.key)}
                  onDragOver={handleProjectDragOver}
                  onDrop={(e) => handleProjectDrop(e, project.key)}
                  className={cn(
                    "flex items-center gap-1 cursor-grab active:cursor-grabbing transition-opacity",
                    isDragging && "opacity-40",
                  )}
                >
                  <Link
                    href={`/projects/${project.key}`}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex flex-1 items-center gap-3 rounded-md px-3 py-2 text-sm transition min-w-0",
                      isSelected
                        ? "bg-accent font-semibold text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <ProjectLogo
                      projectKey={project.key}
                      projectName={project.name}
                      size={28}
                      className="size-7 rounded-md"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {project.name}
                    </span>
                  </Link>
                </div>
              );
            })
          ) : (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              Không tìm thấy dự án.
            </p>
          )}
        </div>
      </ScrollArea>

      <Separator />

      {/* ── Settings section (Collapsible) ────────────────────────────── */}
      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="h-auto w-full justify-start gap-3 rounded-none px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
          >
            <Settings className="size-3.5" />
            <span className="flex-1 text-left">Cài đặt</span>
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                settingsOpen && "rotate-180",
              )}
            />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="flex flex-col gap-1 px-3 pb-3">
          {/* <NewWorkspaceModal
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
              >
                <Plus className="size-4" />
                Workspace mới
              </Button>
            }
          /> */}

          {(
            [
              {
                href: "/settings/account",
                label: "Tài khoản",
                icon: User2,
              },
              {
                href: "/workspace/members",
                label: "Thành viên",
                icon: Users,
              },
              {
                href: "/settings/integrations",
                label: "Tích hợp",
                icon: Blocks,
              },
              {
                href: "/legal",
                label: "Legal",
                icon: Scale,
              },
            ] as const
          ).filter(link => {
            if (link.href === "/settings/integrations") {
              return canManageWorkspace;
            }
            return true;
          }).map((link) => {
            const selected = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded px-3 py-1.5 text-xs transition",
                  selected
                    ? "bg-accent font-semibold text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {link.label}
              </Link>
            );
          })}
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* ── User profile ────────────────────────────────────────────────── */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-9 border">
            <AvatarImage
              src={session.avatarUrl}
              alt={session.name || session.login}
            />
            <AvatarFallback>
              {initials(session.name || session.login)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {session.name || session.login}
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              <Badge className="text-[10px]" variant="outline">
                {activeWorkspace?.role ?? "MEMBER"}
              </Badge>
            </div>
          </div>
          <LogoutButton className="size-8 px-0" iconOnly />
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        {sidebar}
      </div>

      {mobileOpen ? (
        <>
          <button
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-md lg:hidden"
            aria-label="Đóng menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">{sidebar}</div>
        </>
      ) : null}

      <div className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
          >
            <Menu />
          </Button>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {activeProject ? (
              <>
                <ProjectLogo
                  projectKey={activeProject.key}
                  projectName={activeProject.name}
                  size={40}
                  className="size-10 rounded-full shadow-sm"
                />
                <div className="min-w-0 flex flex-col justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none">
                    PROJECT
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <h2 className="text-base font-extrabold text-foreground leading-tight truncate">
                      {activeProject.name}
                    </h2>
                    <Badge
                      variant="secondary"
                      className="px-1.5 py-0 text-[10px] font-mono h-4 shrink-0"
                    >
                      {activeProject.key}
                    </Badge>
                  </div>
                </div>
              </>
            ) : (
              <>
                {activeWorkspace ? (
                  <WorkspaceLogo
                    workspaceId={activeWorkspace.workspaceId}
                    workspaceName={activeWorkspace.name}
                    size={40}
                    className="size-10 rounded-full shadow-inner"
                  />
                ) : (
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-bold text-sm shadow-inner uppercase">
                    W
                  </div>
                )}
                <div className="min-w-0 flex flex-col justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none">
                    SPACES
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <h2 className="text-base font-extrabold text-foreground leading-tight truncate">
                      {activeWorkspace?.name ?? "Workspace"}
                    </h2>
                  </div>
                </div>
              </>
            )}
          </div>

          <ThemeToggle />
          {canManageWorkspace ? (
            <NewProjectModal
              trigger={
                <Button size="sm">
                  <Plus /> Tạo dự án
                </Button>
              }
            />
          ) : null}
          <Avatar className="size-8 border">
            <AvatarImage
              src={session.avatarUrl}
              alt={session.name || session.login}
            />
            <AvatarFallback>
              {initials(session.name || session.login)}
            </AvatarFallback>
          </Avatar>
        </header>
        <div className="min-w-0">{children}</div>
        <footer className="border-t border-border/70 px-4 py-5 text-sm text-muted-foreground sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>Tasks Dash workspace experience.</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                href="/verify-user"
                className="transition hover:text-foreground"
              >
                Verify User
              </Link>
              <Link
                href="/terms-of-service"
                className="transition hover:text-foreground"
              >
                Terms of Service
              </Link>
              <Link
                href="/privacy-policy"
                className="transition hover:text-foreground"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
