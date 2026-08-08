import {
  MEMBER_INVITATION_STATUSES,
  MEMBER_ROLES,
  type MemberRole,
} from "@tasks-dash/contracts";

export type InvitationBadgeVariant =
  | "success"
  | "warning"
  | "secondary"
  | "destructive";

export function roleLabel(role: string): string {
  return role.replaceAll("_", " ");
}

export const ASSIGNABLE_MEMBER_ROLES = Object.values(MEMBER_ROLES).filter(
  (role): role is MemberRole => role !== MEMBER_ROLES.owner,
);

export function invitationStatusPresentation(status: string): {
  label: string;
  variant: InvitationBadgeVariant;
} {
  if (status === MEMBER_INVITATION_STATUSES.accepted) {
    return { label: "Đã chấp nhận", variant: "success" };
  }
  if (status === MEMBER_INVITATION_STATUSES.pending) {
    return { label: "Đang chờ", variant: "warning" };
  }
  if (status === MEMBER_INVITATION_STATUSES.expired) {
    return { label: "Hết hạn", variant: "secondary" };
  }
  return { label: "Đã thu hồi", variant: "destructive" };
}
