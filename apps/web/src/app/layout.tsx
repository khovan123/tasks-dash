import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  JiraAppShell,
  type JiraShellProject,
  type JiraShellSession,
} from "@/components/layout/jira-app-shell";
import type { WorkspaceOption } from "@/components/workspace-switcher";
import { apiData } from "@/lib/server/api-data";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tasks Dash",
  description: "Production multi-project delivery workspace",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await apiData<JiraShellSession>("/auth/me").catch(() => null);
  let projects: JiraShellProject[] = [];
  let workspaces: WorkspaceOption[] = [];

  if (session) {
    [projects, workspaces] = await Promise.all([
      apiData<JiraShellProject[]>("/projects").catch(() => []),
      apiData<WorkspaceOption[]>("/workspaces").catch(() => []),
    ]);
  }

  return (
    <html lang="vi">
      <body className="min-h-screen bg-background font-sans text-foreground">
        {session ? (
          <JiraAppShell
            session={session}
            projects={projects}
            workspaces={workspaces}
          >
            {children}
          </JiraAppShell>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
