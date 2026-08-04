"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  MEMBER_INVITATION_STATUSES,
  MEMBER_ROLES,
  type MemberRole,
} from "@tasks-dash/contracts";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { useState } from "react";
import { MailPlus, RefreshCw, Trash2, UserMinus } from "lucide-react";
import {
  InviteMemberValues,
  inviteMemberSchema,
} from "@/features/members/schemas/invite-member.schema";
import { apiRequest } from "@/lib/api/api-request";
import { FormCard, SectionHeading } from "@/components/layout/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

interface WorkspaceMember {
  _id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: MemberRole;
  status: string;
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

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function WorkspaceMembersManager({
  members,
  invitations,
}: {
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
}) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const form = useForm<InviteMemberValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: "", role: MEMBER_ROLES.member },
  });

  async function runAction(id: string, action: () => Promise<void>): Promise<void> {
    setBusyId(id);
    setActionError(null);
    try {
      await action();
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Thao tác thất bại.");
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
      form.reset({ email: "", role: MEMBER_ROLES.member });
      router.refresh();
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Không thể gửi lời mời.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(invite)} noValidate>
          <FormCard
            eyebrow="Workspace invitation"
            title="Mời thành viên qua email"
            footer={
              <Button disabled={form.formState.isSubmitting}>
                <MailPlus />
                {form.formState.isSubmitting ? "Đang gửi…" : "Gửi lời mời"}
              </Button>
            }
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="member-email">Email</FieldLabel>
                <Input id="member-email" type="email" {...form.register("email")} placeholder="member@company.com" />
              </Field>
              <Field>
                <FieldLabel htmlFor="member-role">Role</FieldLabel>
                <NativeSelect id="member-role" {...form.register("role")}>
                  {Object.values(MEMBER_ROLES).map((role) => (
                    <NativeSelectOption key={role} value={role}>{role}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </FieldGroup>
            {form.formState.errors.root?.message ? (
              <FieldError>{form.formState.errors.root.message}</FieldError>
            ) : null}
          </FormCard>
        </form>
      </FormProvider>

      {actionError ? (
        <Alert variant="destructive">
          <AlertTitle>Không thể cập nhật thành viên</AlertTitle>
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <SectionHeading eyebrow="Workspace members" title="Thành viên hiện tại" meta={`${members.length} members`} />
        </CardHeader>
        <CardContent className="grid gap-3">
          {members.map((member) => (
            <article className="grid gap-3 rounded-lg border p-3 md:grid-cols-[minmax(240px,1fr)_minmax(150px,220px)_auto_auto] md:items-center" key={member._id}>
              <div className="flex min-w-0 items-center gap-3">
                <Avatar>
                  <AvatarImage src={member.avatarUrl} alt={member.name} />
                  <AvatarFallback>{initials(member.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <strong className="block truncate">{member.name}</strong>
                  <span className="block truncate text-sm text-muted-foreground">{member.email}</span>
                </div>
              </div>
              <NativeSelect
                value={member.role}
                disabled={busyId === member._id}
                onChange={(event) =>
                  void runAction(member._id, async () => {
                    await apiRequest(`/api/workspace/members/${member._id}/role`, {
                      method: "PATCH",
                      body: JSON.stringify({ role: event.target.value as MemberRole }),
                    });
                  })
                }
              >
                {Object.values(MEMBER_ROLES).map((role) => (
                  <NativeSelectOption key={role} value={role}>{role}</NativeSelectOption>
                ))}
              </NativeSelect>
              <Badge variant="info">{member.status}</Badge>
              <Button
                variant="destructive"
                size="sm"
                type="button"
                disabled={busyId === member._id}
                onClick={() =>
                  void runAction(member._id, async () => {
                    await apiRequest(`/api/workspace/members/${member._id}`, { method: "DELETE" });
                  })
                }
              >
                <UserMinus /> Xóa
              </Button>
            </article>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionHeading eyebrow="Invitation queue" title="Lời mời" meta={`${invitations.length} invitations`} />
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Chưa có lời mời</EmptyTitle>
                <EmptyDescription>Invitation mới sẽ xuất hiện tại đây.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-3">
              {invitations.map((invite) => (
                <article className="grid gap-3 rounded-lg border p-3 md:grid-cols-[minmax(240px,1fr)_auto_auto] md:items-center" key={invite._id}>
                  <div>
                    <strong className="block">{invite.email}</strong>
                    <span className="text-sm text-muted-foreground">
                      {invite.role} · hết hạn {new Date(invite.expiresAt).toLocaleString("vi-VN")}
                    </span>
                  </div>
                  <Badge variant={invite.status === MEMBER_INVITATION_STATUSES.pending ? "warning" : "secondary"}>
                    {invite.status}
                  </Badge>
                  {invite.status === MEMBER_INVITATION_STATUSES.pending ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        disabled={busyId === invite._id}
                        onClick={() =>
                          void runAction(invite._id, async () => {
                            await apiRequest(`/api/workspace/invitations/${invite._id}/resend`, { method: "POST" });
                          })
                        }
                      >
                        <RefreshCw /> Gửi lại
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        type="button"
                        disabled={busyId === invite._id}
                        onClick={() =>
                          void runAction(invite._id, async () => {
                            await apiRequest(`/api/workspace/invitations/${invite._id}`, { method: "DELETE" });
                          })
                        }
                      >
                        <Trash2 /> Thu hồi
                      </Button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
