import Link from "next/link";
import { ArrowRight, Boxes, LayoutGrid, Sparkles } from "lucide-react";
import { WorkspaceLaunchCard } from "@/components/workspace-launch-card";
import { WorkspaceLogo } from "@/components/workspace-logo";
import type { WorkspaceOption } from "@/components/workspace-switcher";
import { apiData } from "@/lib/server/api-data";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  const workspaces = await apiData<WorkspaceOption[]>("/workspaces");
  const featuredWorkspace =
    workspaces.find((workspace) => workspace.active) ?? workspaces[0] ?? null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fcfbff] text-[#1f2a44]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[45vh] bg-primary" />
        <div className="absolute inset-x-[-10%] top-[34vh] h-64 rounded-[100%] bg-[#fcfbff]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-340 flex-col px-6 py-8 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-sm font-semibold text-white/95"
          >
            <img
              src="/assets/images/logo.png"
              alt="Tasks Dash"
              className="h-10 w-10 rounded-2xl border border-white/20 bg-white/95 object-contain p-1 shadow-[0_8px_20px_rgba(15,23,42,0.16)]"
            />
            <span>Tasks Dash</span>
          </Link>
        </header>

        <section className="mt-8 text-center text-white">
          <h1 className="font-heading text-5xl font-extrabold tracking-tight sm:text-7xl">
            Welcome back
          </h1>
          <p className="mt-3 text-lg text-white/84 sm:text-2xl">
            Choose a workspace to get started.
          </p>
        </section>

        <section className="mx-auto mt-14 grid w-full max-w-7xl gap-8 lg:grid-cols-[minmax(0,1.5fr)_360px] lg:items-start">
          <div className="space-y-5">
            <div className="flex items-center gap-3 text-lg font-semibold text-white">
              <LayoutGrid className="size-5" />
              <span>My workspaces</span>
            </div>

            {workspaces.length ? (
              <div className="overflow-hidden rounded-[1.8rem] border border-black/5 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                <div className="border-b border-slate-200 px-8 py-5">
                  <div className="w-fit border-b-2 border-[#7c3f8c] pb-3 text-2xl font-bold text-[#1f2937]">
                    Workspaces
                  </div>
                  <p className="mt-4 text-xl font-semibold text-slate-500">
                    Ready to launch
                  </p>
                </div>

                <div className="px-6 py-4">
                  <div className="divide-y divide-slate-100">
                    {workspaces.map((workspace) => (
                      <WorkspaceLaunchCard
                        key={workspace.workspaceId}
                        workspaceId={workspace.workspaceId}
                        active={workspace.active}
                        workspaceName={workspace.name}
                        workspaceSlug={workspace.slug}
                        workspaceRole={workspace.role}
                      />
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-200 px-8 py-5">
                  <p className="mt-3 text-lg text-slate-700">
                    Not seeing your workspace?{" "}
                    <Link
                      href="/"
                      className="font-medium text-[#2563eb] transition hover:text-[#1d4ed8]"
                    >
                      Try a different email
                    </Link>
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.8rem] bg-white px-8 py-10 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                <Empty>
                  <Boxes className="size-10 text-primary" />
                  <EmptyHeader>
                    <EmptyTitle>Chưa có workspace</EmptyTitle>
                    <EmptyDescription>
                      Tạo workspace đầu tiên để bắt đầu quản lý dự án.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
