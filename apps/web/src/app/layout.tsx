import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import {
  JiraAppShell,
  type JiraShellProject,
  type JiraShellSession,
} from "@/components/layout/jira-app-shell";
import { Toaster } from "@/components/ui/sonner";
import type { WorkspaceOption } from "@/components/workspace-switcher";
import { apiData } from "@/lib/server/api-data";
import "./globals.css";

const metadataBase = (() => {
  const configuredUrl =
    process.env.WEB_APP_URL ||
    process.env.NEXT_PUBLIC_WEB_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  if (!configuredUrl) {
    return new URL("http://localhost:3000");
  }

  const normalizedUrl = configuredUrl.startsWith("http")
    ? configuredUrl
    : `https://${configuredUrl}`;

  try {
    return new URL(normalizedUrl);
  } catch {
    return new URL("http://localhost:3000");
  }
})();

export const metadata: Metadata = {
  title: "Tasks Dash",
  description: "Production multi-project delivery workspace",
  applicationName: "Tasks Dash",
  metadataBase,
  icons: {
    icon: [
      { url: "/assets/images/logo.png", type: "image/png" },
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/assets/images/logo.png",
    apple: "/assets/images/logo.png",
  },
  openGraph: {
    title: "Tasks Dash",
    description: "Production multi-project delivery workspace",
    images: [{ url: "/assets/images/logo.png" }],
  },
  other: {
    "tasks-dash-legal-hub-url": "/legal",
    "tasks-dash-verify-user-url": "/verify-user",
    "tasks-dash-terms-of-service-url": "/terms-of-service",
    "tasks-dash-privacy-policy-url": "/privacy-policy",
  },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore.has("tasks_dash_session");
  const session = hasSessionCookie
    ? await apiData<JiraShellSession>("/auth/me").catch(() => null)
    : null;
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
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
        <Toaster />
      </body>
    </html>
  );
}
