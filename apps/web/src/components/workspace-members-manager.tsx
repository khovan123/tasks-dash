"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  MEMBER_INVITATION_STATUSES,
  MEMBER_ROLES,
  type MemberRole,
} from "@tasks-dash/contracts";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import {
  InviteMemberValues,
  inviteMemberSchema,
} from "@/features/members/schemas/invite-member.schema";
import { apiRequest } from "@/lib/api/api-request";

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

export function WorkspaceMembersManager({
  members,
  invitations,
}: {
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
}) {
  const router = useRouter();
  const form = useForm<InviteMemberValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: "", role: MEMBER_ROLES.member },
  });

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

  async function updateRole(memberId: string, role: MemberRole): Promise<void> {
    await apiRequest(`/api/workspace/members/${memberId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
    router.refresh();
  }

  async function removeMember(memberId: string): Promise<void> {
    await apiRequest(`/api/workspace/members/${memberId}`, { method: "DELETE" });
    router.refresh();
  }

  async function resend(invitationId: string): Promise<void> {
    await apiRequest(`/api/workspace/invitations/${invitationId}/resend`, {
      method: "POST",
    });
    router.refresh();
  }

  async function revoke(invitationId: string): Promise<void> {
    await apiRequest(`/api/workspace/invitations/${invitationId}`, {
      method: "DELETE",
    });
    router.refresh();
  }

  return (
    <>
      <FormProvider {...form}>
        <form className="form-card" onSubmit={form.handleSubmit(invite)} noValidate>
          <div className="section-heading">
            <div><span>WORKSPACE INVITATION</span><h2>Mời thành viên qua email</h2></div>
          </div>
          <div className="form-grid">
            <label>Email<input type="email" {...form.register("email")} placeholder="member@company.com" /></label>
            <label>Role<select {...form.register("role")}>{Object.values(MEMBER_ROLES).map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
          </div>
          {form.formState.errors.root?.message ? <p className="error">{form.formState.errors.root.message}</p> : null}
          <button className="primary" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Đang gửi…" : "Gửi lời mời"}</button>
        </form>
      </FormProvider>

      <section className="data-card">
        <div className="section-heading"><div><span>WORKSPACE MEMBERS</span><h2>Thành viên hiện tại</h2></div><strong>{members.length}</strong></div>
        <div className="member-list">
          {members.map((member) => (
            <article className="member-row" key={member._id}>
              <div className="member-identity">
                {member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : <span className="avatar-placeholder">{member.name.slice(0, 1).toUpperCase()}</span>}
                <div><strong>{member.name}</strong><span>{member.email}</span></div>
              </div>
              <select value={member.role} onChange={(event) => void updateRole(member._id, event.target.value as MemberRole)}>{Object.values(MEMBER_ROLES).map((role) => <option key={role} value={role}>{role}</option>)}</select>
              <span className="status-pill">{member.status}</span>
              <button className="danger-button" type="button" onClick={() => void removeMember(member._id)}>Xóa</button>
            </article>
          ))}
        </div>
      </section>

      <section className="data-card">
        <div className="section-heading"><div><span>INVITATION QUEUE</span><h2>Lời mời</h2></div><strong>{invitations.length}</strong></div>
        {invitations.length === 0 ? <p className="empty-inline">Chưa có lời mời.</p> : <div className="member-list">{invitations.map((invite) => (
          <article className="member-row" key={invite._id}>
            <div><strong>{invite.email}</strong><span>{invite.role} · hết hạn {new Date(invite.expiresAt).toLocaleString("vi-VN")}</span></div>
            <span className="status-pill">{invite.status}</span>
            {invite.status === MEMBER_INVITATION_STATUSES.pending ? <><button className="secondary" type="button" onClick={() => void resend(invite._id)}>Gửi lại</button><button className="danger-button" type="button" onClick={() => void revoke(invite._id)}>Thu hồi</button></> : null}
          </article>
        ))}</div>}
      </section>
    </>
  );
}
