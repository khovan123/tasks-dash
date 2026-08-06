"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Save, Check, UserPlus, MailPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/api/api-request";
import { cn } from "@/lib/utils";
import { RoleBadge } from "@/components/role-badge";
import { MEMBER_ROLES, MemberRole } from "@tasks-dash/contracts";
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

interface Member {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface ProjectMembersManagerProps {
  projectKey: string;
  initialProjectMembers: Member[];
  workspaceMembers: Member[];
}

export function ProjectMembersManager({
  projectKey,
  initialProjectMembers,
  workspaceMembers,
}: ProjectMembersManagerProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialProjectMembers.map((m) => m._id),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invite Dialog State
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>(MEMBER_ROLES.viewer);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  function toggleMember(memberId: string) {
    const member = workspaceMembers.find((m) => m._id === memberId);
    if (member?.role === "OWNER") return; // Block toggling OWNER role.

    setSelectedIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  }

  async function handleSave() {
    // Ensure all OWNER ids are in the selection list when saving
    const ownerIds = workspaceMembers
      .filter((m) => m.role === "OWNER")
      .map((m) => m._id);
    const finalIds = Array.from(new Set([...selectedIds, ...ownerIds]));

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

  return (
    <div className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-sm backdrop-blur-2xl w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div className="flex flex-col gap-1.5">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Users className="size-4 text-primary" />
            Quản lý thành viên dự án
          </h3>
          <p className="text-xs text-muted-foreground">
            Chỉ các thành viên được chọn dưới đây mới có quyền xem, tạo và gán
            công việc trong dự án này.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 shrink-0 self-start sm:self-center"
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

      <div className="grid gap-2 max-h-80 overflow-y-auto pr-1 py-1 my-3 border rounded-lg p-2 bg-muted/10">
        {workspaceMembers.map((member) => {
          const isOwner = member.role === "OWNER";
          const isChecked = isOwner || selectedIds.includes(member._id);
          return (
            <div
              key={member._id}
              onClick={() => !isOwner && toggleMember(member._id)}
              className={cn(
                "flex items-center justify-between p-2 rounded-md transition-colors border border-transparent",
                !isOwner
                  ? "hover:bg-accent/50 cursor-pointer"
                  : "opacity-80 cursor-not-allowed",
                isChecked && "bg-accent/30 border-accent/20",
              )}
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={isChecked}
                  disabled={isOwner}
                  onCheckedChange={() => !isOwner && toggleMember(member._id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-none">
                    {member.name}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    <span>{member.email}</span>
                    <span>·</span>
                    <RoleBadge role={member.role as MemberRole} className="scale-90 origin-left py-0 px-1 border-none shadow-none bg-transparent dark:bg-transparent" />
                  </span>
                </div>
              </div>
              {isChecked && <Check className="size-4 text-primary shrink-0" />}
            </div>
          );
        })}
      </div>

      {error && <p className="text-xs text-destructive my-2">{error}</p>}

      <div className="flex justify-end mt-2">
        <Button
          size="sm"
          className="gap-2"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          <Save className="size-4" />
          {saving ? "Đang lưu…" : "Lưu thành viên"}
        </Button>
      </div>

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
                Nhập email của người bạn muốn mời. Sau khi họ tham gia workspace, bạn có thể gán họ vào dự án này.
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
                          <RoleBadge role={role} className="border-none shadow-none bg-transparent p-0 dark:bg-transparent" />
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>

              {inviteError && (
                <p className="text-xs font-semibold text-destructive">{inviteError}</p>
              )}
              {inviteSuccess && (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{inviteSuccess}</p>
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
    </div>
  );
}
