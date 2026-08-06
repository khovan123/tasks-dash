"use client";

import { useState, useEffect } from "react";
import { Users, FolderKanban } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkspaceMembersManager } from "@/components/workspace-members-manager";
import { ProjectMembersManager } from "@/components/project-members-manager";
import { apiRequest } from "@/lib/api/api-request";
import { Loading } from "@/components/ui/loading";

interface WorkspaceMember {
  _id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: any;
  status: string;
  lastLoginAt?: string;
}

interface WorkspaceInvitation {
  _id: string;
  email: string;
  role: any;
  status: string;
  expiresAt: string;
  lastSentAt?: string;
}

interface Project {
  _id: string;
  key: string;
  name: string;
  memberIds: string[];
}

interface WorkspaceMembersViewProps {
  initialMembers: WorkspaceMember[];
  initialInvitations: WorkspaceInvitation[];
  projects: Project[];
}

export function WorkspaceMembersView({
  initialMembers,
  initialInvitations,
  projects,
}: WorkspaceMembersViewProps) {
  const [selectedProjectKey, setSelectedProjectKey] = useState<string>(
    projects.length > 0 ? projects[0].key : "",
  );
  const [projectMembers, setProjectMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch project members when selected project changes
  useEffect(() => {
    if (!selectedProjectKey) return;

    async function fetchProjectMembers() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/projects/${selectedProjectKey}/members`,
        );
        const payload = await response.json();
        if (payload && payload.ok && payload.data) {
          setProjectMembers(payload.data.projectMembers || []);
        }
      } catch (err) {
        console.error("Failed to fetch project members:", err);
      } finally {
        setLoading(false);
      }
    }

    void fetchProjectMembers();
  }, [selectedProjectKey]);

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
          />
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <div className="flex flex-col gap-2 max-w-md">
            <label className="text-sm font-semibold text-foreground">
              Chọn dự án muốn quản lý thành viên
            </label>
            <Select
              value={selectedProjectKey}
              onValueChange={setSelectedProjectKey}
            >
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

          {selectedProjectKey ? (
            loading ? (
              <Loading message="Đang tải danh sách thành viên dự án..." />
            ) : (
              <div className="max-w-3xl">
                <ProjectMembersManager
                  projectKey={selectedProjectKey}
                  initialProjectMembers={projectMembers}
                  workspaceMembers={initialMembers as any}
                />
              </div>
            )
          ) : (
            <div className="border border-dashed rounded-xl p-8 text-center text-sm text-muted-foreground bg-muted/5 mt-4">
              Vui lòng chọn một dự án để xem và cập nhật danh sách thành viên.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
