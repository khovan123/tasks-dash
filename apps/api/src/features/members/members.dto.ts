import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { MemberRole, MEMBER_ROLES } from "@tasks-dash/contracts";

export class InviteWorkspaceMemberDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsIn(Object.values(MEMBER_ROLES)) role: MemberRole = MEMBER_ROLES.member;
}

export class UpdateWorkspaceMemberRoleDto {
  @IsIn(Object.values(MEMBER_ROLES)) role!: MemberRole;
}

export class CreateWorkspaceDto {
  @IsString() @MinLength(2) @MaxLength(80) workspaceName!: string;
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,47}[a-z0-9]$/)
  @IsOptional()
  workspaceSlug?: string;
}

export class BootstrapWorkspaceDto extends CreateWorkspaceDto {
  @IsEmail() @MaxLength(254) ownerEmail!: string;
}
