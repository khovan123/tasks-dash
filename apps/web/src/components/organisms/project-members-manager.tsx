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
import {
  ASSIGNABLE_MEMBER_ROLES,
  invitationStatusPresentation,
} from "@/features/members/presentation";
import type {
  ProjectMemberView,
  WorkspaceInvitationView,
} from "@/features/members/types";
import { apiRequest } from "@/lib/api/api-request";
import { useAppSelector } from "@/lib/store/hooks";
import { selectPresence } from "@/lib/store/realtime-slice";
import { cn } from "@/lib/utils";
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
  const presenceByMemberId = useAppSelector(selectPresence);
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
  const invitationsState = useMemberInvitations();

  function toggleMember(memberId: string): void {
    if (!canManage) return;
    const member = workspaceMembers.find((item) => item._id === memberId);
    if (member?.role === MEMBER_ROLES.owner) return;
    setSelectedIds((previous) =>
      previous.includes(memberId)
        ? previous.filter((id) => id !== memberId)
        : [...previous, memberId],
    );
  }

  async function saveProjectMembers(ids: string[]): Promise<void> {
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

  async function handleRoleChange(memberId: string, nextRole: MemberRole): Promise<void> {
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

  async function handleInviteSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;

    setInviteSuccess(null);
    const result = await invitationsState.invite({
      email,
      role: inviteRole,
      projectIds: [projectId],
    });
    if (!result.ok) return;

    setInviteSuccess(`Đã gửi lời mời thành công đến ${email}`);
    setInviteEmail("");
    setInviteRole(MEMBER_ROLES.viewer);
    window.setTimeout(() => {
      setInviteOpen(false);
      setInviteSuccess(null);
    }, 1500);
  }

  const projectRoles = new Map(
    initialProjectMembers.map((member) => [member._id, member.role]),
  );
  const currentProjectMembers = workspaceMembers
    .filter((member) => selectedIds.includes(member._id))
    .map((member) => ({
      ...member,
      role: projectRoles.get(member._id) || member.role,
    }));
  const error = projectActionError ?? invitationsState.actionError;

  if (!canManage) {
    return (
      <div className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-sm">
        <div className="mb-5 flex flex-col gap-1.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Users className="size-4 text-primary" /> Thành viên dự án ({projectKey})
          </h3>
          <p className="text-xs text-muted-foreground">Danh sách thành viên tham gia dự án này.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {initialProjectMembers.map((member) => (
            <Card key={member._id} className="gap-0 overflow-hidden shadow-sm">
              <CardHeader className="flex flex-row items-center gap-4 pb-4">
                <MemberInfoBadge
                  memberId={member._id}
                  name={member.name}
                  avatarUrl={member.avatarUrl}
                  email={member.email}
                  githubLogin={member.githubLogin}
                  discordUsername={member.discordUsername}
                  presence={presenceByMemberId[member._id] ?? MEMBER_PRESENCE.offline}
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
    );
  }

  return (
    <div className="w-full rounded-xl border border-border/70 bg-card/90 p-4 shadow-sm backdrop-blur-2xl">
      <div className="mb-2 flex flex-col gap-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Users className="size-4 text-primary" /> Quản lý thành viên dự án
        </h3>
        <p className="text-xs text-muted-foreground">
          Cấu hình quyền, thêm/bớt nhân sự và theo dõi lời mời của dự án.
        </p>
      </div>

      {error ? <p className="my-2 text-xs text-destructive">{error}</p> : null}

      <Tabs defaultValue="members" className="mt-4 w-full">
        <div className="mb-4 flex flex-col gap-3 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
          <TabsList variant="line">
            <TabsTrigger value="members">Thành viên hiện tại</TabsTrigger>
            <TabsTrigger value="manage">Thêm vào dự án</TabsTrigger>
            <TabsTrigger value="invitations">Lời mời đã gửi ({invitations.length})</TabsTrigger>
          </TabsList>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-2 self-start sm:self-center"
            onClick={() => {
              invitationsState.clearErrors();
              setInviteSuccess(null);
              setInviteOpen(true);
            }}
          >
            <UserPlus className="size-4" /> Mời thành viên mới
          </Button>
        </div>

        <TabsContent value="members" className="py-1 outline-none">
          {currentProjectMembers.length === 0 ? (
            <Empty className="min-h-40 rounded-md border border-dashed bg-background/50">
              <EmptyHeader>
                <EmptyTitle>Chưa có thành viên nào</EmptyTitle>
                <EmptyDescription>
                  Chuyển sang tab "Thêm vào dự án" để chỉ định nhân sự.
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
                  <MemberInfoBadge
                    memberId={member._id}
                    name={member.name}
                    avatarUrl={member.avatarUrl}
                    email={member.email}
                    githubLogin={member.githubLogin}
                    discordUsername={member.discordUsername}
                    presence={presenceByMemberId[member._id] ?? MEMBER_PRESENCE.offline}
                    avatarClassName="size-10"
                    textClassName="text-sm font-semibold leading-none"
                  />
                  <div className="flex min-w-44 items-center justify-end gap-3">
                    {member.role === MEMBER_ROLES.owner ? (
                      <RoleBadge role={member.role as MemberRole} />
                    ) : (
                      <Select
                        value={member.role}
                        disabled={updatingRoleId === member._id}
                        onValueChange={(value) =>
                          void handleRoleChange(member._id, value as MemberRole)
                        }
                      >
                        <SelectTrigger className="h-8 w-36 bg-transparent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSIGNABLE_MEMBER_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              <RoleBadge
                                role={role}
                                className="border-none bg-transparent p-0 shadow-none dark:bg-transparent"
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
                          const nextIds = selectedIds.filter((id) => id !== member._id);
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

        <TabsContent value="manage" className="py-1 outline-none">
          <div className="my-3 grid max-h-80 gap-2 overflow-y-auto rounded-lg border bg-muted/10 p-2 pr-1">
            {workspaceMembers.map((member) => {
              const isOwner = member.role === MEMBER_ROLES.owner;
              const checked = isOwner || selectedIds.includes(member._id);
              return (
                <div
                  key={member._id}
                  onClick={() => !isOwner && toggleMember(member._id)}
                  className={cn(
                    "flex items-center justify-between rounded-md border border-transparent p-2 transition-colors",
                    !isOwner ? "cursor-pointer hover:bg-accent/50" : "cursor-not-allowed opacity-80",
                    checked && "border-accent/20 bg-accent/30",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={checked}
                      disabled={isOwner}
                      onCheckedChange={() => !isOwner && toggleMember(member._id)}
                      onClick={(event) => event.stopPropagation()}
                    />
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
                  </div>
                  {checked ? <Check className="size-4 shrink-0 text-primary" /> : null}
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              className="gap-2"
              onClick={() => void saveProjectMembers(selectedIds)}
              disabled={saving}
            >
              <Save className="size-4" /> {saving ? "Đang lưu…" : "Lưu thành viên"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="invitations" className="py-1 outline-none">
          {invitations.length === 0 ? (
            <Empty className="min-h-32 rounded-md border border-dashed bg-background/70">
              <EmptyHeader>
                <EmptyTitle>Chưa có lời mời</EmptyTitle>
                <EmptyDescription>Lời mời project/workspace sẽ xuất hiện tại đây.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-2">
              {invitations.map((invitation) => {
                const presentation = invitationStatusPresentation(invitation.status);
                return (
                  <article
                    key={invitation._id}
                    className="grid gap-3 rounded-md border bg-background/80 p-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
                  >
                    <div className="min-w-0">
                      <strong className="block truncate text-sm">{invitation.email}</strong>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <RoleBadge role={invitation.role} />
                        <span>
                          hết hạn {new Date(invitation.expiresAt).toLocaleString("vi-VN")}
                        </span>
                      </div>
                    </div>
                    <Badge variant={presentation.variant}>{presentation.label}</Badge>
                    {invitation.status === MEMBER_INVITATION_STATUSES.pending ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={invitationsState.busyInvitationId === invitation._id}
                          onClick={() => void invitationsState.resend(invitation._id)}
                        >
                          <RefreshCw data-icon="inline-start" /> Gửi lại
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={invitationsState.busyInvitationId === invitation._id}
                          onClick={() => void invitationsState.revoke(invitation._id)}
                        >
                          <Trash2 data-icon="inline-start" /> Thu hồi
                        </Button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={(event) => void handleInviteSubmit(event)}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MailPlus className="size-5 text-primary" /> Mời thành viên vào Workspace
              </DialogTitle>
              <DialogDescription>
                Nhập email và vai trò. Lời mời này đồng thời liên kết project hiện tại.
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
                    {ASSIGNABLE_MEMBER_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        <RoleBadge role={role} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {invitationsState.inviteError ? (
                <p className="text-xs font-semibold text-destructive">
                  {invitationsState.inviteError}
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
                disabled={invitationsState.inviting}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={invitationsState.inviting || !inviteEmail.trim()}
              >
                {invitationsState.inviting ? "Đang gửi…" : "Gửi lời mời"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
