"use client";

import { useEffect, useState } from "react";
import { FolderKanban, Users } from "lucide-react";
import { ProjectMembersManager } from "@/components/organisms/project-members-manager";
import { WorkspaceMembersManager } from "@/components/organisms/workspace-members-manager";
import { ResourceEmptyState } from "@/components/molecules/resource-empty-state";
import { Loading } from "@/components/ui/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  MemberProjectSummary,
  ProjectMemberView,
  ProjectMembersResponse,
  WorkspaceInvitationView,
  WorkspaceMemberView,
} from "@/features/members/types";
import { apiRequest } from "@/lib/api/api-request";
import type { MemberRole } from "@tasks-dash/contracts";
import { MEMBER_ROLES } from "@tasks-dash/contracts";

export function WorkspaceMembersView({
  initialMembers,
  initialInvitations,
  projects,
  currentMemberRole,
}: {
  initialMembers: WorkspaceMemberView[];
  initialInvitations: WorkspaceInvitationView[];
  projects: MemberProjectSummary[];
  currentMemberRole: MemberRole | null;
}) {
  const canManageMembers = currentMemberRole === MEMBER_ROLES.owner;
  const [selectedProjectKey, setSelectedProjectKey] = useState(
    projects[0]?.key ?? "",
  );
  const [projectMembers, setProjectMembers] = useState<ProjectMemberView[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProjectKey) {
      setProjectMembers([]);
      return;
    }

    let cancelled = false;
    async function fetchProjectMembers() {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await apiRequest<ProjectMembersResponse>(
          `/api/projects/${selectedProjectKey}/members`,
        );
        if (!cancelled) setProjectMembers(data.projectMembers);
      } catch (error) {
        if (!cancelled) {
          setProjectMembers([]);
          setLoadError(
            error instanceof Error
              ? error.message
              : "Không thể tải thành viên dự án.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchProjectMembers();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectKey]);

  const selectedProject = projects.find(
    (project) => project.key === selectedProjectKey,
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="workspace" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="workspace" className="gap-2">
            <Users className="size-4" />
            Thành viên Workspace
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-2">
            <FolderKanban className="size-4" />
            Thành viên theo Dự án
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workspace">
          <WorkspaceMembersManager
            members={initialMembers}
            invitations={initialInvitations}
            projects={projects.filter(
              (project): project is MemberProjectSummary & { _id: string } =>
                Boolean(project._id),
            )}
            canManage={canManageMembers}
          />
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <div className="flex max-w-md flex-col gap-2">
            <label className="text-sm font-semibold text-foreground">
              {canManageMembers
                ? "Chọn dự án muốn quản lý thành viên"
                : "Chọn dự án muốn xem danh sách thành viên"}
            </label>
            <Select value={selectedProjectKey} onValueChange={setSelectedProjectKey}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn dự án..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.key} value={project.key}>
                    {project.name} ({project.key})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedProjectKey ? (
            <ResourceEmptyState
              className="mt-4 rounded-xl border border-dashed bg-muted/5 p-8"
              title="Chưa chọn dự án"
              description="Chọn một dự án để xem và cập nhật danh sách thành viên."
            />
          ) : loading ? (
            <Loading message="Đang tải danh sách thành viên dự án..." />
          ) : loadError ? (
            <ResourceEmptyState
              className="mt-4 rounded-xl border border-dashed bg-muted/5 p-8"
              title="Không thể tải thành viên"
              description={loadError}
            />
          ) : selectedProject?._id ? (
            <ProjectMembersManager
              projectKey={selectedProjectKey}
              projectId={selectedProject._id}
              initialProjectMembers={projectMembers}
              workspaceMembers={initialMembers}
              invitations={initialInvitations}
              canManage={canManageMembers}
            />
          ) : (
            <ResourceEmptyState
              className="mt-4 rounded-xl border border-dashed bg-muted/5 p-8"
              title="Thiếu project identifier"
              description="Project chưa có identifier hợp lệ để quản lý invitation."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
