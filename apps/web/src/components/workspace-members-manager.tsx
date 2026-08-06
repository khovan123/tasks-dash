"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  MEMBER_INVITATION_STATUSES,
  MEMBER_ROLES,
  type MemberRole,
} from "@tasks-dash/contracts";
import { useRouter } from "next/navigation";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { useState } from "react";
import { MailPlus, RefreshCw, Trash2, UserMinus } from "lucide-react";
import { RoleBadge } from "@/components/role-badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  canManage,
}: {
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const form = useForm<InviteMemberValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: "", role: MEMBER_ROLES.viewer },
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
      form.reset({ email: "", role: MEMBER_ROLES.viewer });
      router.refresh();
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Không thể gửi lời mời.",
      });
    }
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="member-role" className="w-full">
                          <SelectValue placeholder="Chọn vai trò" />
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
                  />
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
            title="Thành viên và lời mời"
            meta={`${members.length + invitations.length} records`}
          />
        </CardHeader>
        <CardContent>
          {!canManage ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => (
                <Card key={member._id} className="overflow-hidden shadow-sm border bg-card text-card-foreground">
                  <CardHeader className="flex flex-row items-center gap-4 pb-4">
                    <Avatar className="size-12">
                      <AvatarImage src={member.avatarUrl} alt={member.name} />
                      <AvatarFallback>{initials(member.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <strong className="block truncate text-base font-semibold">
                        {member.name}
                      </strong>
                      <span className="block truncate text-sm text-muted-foreground">
                        {member.email}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between pt-0">
                    <RoleBadge role={member.role} />
                    <Badge variant="info">{member.status}</Badge>
                  </CardContent>
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
                      className="grid gap-3 rounded-lg border p-3 md:grid-cols-[minmax(240px,1fr)_minmax(150px,220px)_auto_auto] md:items-center"
                      key={member._id}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.avatarUrl} alt={member.name} />
                          <AvatarFallback>{initials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <strong className="block truncate">
                            {member.name}
                          </strong>
                          <span className="block truncate text-sm text-muted-foreground">
                            {member.email}
                          </span>
                        </div>
                      </div>
                      {member.role === MEMBER_ROLES.owner || !canManage ? (
                        <div className="w-full max-w-55">
                          <RoleBadge role={member.role} />
                        </div>
                      ) : (
                        <Select
                          value={member.role}
                          disabled={busyId === member._id}
                          onValueChange={(val) =>
                            void runAction(member._id, async () => {
                              await apiRequest(
                                `/api/workspace/members/${member._id}/role`,
                                {
                                  method: "PATCH",
                                  body: JSON.stringify({
                                    role: val as MemberRole,
                                  }),
                                },
                              );
                            })
                          }
                        >
                          <SelectTrigger className="w-full">
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
                      <Badge variant="info">{member.status}</Badge>
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
                            <div className="flex items-center gap-2 mt-1">
                              <RoleBadge role={invite.role} />
                              <span className="text-xs text-muted-foreground">
                                · hết hạn{" "}
                                {new Date(invite.expiresAt).toLocaleString(
                                  "vi-VN",
                                )}
                              </span>
                            </div>
                          </div>
                          <Badge
                            variant={
                              invite.status === MEMBER_INVITATION_STATUSES.pending
                                ? "warning"
                                : "secondary"
                            }
                          >
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
