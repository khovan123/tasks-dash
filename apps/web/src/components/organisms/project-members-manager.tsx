"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  MailPlus,
  RefreshCw,
  Save,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  MEMBER_INVITATION_STATUSES,
  MEMBER_PRESENCE,
  MEMBER_ROLES,
  type MemberRole,
} from "@tasks-dash/contracts";
import { MemberInfoBadge } from "@/components/molecules/member-info-badge";
import { RoleBadge } from "@/components/molecules/role-badge";
import { useMemberInvitations } from "@/features/members/hooks/use-member-invitations";
import type {
  ProjectMemberView,
  WorkspaceInvitationView,
} from "@/features/members/types";
import { apiRequest } from "@/lib/api/api-request";
import { cn } from "@/lib/utils";
import { useWorkspacePresence } from "@/components/layout/jira-app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProjectMembersManagerProps {
  projectKey: string;
  projectId: string;
  initialProjectMembers: ProjectMemberView[];
  workspaceMembers: ProjectMemberView[];
  invitations: WorkspaceInvitationView[];
  canManage: boolean;
}

export function ProjectMembersManager({
  projectKey,
  projectId,
  initialProjectMembers,
  workspaceMembers,
  invitations,
  canManage,
}: ProjectMembersManagerProps) {
  const router = useRouter();
  const presenceByMemberId = useWorkspacePresence();
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialProjectMembers.map((member) => member._id),
  );
  const [saving, setSaving] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [projectActionError, setProjectActionError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>(MEMBER_ROLES.viewer);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const {
    actionError: invitationActionError,
    busyInvitationId,
    clearErrors: clearInvitationErrors,
    invite,
    inviteError,
    inviting,
    resend,
    revoke,
  } = useMemberInvitations();

  function toggleMember(memberId: string) {
    if (!canManage) return;
    const member = workspaceMembers.find((item) => item._id === memberId);
    if (member?.role === MEMBER_ROLES.owner) return;

    setSelectedIds((previous) =>
      previous.includes(memberId)
        ? previous.filter((id) => id !== memberId)
        : [...previous, memberId],
    );
  }

  async function saveProjectMembers(ids: string[]) {
    const ownerIds = workspaceMembers
      .filter((member) => member.role === MEMBER_ROLES.owner)
      .map((member) => member._id);
    const finalIds = Array.from(new Set([...ids, ...ownerIds]));

    setSaving(true);
    setProjectActionError(null);
    try {
      await apiRequest(`/api/projects/${projectKey}/members`, {
        method: "PATCH",
        body: JSON.stringify({ memberIds: finalIds }),
      });
      router.refresh();
    } catch (error) {
      setProjectActionError(
        error instanceof Error ? error.message : "Không thể cập nhật thành viên.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(memberId: string, nextRole: MemberRole) {
    setUpdatingRoleId(memberId);
    setProjectActionError(null);
    try {
      await apiRequest(`/api/projects/${projectKey}/members/${memberId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole }),
      });
      router.refresh();
    } catch (error) {
      setProjectActionError(
        error instanceof Error
          ? error.message
          : "Không thể thay đổi vai trò thành viên.",
      );
    } finally {
      setUpdatingRoleId(null);
    }
  }

  async function handleInviteSubmit(event: React.FormEvent) {
    event.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;

    setInviteSuccess(null);
    const created = await invite({
      email,
      role: inviteRole,
      projectIds: [projectId],
    });
    if (!created) return;

    setInviteSuccess(`Đã gửi lời mời thành công đến ${email}`);
    setInviteEmail("");
    setInviteRole(MEMBER_ROLES.viewer);
    window.setTimeout(() => {
      setInviteOpen(false);
      setInviteSuccess(null);
    }, 1500);
  }

  const projectRolesMap = new Map(
    initialProjectMembers.map((member) => [member._id, member.role]),
  );
  const currentProjectMembers = workspaceMembers
    .filter((member) => selectedIds.includes(member._id))
    .map((member) => ({
      ...member,
      role: projectRolesMap.get(member._id) || member.role,
    }));
  const error = projectActionError ?? invitationActionError;

  return (
    <div className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-sm backdrop-blur-2xl w-full">
      {!canManage ? (
        <div>
          <div className="flex flex-col gap-1.5 mb-5">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Users className="size-4 text-primary" />
              Thành viên dự án ({projectKey})
            </h3>
            <p className="text-xs text-muted-foreground">
              Danh sách thành viên tham gia dự án này.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {initialProjectMembers.map((member) => (
              <Card
                key={member._id}
                className="overflow-hidden shadow-sm border bg-card text-card-foreground gap-0"
              >
                <CardHeader className="flex flex-row items-center gap-4 pb-4">
                  <MemberInfoBadge
                    memberId={member._id}
                    name={member.name}
                    avatarUrl={member.avatarUrl}
                    email={member.email}
                    githubLogin={member.githubLogin}
                    discordUsername={member.discordUsername}
                    presence={
                      presenceByMemberId[member._id] ?? MEMBER_PRESENCE.offline
                    }
                    avatarClassName="size-12"
                    textClassName="text-base font-semibold leading-none"
                  />
                </CardHeader>
                <CardContent className="flex items-center justify-between pt-0">
                  <RoleBadge role={member.role as MemberRole} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1 mb-2">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Users className="size-4 text-primary" />
              Quản lý thành viên dự án
            </h3>
            <p className="text-xs text-muted-foreground">
              Cấu hình quyền, thêm/bớt nhân sự và theo dõi các lời mời của dự án.
            </p>
          </div>

          {error ? <p className="text-xs text-destructive my-2">{error}</p> : null}

          <Tabs defaultValue="members" className="w-full mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b pb-2">
              <TabsList variant="line">
                <TabsTrigger value="members">Thành viên hiện tại</TabsTrigger>
                <TabsTrigger value="manage">Thêm vào dự án</TabsTrigger>
                <TabsTrigger value="invitations">
                  Lời mời đã gửi ({invitations.length})
                </TabsTrigger>
              </TabsList>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 shrink-0 self-start sm:self-center"
                onClick={() => {
                  clearInvitationErrors();
                  setInviteSuccess(null);
                  setInviteOpen(true);
                }}
              >
                <UserPlus className="size-4" />
                Mời thành viên mới
              </Button>
            </div>

            <TabsContent value="members" className="outline-none py-1">
              {currentProjectMembers.length === 0 ? (
                <Empty className="min-h-40 rounded-md border border-dashed bg-background/50">
                  <EmptyHeader>
                    <EmptyTitle>Chưa có thành viên nào</EmptyTitle>
                    <EmptyDescription>
                      Hãy chuyển sang tab "Thêm vào dự án" để chỉ định nhân sự.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="grid gap-3">
                  {currentProjectMembers.map((member) => (
                    <article
                      key={member._id}
                      className="grid gap-3 rounded-lg border bg-background/80 p-3 md:grid-cols-[1fr_auto_auto] md:items-center"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <MemberInfoBadge
                          memberId={member._id}
                          name={member.name}
                          avatarUrl={member.avatarUrl}
                          email={member.email}
                          githubLogin={member.githubLogin}
                          discordUsername={member.discordUsername}
                          presence={
                            presenceByMemberId[member._id] ?? MEMBER_PRESENCE.offline
                          }
                          avatarClassName="size-10"
                          textClassName="text-sm font-semibold leading-none"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-3 min-w-44">
                        {member.role === MEMBER_ROLES.owner ? (
                          <div className="pr-4">
                            <RoleBadge role={member.role as MemberRole} />
                          </div>
                        ) : (
                          <Select
                            value={member.role}
                            disabled={updatingRoleId === member._id}
                            onValueChange={(value) =>
                              void handleRoleChange(member._id, value as MemberRole)
                            }
                          >
                            <SelectTrigger className="w-36 h-8 bg-transparent">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.values(MEMBER_ROLES)
                                .filter((role) => role !== MEMBER_ROLES.owner)
                                .map((role) => (
                                  <SelectItem key={role} value={role}>
                                    <RoleBadge
                                      role={role}
                                      className="border-none shadow-none bg-transparent p-0 dark:bg-transparent"
                                    />
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <div className="flex items-center justify-end">
                        {member.role !== MEMBER_ROLES.owner ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Xóa khỏi dự án"
                            onClick={() => {
                              const nextIds = selectedIds.filter(
                                (id) => id !== member._id,
                              );
                              setSelectedIds(nextIds);
                              void saveProjectMembers(nextIds);
                            }}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : (
                          <div className="size-8" />
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="manage" className="outline-none py-1">
              <div className="grid gap-2 max-h-80 overflow-y-auto pr-1 py-1 my-3 border rounded-lg p-2 bg-muted/10">
                {workspaceMembers.map((member) => {
                  const isOwner = member.role === MEMBER_ROLES.owner;
                  const isChecked = isOwner || selectedIds.includes(member._id);
                  return (
                    <div
                      key={member._id}
                      onClick={() =>
                        canManage && !isOwner && toggleMember(member._id)
                      }
                      className={cn(
                        "flex items-center justify-between p-2 rounded-md transition-colors border border-transparent",
                        canManage && !isOwner
                          ? "hover:bg-accent/50 cursor-pointer"
                          : "opacity-80 cursor-not-allowed",
                        isChecked && "bg-accent/30 border-accent/20",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isChecked}
                          disabled={isOwner || !canManage}
                          onCheckedChange={() =>
                            canManage && !isOwner && toggleMember(member._id)
                          }
                          onClick={(event) => event.stopPropagation()}
                        />
                        <div className="flex flex-col min-w-0">
                          <MemberInfoBadge
                            memberId={member._id}
                            name={member.name}
                            avatarUrl={member.avatarUrl}
                            email={member.email}
                            githubLogin={member.githubLogin}
                            discordUsername={member.discordUsername}
                            avatarClassName="size-8"
                            textClassName="text-sm font-medium leading-none"
                          />
                          <span className="text-xs text-muted-foreground mt-1 flex items-center gap-2 pl-10">
                            <span className="truncate">{member.email}</span>
                            <span>·</span>
                            <RoleBadge
                              role={member.role as MemberRole}
                              className="scale-90 origin-left py-0 px-1 border-none shadow-none bg-transparent dark:bg-transparent"
                            />
                          </span>
                        </div>
                      </div>
                      {isChecked ? (
                        <Check className="size-4 text-primary shrink-0" />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => void saveProjectMembers(selectedIds)}
                  disabled={saving || !canManage}
                >
                  <Save className="size-4" />
                  {saving ? "Đang lưu…" : "Lưu thành viên"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="invitations" className="outline-none py-1">
              {invitations.length === 0 ? (
                <Empty className="min-h-32 rounded-md border border-dashed bg-background/70">
                  <EmptyHeader>
                    <EmptyTitle>Chưa có lời mời</EmptyTitle>
                    <EmptyDescription>
                      Lời mời gửi từ project/workspace sẽ xuất hiện tại đây.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="grid gap-2">
                  {invitations.map((invitation) => (
                    <article
                      key={invitation._id}
                      className="grid gap-3 rounded-md border bg-background/80 p-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
                    >
                      <div className="min-w-0">
                        <strong className="block truncate text-sm">
                          {invitation.email}
                        </strong>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <RoleBadge
                            role={invitation.role}
                            className="border-none shadow-none bg-transparent p-0 dark:bg-transparent"
                          />
                          <span>
                            · hết hạn{" "}
                            {new Date(invitation.expiresAt).toLocaleString("vi-VN")}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={
                          invitation.status === MEMBER_INVITATION_STATUSES.accepted
                            ? "success"
                            : invitation.status === MEMBER_INVITATION_STATUSES.pending
                              ? "warning"
                              : invitation.status === MEMBER_INVITATION_STATUSES.expired
                                ? "secondary"
                                : "destructive"
                        }
                      >
                        {invitation.status === MEMBER_INVITATION_STATUSES.accepted
                          ? "Đã chấp nhận"
                          : invitation.status === MEMBER_INVITATION_STATUSES.pending
                            ? "Đang chờ"
                            : invitation.status === MEMBER_INVITATION_STATUSES.expired
                              ? "Hết hạn"
                              : "Đã thu hồi"}
                      </Badge>
                      {invitation.status === MEMBER_INVITATION_STATUSES.pending ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            disabled={busyInvitationId === invitation._id}
                            onClick={() => void resend(invitation._id)}
                          >
                            <RefreshCw data-icon="inline-start" /> Gửi lại
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            type="button"
                            disabled={busyInvitationId === invitation._id}
                            onClick={() => void revoke(invitation._id)}
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
          </Tabs>

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={(event) => void handleInviteSubmit(event)}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <MailPlus className="size-5 text-primary" />
                    Mời thành viên vào Workspace
                  </DialogTitle>
                  <DialogDescription>
                    Nhập email của người bạn muốn mời. Sau khi họ tham gia
                    workspace, bạn có thể gán họ vào dự án này.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <Field>
                    <FieldLabel htmlFor="invite-email">Email</FieldLabel>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="member@company.com"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="invite-role">Vai trò</FieldLabel>
                    <Select
                      value={inviteRole}
                      onValueChange={(value) => setInviteRole(value as MemberRole)}
                    >
                      <SelectTrigger id="invite-role" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(MEMBER_ROLES)
                          .filter((role) => role !== MEMBER_ROLES.owner)
                          .map((role) => (
                            <SelectItem key={role} value={role}>
                              <RoleBadge
                                role={role}
                                className="border-none shadow-none bg-transparent p-0 dark:bg-transparent"
                              />
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  {inviteError ? (
                    <p className="text-xs font-semibold text-destructive">
                      {inviteError}
                    </p>
                  ) : null}
                  {inviteSuccess ? (
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {inviteSuccess}
                    </p>
                  ) : null}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setInviteOpen(false)}
                    disabled={inviting}
                  >
                    Hủy
                  </Button>
                  <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
                    {inviting ? "Đang gửi…" : "Gửi lời mời"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
