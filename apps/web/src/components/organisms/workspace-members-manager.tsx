"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  MEMBER_PRESENCE,
  MEMBER_INVITATION_STATUSES,
  MEMBER_ROLES,
  type MemberPresence,
} from "@tasks-dash/contracts";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { useState } from "react";
import { MailPlus, RefreshCw, Trash2, UserMinus } from "lucide-react";
import { MemberInfoBadge } from "@/components/molecules/member-info-badge";
import { RoleBadge } from "@/components/molecules/role-badge";
import { SectionHeading } from "@/components/molecules/section-heading";
import { FormCard } from "@/components/organisms/form-card";
import { useMemberInvitations } from "@/features/members/hooks/use-member-invitations";
import {
  ASSIGNABLE_MEMBER_ROLES,
  invitationStatusPresentation,
  roleLabel,
} from "@/features/members/presentation";
import {
  type InviteMemberValues,
  inviteMemberSchema,
} from "@/features/members/schemas/invite-member.schema";
import type {
  MemberProjectSummary,
  WorkspaceInvitationView,
  WorkspaceMemberView,
} from "@/features/members/types";
import { apiRequest } from "@/lib/api/api-request";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspacePresence } from "@/components/layout/jira-app-shell";

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
  const presenceByMemberId = useWorkspacePresence();
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const {
    actionError: invitationActionError,
    busyInvitationId,
    invite,
    inviteError,
    resend,
    revoke,
  } = useMemberInvitations();

  const form = useForm<InviteMemberValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      role: MEMBER_ROLES.viewer,
      projectIds: [],
      allProjects: false,
    },
  });

  async function inviteMember(values: InviteMemberValues): Promise<void> {
    form.clearErrors("root");
    const result = await invite(values);
    if (!result.ok) {
      form.setError("root", { message: result.error });
      return;
    }
    form.reset({
      email: "",
      role: MEMBER_ROLES.viewer,
      projectIds: [],
      allProjects: false,
    });
  }

  async function removeMember(memberId: string): Promise<void> {
    setBusyMemberId(memberId);
    setMemberActionError(null);
    try {
      await apiRequest(`/api/workspace/members/${memberId}`, { method: "DELETE" });
      window.location.reload();
    } catch (error) {
      setMemberActionError(
        error instanceof Error ? error.message : "Không thể gỡ thành viên.",
      );
    } finally {
      setBusyMemberId(null);
    }
  }

  function memberPresence(member: WorkspaceMemberView): MemberPresence {
    return (
      (presenceByMemberId[member._id] as MemberPresence | undefined) ??
      MEMBER_PRESENCE.offline
    );
  }

  const actionError = memberActionError ?? invitationActionError ?? inviteError;

  return (
    <div className="flex flex-col gap-6">
      <FormProvider {...form}>
        {canManage ? (
          <form onSubmit={form.handleSubmit(inviteMember)} noValidate>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="member-role" className="w-full">
                          <SelectValue placeholder="Chọn vai trò" />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSIGNABLE_MEMBER_ROLES.map((role) => (
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
                            const checked = selectedIds.includes(project._id);
                            return (
                              <div key={project._id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`invite-project-${project._id}`}
                                  checked={checked}
                                  onCheckedChange={(nextChecked) => {
                                    form.setValue(
                                      "projectIds",
                                      nextChecked
                                        ? [...selectedIds, project._id]
                                        : selectedIds.filter((id) => id !== project._id),
                                    );
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
              <SectionHeading title="Workspace members" meta={`${members.length} members`} />
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>Chưa có thành viên</EmptyTitle>
                    <EmptyDescription>Mời thành viên đầu tiên vào workspace.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="grid gap-3">
                  {members.map((member) => (
                    <article
                      key={member._id}
                      className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <MemberInfoBadge
                        memberId={member._id}
                        name={member.name}
                        email={member.email}
                        avatarUrl={member.avatarUrl}
                        githubLogin={member.githubLogin}
                        discordUsername={member.discordUsername}
                        presence={memberPresence(member)}
                        avatarClassName="size-10"
                        textClassName="text-sm font-semibold leading-none"
                      />

                      <div className="flex flex-wrap items-center gap-2">
                        <RoleBadge role={member.role} />
                        <Badge variant="outline">{member.status}</Badge>
                        {canManage && member.role !== MEMBER_ROLES.owner ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busyMemberId === member._id}
                            onClick={() => void removeMember(member._id)}
                          >
                            <UserMinus className="size-4" />
                            {busyMemberId === member._id ? "Đang gỡ…" : "Gỡ"}
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
                    <EmptyDescription>Các lời mời workspace sẽ hiển thị tại đây.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="grid gap-3">
                  {invitations.map((invitation) => {
                    const presentation = invitationStatusPresentation(invitation.status);
                    return (
                      <article
                        key={invitation._id}
                        className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-semibold">{invitation.email}</p>
                          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                            <RoleBadge role={invitation.role} />
                            <Badge variant={presentation.variant}>{presentation.label}</Badge>
                          </div>
                        </div>
                        {canManage ? (
                          <div className="flex gap-2">
                            {invitation.status === MEMBER_INVITATION_STATUSES.pending ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busyInvitationId === invitation._id}
                                onClick={() => void resend(invitation._id)}
                              >
                                <RefreshCw className="size-4" /> Gửi lại
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyInvitationId === invitation._id}
                              onClick={() => void revoke(invitation._id)}
                            >
                              <Trash2 className="size-4 text-destructive" /> Xóa
                            </Button>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
