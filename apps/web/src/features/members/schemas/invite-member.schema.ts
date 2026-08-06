import { MEMBER_ROLES, type MemberRole } from "@tasks-dash/contracts";
import { z } from "zod";

const MEMBER_ROLE_VALUES = Object.values(MEMBER_ROLES) as [
  MemberRole,
  ...MemberRole[],
];

export const inviteMemberSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(MEMBER_ROLE_VALUES),
  projectIds: z.array(z.string()).optional(),
  allProjects: z.boolean().optional(),
});

export type InviteMemberValues = z.infer<typeof inviteMemberSchema>;
