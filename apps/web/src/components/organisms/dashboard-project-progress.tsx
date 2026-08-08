import Link from "next/link";
import { FolderKanban, GitPullRequest, TrendingUp } from "lucide-react";
import { NewProjectModal } from "@/components/new-project-modal";
import { ProjectLogo } from "@/components/project-logo";
import { ResourceEmptyState } from "@/components/molecules/resource-empty-state";
import { SectionHeading } from "@/components/molecules/section-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DashboardProject } from "@/features/dashboard/types";

export function DashboardProjectProgress({
  projects,
  canCreateProject,
}: {
  projects: DashboardProject[];
  canCreateProject: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <SectionHeading
          eyebrow="Delivery"
          title="Project progress"
          meta={<TrendingUp className="size-5 text-primary" />}
        />
      </CardHeader>
      <CardContent>
        {projects.length ? (
          <div className="flex flex-col gap-3">
            {projects.map((project) => (
              <Link
                href={`/projects/${project.key}`}
                key={project.key}
                className="block rounded-xl border bg-card p-4 transition hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <ProjectLogo
                    projectKey={project.key}
                    projectName={project.name}
                    size={40}
                    className="size-10 rounded-lg shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="truncate font-semibold">{project.name}</h3>
                      <span className="text-sm font-bold">{project.progress}%</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {project.description || "Chưa có mô tả dự án"}
                    </p>
                  </div>
                </div>
                <Progress value={project.progress} className="mt-3" />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {project.completedItems}/{project.totalItems} completed
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <GitPullRequest className="size-3.5" />
                    {project.openPrItems} linked PRs
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <ResourceEmptyState
            icon={<FolderKanban className="size-9 text-primary" />}
            title="Chưa có dự án"
            description="Tạo dự án đầu tiên để bắt đầu quản lý."
            action={
              canCreateProject ? (
                <NewProjectModal trigger={<Button>Tạo dự án</Button>} />
              ) : undefined
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
