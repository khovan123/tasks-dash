"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  MEMBER_PRESENCE,
  MEMBER_INVITATION_STATUSES,
  MEMBER_ROLES,
  type MemberPresence,
} from "@tasks-dash/contracts";
import { useRouter } from "next/navigation";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { useState } from "react";
import { MailPlus, RefreshCw, Trash2, UserMinus } from "lucide-react";
import { MemberAvatar } from "@/components/molecules/member-avatar";
import { MemberInfoBadge } from "@/components/molecules/member-info-badge";
import { RoleBadge } from "@/components/role-badge";
import {
  InviteMemberValues,
  inviteMemberSchema,
} from "@/features/members/schemas/invite-member.schema";
import type {
  MemberProjectSummary,
  WorkspaceInvitationView,
  WorkspaceMemberView,
} from "@/features/members/types";
import { apiRequest } from "@/lib/api/api-request";
import { FormCard } from "@/components/organisms/form-card";
import { SectionHeading } from "@/components/molecules/section-heading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useWorkspacePresence } from "@/components/layout/jira-app-shell";

function roleLabel(role: WorkspaceMemberView["role"]): string {
  return role.replaceAll("_", " ");
}

export function WorkspaceMembersManager({
  members,
  invitations,
  projects,
  canManage,
}: {
  members: WorkspaceMemberView[];
  invitations: WorkspaceInvitationView[];
  projects: Array<MemberProjectSummary & { _id: string }>;
  canManage: boolean;
}) {
  const router = useRouter();
  const presenceByMemberId = useWorkspacePresence();
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const form = useForm<InviteMemberValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      role: MEMBER_ROLES.viewer,
      projectIds: [],
      allProjects: false,
    },
  });

  async function runAction(
    id: string,
    action: () => Promise<void>,
  ): Promise<void> {
    setBusyId(id);
    setActionError(null);
    try {
      await action();
      router.refresh();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Thao tác thất bại.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function invite(values: InviteMemberValues): Promise<void> {
    form.clearErrors("root");
    try {
      await apiRequest("/api/workspace/invitations", {
        method: "POST",
        body: JSON.stringify(values),
      });
      form.reset({
        email: "",
        role: MEMBER_ROLES.viewer,
        projectIds: [],
        allProjects: false,
      });
      router.refresh();
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Không thể gửi lời mời.",
      });
    }
  }

  function memberPresence(member: WorkspaceMemberView): MemberPresence {
    return (
      (presenceByMemberId[member._id] as MemberPresence | undefined) ??
      MEMBER_PRESENCE.offline
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <FormProvider {...form}>
        {canManage ? (
          <form onSubmit={form.handleSubmit(invite)} noValidate>
            <FormCard
              eyebrow="Workspace invitation"
              title="Mời thành viên qua email"
              footer={
                <Button disabled={form.formState.isSubmitting}>
                  <MailPlus data-icon="inline-start" />
                  {form.formState.isSubmitting ? "Đang gửi…" : "Gửi lời mời"}
                </Button>
              }
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="member-email">Email</FieldLabel>
                  <Input
                    id="member-email"
                    type="email"
                    {...form.register("email")}
                    placeholder="member@company.com"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="member-role">Vai trò</FieldLabel>
                  <Controller
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger id="member-role" className="w-full">
                          <SelectValue placeholder="Chọn vai trò" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(MEMBER_ROLES)
                            .filter((role) => role !== MEMBER_ROLES.owner)
                            .map((role) => (
                              <SelectItem key={role} value={role}>
                                {roleLabel(role)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>

                <Field className="sm:col-span-2">
                  <FieldLabel>Dự án tham gia</FieldLabel>
                  <div className="mt-1.5 flex flex-col gap-3 rounded-lg border bg-muted/10 p-4">
                    <div className="flex items-center gap-2">
                      <Controller
                        control={form.control}
                        name="allProjects"
                        render={({ field }) => (
                          <Checkbox
                            id="invite-all-projects"
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              if (checked) form.setValue("projectIds", []);
                            }}
                          />
                        )}
                      />
                      <label
                        htmlFor="invite-all-projects"
                        className="cursor-pointer text-sm font-medium leading-none"
                      >
                        Tất cả dự án hiện tại đang có
                      </label>
                    </div>

                    {!form.watch("allProjects") ? (
                      <div className="mt-1 border-t pt-3">
                        <span className="mb-2 block text-xs font-semibold text-muted-foreground">
                          Chọn cụ thể dự án:
                        </span>
                        <div className="grid max-h-40 gap-3 overflow-y-auto sm:grid-cols-2">
                          {projects.map((project) => {
                            const selectedIds = form.watch("projectIds") || [];
                            const isChecked = selectedIds.includes(project._id);
                            return (
                              <div key={project._id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`invite-project-${project._id}`}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      form.setValue("projectIds", [
                                        ...selectedIds,
                                        project._id,
                                      ]);
                                    } else {
                                      form.setValue(
                                        "projectIds",
                                        selectedIds.filter(
                                          (id) => id !== project._id,
                                        ),
                                      );
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`invite-project-${project._id}`}
                                  className="cursor-pointer truncate text-xs font-medium"
                                >
                                  {project.name} ({project.key})
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </Field>
              </FieldGroup>

              {form.formState.errors.root?.message ? (
                <FieldError>{form.formState.errors.root.message}</FieldError>
              ) : null}
            </FormCard>
          </form>
        ) : null}
      </FormProvider>

      {actionError ? (
        <Alert variant="destructive">
          <AlertTitle>Không thể cập nhật thành viên</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Thành viên</TabsTrigger>
          <TabsTrigger value="invitations">Lời mời</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <Card>
            <CardHeader>
              <SectionHeading
                title="Workspace members"
                meta={`${members.length} members`}
              />
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>Chưa có thành viên</EmptyTitle>
                    <EmptyDescription>
                      Mời thành viên đầu tiên vào workspace.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="grid gap-3">
                  {members.map((member) => (
                    <article
                      key={member._id}
                      className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <MemberAvatar
                          memberId={member._id}
                          name={member.name}
                          email={member.email}
                          avatarUrl={member.avatarUrl}
                          githubLogin={member.githubLogin}
                          discordUsername={member.discordUsername}
                          presence={memberPresence(member)}
                          className="size-10"
                        />
                        <div className="min-w-0">
                          <MemberInfoBadge
                            memberId={member._id}
                            name={member.name}
                            email={member.email}
                            avatarUrl={member.avatarUrl}
                            githubLogin={member.githubLogin}
                            discordUsername={member.discordUsername}
                            presence={memberPresence(member)}
                            className="hidden"
                          />
                          <p className="truncate font-semibold">{member.name}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <RoleBadge role={member.role} />
                        <Badge variant="outline">{member.status}</Badge>
                        {canManage && member.role !== MEMBER_ROLES.owner ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busyId === member._id}
                            onClick={() =>
                              void runAction(member._id, () =>
                                apiRequest(`/api/workspace/members/${member._id}`, {
                                  method: "DELETE",
                                }),
                              )
                            }
                          >
                            <UserMinus className="size-4" />
                            Gỡ
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="mt-4">
          <Card>
            <CardHeader>
              <SectionHeading
                title="Pending invitations"
                meta={`${invitations.length} invitations`}
              />
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>Không có lời mời</EmptyTitle>
                    <EmptyDescription>
                      Các lời mời workspace sẽ hiển thị tại đây.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="grid gap-3">
                  {invitations.map((invitation) => (
                    <article
                      key={invitation._id}
                      className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold">{invitation.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {roleLabel(invitation.role)} · {invitation.status}
                        </p>
                      </div>
                      {canManage ? (
                        <div className="flex gap-2">
                          {invitation.status === MEMBER_INVITATION_STATUSES.pending ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busyId === invitation._id}
                              onClick={() =>
                                void runAction(invitation._id, () =>
                                  apiRequest(
                                    `/api/workspace/invitations/${invitation._id}/resend`,
                                    { method: "POST" },
                                  ),
                                )
                              }
                            >
                              <RefreshCw className="size-4" />
                              Gửi lại
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busyId === invitation._id}
                            onClick={() =>
                              void runAction(invitation._id, () =>
                                apiRequest(
                                  `/api/workspace/invitations/${invitation._id}`,
                                  { method: "DELETE" },
                                ),
                              )
                            }
                          >
                            <Trash2 className="size-4 text-destructive" />
                            Xóa
                          </Button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
