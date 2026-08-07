"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  MEMBER_PRESENCE,
  MEMBER_INVITATION_STATUSES,
  MEMBER_ROLES,
  type MemberPresence,
  type MemberRole,
} from "@tasks-dash/contracts";
import { useRouter } from "next/navigation";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { useState } from "react";
import { MailPlus, RefreshCw, Trash2, UserMinus } from "lucide-react";
import { MemberAvatar } from "@/components/member-avatar";
import { MemberIdentity } from "@/components/member-identity";
import {
  InviteMemberValues,
  inviteMemberSchema,
} from "@/features/members/schemas/invite-member.schema";
import { apiRequest } from "@/lib/api/api-request";
import { FormCard, SectionHeading } from "@/components/layout/app-shell";
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

interface WorkspaceMember {
  _id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: MemberRole;
  status: string;
  githubLogin?: string;
  discordUsername?: string;
  lastLoginAt?: string;
}
interface WorkspaceInvitation {
  _id: string;
  email: string;
  role: MemberRole;
  status: string;
  expiresAt: string;
  lastSentAt?: string;
}

interface Project {
  _id: string;
  key: string;
  name: string;
}

function roleLabel(role: MemberRole): string {
  return role.replaceAll("_", " ");
}

export function WorkspaceMembersManager({
  members,
  invitations,
  projects,
  canManage,
}: {
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
  projects: Project[];
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

  function memberPresence(member: WorkspaceMember): MemberPresence {
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
                  <div className="flex flex-col gap-3 rounded-lg border p-4 bg-muted/10 mt-1.5">
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
                              if (checked) {
                                form.setValue("projectIds", []);
                              }
                            }}
                          />
                        )}
                      />
                      <label
                        htmlFor="invite-all-projects"
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        Tất cả dự án hiện tại đang có
                      </label>
                    </div>

                    {!form.watch("allProjects") && (
                      <div className="border-t pt-3 mt-1">
                        <span className="text-xs font-semibold text-muted-foreground block mb-2">
                          Chọn cụ thể dự án:
                        </span>
                        <div className="grid gap-3 sm:grid-cols-2 max-h-40 overflow-y-auto">
                          {projects.map((project) => {
                            const selectedIds = form.watch("projectIds") || [];
                            const isChecked = selectedIds.includes(project._id);
                            return (
                              <div
                                key={project._id}
                                className="flex items-center gap-2"
                              >
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
                                  className="text-xs font-medium cursor-pointer truncate"
                                >
                                  {project.name} ({project.key})
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
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

      <Card>
        <CardHeader>
          <SectionHeading
            eyebrow="Workspace directory"
            title={canManage ? "Quản lý thành viên" : "Danh sách thành viên"}
            meta={`${members.length + invitations.length} records`}
          />
        </CardHeader>
        <CardContent>
          {!canManage ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => (
                <Card
                  key={member._id}
                  className="overflow-hidden shadow-sm border bg-card text-card-foreground"
                >
                  <CardHeader className="flex flex-row items-center gap-4 pb-4">
                    <MemberIdentity
                      memberId={member._id}
                      name={member.name}
                      avatarUrl={member.avatarUrl}
                      email={member.email}
                      githubLogin={member.githubLogin}
                      discordUsername={member.discordUsername}
                      presence={memberPresence(member)}
                      avatarClassName="size-12"
                      textClassName="text-base font-semibold leading-none"
                    />
                  </CardHeader>
                  <CardContent className="pt-0" />
                </Card>
              ))}
            </div>
          ) : (
            <Tabs defaultValue="members">
              <TabsList>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="invitations">Invitations</TabsTrigger>
              </TabsList>
              <TabsContent value="members">
                <div className="grid gap-3">
                  {members.map((member) => (
                    <article
                      className="grid gap-3 rounded-lg border p-3 md:grid-cols-[minmax(240px,1fr)_auto] md:items-center"
                      key={member._id}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <MemberIdentity
                          memberId={member._id}
                          name={member.name}
                          avatarUrl={member.avatarUrl}
                          email={member.email}
                          githubLogin={member.githubLogin}
                          discordUsername={member.discordUsername}
                          presence={memberPresence(member)}
                          avatarClassName="size-10"
                          textClassName="text-sm font-semibold leading-none"
                        />
                      </div>
                      <div className="flex items-center justify-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          type="button"
                          disabled={
                            !canManage ||
                            busyId === member._id ||
                            member.role === MEMBER_ROLES.owner
                          }
                          onClick={() =>
                            void runAction(member._id, async () => {
                              await apiRequest(
                                `/api/workspace/members/${member._id}`,
                                { method: "DELETE" },
                              );
                            })
                          }
                        >
                          <UserMinus data-icon="inline-start" /> Xóa
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              </TabsContent>
              {canManage ? (
                <TabsContent value="invitations">
                  {invitations.length === 0 ? (
                    <Empty>
                      <EmptyHeader>
                        <EmptyTitle>Chưa có lời mời</EmptyTitle>
                        <EmptyDescription>
                          Invitation mới sẽ xuất hiện tại đây.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <div className="grid gap-3">
                      {invitations.map((invite) => (
                        <article
                          className="grid gap-3 rounded-lg border p-3 md:grid-cols-[minmax(240px,1fr)_auto_auto] md:items-center"
                          key={invite._id}
                        >
                          <div className="flex flex-col gap-1">
                            <strong className="block">{invite.email}</strong>
                            <span className="text-xs text-muted-foreground mt-1">
                              Hết hạn{" "}
                              {new Date(invite.expiresAt).toLocaleString(
                                "vi-VN",
                              )}
                            </span>
                          </div>
                          <Badge
                            variant={
                              invite.status ===
                              MEMBER_INVITATION_STATUSES.accepted
                                ? "success"
                                : invite.status ===
                                    MEMBER_INVITATION_STATUSES.pending
                                  ? "warning"
                                  : invite.status ===
                                      MEMBER_INVITATION_STATUSES.expired
                                    ? "secondary"
                                    : "destructive" // revoked
                            }
                          >
                            {invite.status ===
                            MEMBER_INVITATION_STATUSES.accepted
                              ? "Đã chấp nhận"
                              : invite.status ===
                                  MEMBER_INVITATION_STATUSES.pending
                                ? "Đang chờ"
                                : invite.status ===
                                    MEMBER_INVITATION_STATUSES.expired
                                  ? "Hết hạn"
                                  : "Đã thu hồi"}
                          </Badge>
                          {invite.status ===
                          MEMBER_INVITATION_STATUSES.pending ? (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                disabled={busyId === invite._id}
                                onClick={() =>
                                  void runAction(invite._id, async () => {
                                    await apiRequest(
                                      `/api/workspace/invitations/${invite._id}/resend`,
                                      { method: "POST" },
                                    );
                                  })
                                }
                              >
                                <RefreshCw data-icon="inline-start" /> Gửi lại
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                type="button"
                                disabled={busyId === invite._id}
                                onClick={() =>
                                  void runAction(invite._id, async () => {
                                    await apiRequest(
                                      `/api/workspace/invitations/${invite._id}`,
                                      { method: "DELETE" },
                                    );
                                  })
                                }
                              >
                                <Trash2 data-icon="inline-start" /> Thu hồi
                              </Button>
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ) : null}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
