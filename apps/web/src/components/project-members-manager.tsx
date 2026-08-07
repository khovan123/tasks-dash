"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Save,
  Check,
  UserPlus,
  MailPlus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/api/api-request";
import { cn } from "@/lib/utils";
import { useWorkspacePresence } from "@/components/layout/jira-app-shell";
import { MemberAvatar } from "@/components/member-avatar";
import { RoleBadge } from "@/components/role-badge";
import {
  MEMBER_PRESENCE,
  MEMBER_INVITATION_STATUSES,
  MEMBER_ROLES,
  MemberRole,
} from "@tasks-dash/contracts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { MemberIdentity } from "@/components/member-identity";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface Member {
  _id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
  avatarUrl?: string;
  githubLogin?: string;
  discordUsername?: string;
}

interface WorkspaceInvitation {
  _id: string;
  email: string;
  role: MemberRole;
  status: string;
  expiresAt: string;
  lastSentAt?: string;
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProjectMembersManagerProps {
  projectKey: string;
  projectId: string;
  initialProjectMembers: Member[];
  workspaceMembers: Member[];
  invitations: WorkspaceInvitation[];
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
    initialProjectMembers.map((m) => m._id),
  );
  const [saving, setSaving] = useState(false);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Invite Dialog State
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>(MEMBER_ROLES.viewer);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [busyInvitationId, setBusyInvitationId] = useState<string | null>(null);

  function toggleMember(memberId: string) {
    if (!canManage) return;
    const member = workspaceMembers.find((m) => m._id === memberId);
    if (member?.role === "OWNER") return; // Block toggling OWNER role.

    setSelectedIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  }

  async function runInvitationAction(
    invitationId: string,
    action: () => Promise<void>,
  ): Promise<void> {
    setBusyInvitationId(invitationId);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể cập nhật lời mời.",
      );
    } finally {
      setBusyInvitationId(null);
    }
  }

  async function saveProjectMembers(ids: string[]) {
    const ownerIds = workspaceMembers
      .filter((m) => m.role === "OWNER")
      .map((m) => m._id);
    const finalIds = Array.from(new Set([...ids, ...ownerIds]));

    setSaving(true);
    setError(null);
    try {
      await apiRequest(`/api/projects/${projectKey}/members`, {
        method: "PATCH",
        body: JSON.stringify({ memberIds: finalIds }),
      });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể cập nhật thành viên.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(memberId: string, nextRole: MemberRole) {
    setUpdatingRoleId(memberId);
    setError(null);
    try {
      await apiRequest(`/api/projects/${projectKey}/members/${memberId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole }),
      });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể thay đổi vai trò thành viên.",
      );
    } finally {
      setUpdatingRoleId(null);
    }
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteError("Email không được để trống.");
      return;
    }
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      await apiRequest("/api/workspace/invitations", {
        method: "POST",
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          projectIds: [projectId],
        }),
      });
      setInviteSuccess("Đã gửi lời mời thành công đến " + inviteEmail);
      setInviteEmail("");
      setInviteRole(MEMBER_ROLES.viewer);
      router.refresh();
      // Auto close after 1.5s
      setTimeout(() => {
        setInviteOpen(false);
        setInviteSuccess(null);
      }, 1500);
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : "Không thể gửi lời mời.",
      );
    } finally {
      setInviting(false);
    }
  }

  const currentProjectMembers = workspaceMembers.filter((m) =>
    selectedIds.includes(m._id),
  );

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
                      presence={
                        presenceByMemberId[member._id] ??
                        MEMBER_PRESENCE.offline
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
              Cấu hình quyền, thêm/bớt nhân sự và theo dõi các lời mời của dự
              án.
            </p>
          </div>

          {error && <p className="text-xs text-destructive my-2">{error}</p>}

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
                disabled={!canManage}
                onClick={() => {
                  setInviteError(null);
                  setInviteSuccess(null);
                  setInviteOpen(true);
                }}
              >
                <UserPlus className="size-4" />
                Mời thành viên mới
              </Button>
            </div>

            {/* TAB 1: Current Project Members (Editable Roles) */}
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
                        <MemberIdentity
                          memberId={member._id}
                          name={member.name}
                          avatarUrl={member.avatarUrl}
                          email={member.email}
                          githubLogin={member.githubLogin}
                          discordUsername={member.discordUsername}
                          presence={
                            presenceByMemberId[member._id] ??
                            MEMBER_PRESENCE.offline
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
                            onValueChange={(val) =>
                              void handleRoleChange(
                                member._id,
                                val as MemberRole,
                              )
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

            {/* TAB 2: Add Members (Workspace Selection checkboxes) */}
            <TabsContent value="manage" className="outline-none py-1">
              <div className="grid gap-2 max-h-80 overflow-y-auto pr-1 py-1 my-3 border rounded-lg p-2 bg-muted/10">
                {workspaceMembers.map((member) => {
                  const isOwner = member.role === "OWNER";
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
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex flex-col min-w-0">
                          <MemberIdentity
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
                      {isChecked && (
                        <Check className="size-4 text-primary shrink-0" />
                      )}
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

            {/* TAB 3: Invitations list */}
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
                  {invitations.map((invite) => (
                    <article
                      key={invite._id}
                      className="grid gap-3 rounded-md border bg-background/80 p-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center"
                    >
                      <div className="min-w-0">
                        <strong className="block truncate text-sm">
                          {invite.email}
                        </strong>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <RoleBadge
                            role={invite.role}
                            className="border-none shadow-none bg-transparent p-0 dark:bg-transparent"
                          />
                          <span>
                            · hết hạn{" "}
                            {new Date(invite.expiresAt).toLocaleString("vi-VN")}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={
                          invite.status === MEMBER_INVITATION_STATUSES.accepted
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
                        {invite.status === MEMBER_INVITATION_STATUSES.accepted
                          ? "Đã chấp nhận"
                          : invite.status === MEMBER_INVITATION_STATUSES.pending
                            ? "Đang chờ"
                            : invite.status ===
                                MEMBER_INVITATION_STATUSES.expired
                              ? "Hết hạn"
                              : "Đã thu hồi"}
                      </Badge>
                      {invite.status === MEMBER_INVITATION_STATUSES.pending ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            disabled={busyInvitationId === invite._id}
                            onClick={() =>
                              void runInvitationAction(invite._id, async () => {
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
                            disabled={busyInvitationId === invite._id}
                            onClick={() =>
                              void runInvitationAction(invite._id, async () => {
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
          </Tabs>

          {/* Invite Member Dialog */}
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={(e) => void handleInviteSubmit(e)}>
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
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="invite-role">Vai trò</FieldLabel>
                    <Select
                      value={inviteRole}
                      onValueChange={(val) => setInviteRole(val as MemberRole)}
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

                  {inviteError && (
                    <p className="text-xs font-semibold text-destructive">
                      {inviteError}
                    </p>
                  )}
                  {inviteSuccess && (
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {inviteSuccess}
                    </p>
                  )}
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
                  <Button type="submit" disabled={inviting}>
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
