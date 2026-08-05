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
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/\S/, { message: "Workspace name must contain visible characters." })
  workspaceName!: string;

  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,47}[a-z0-9]$/)
  @IsOptional()
  workspaceSlug?: string;
}

export class SetupFirstWorkspaceDto extends CreateWorkspaceDto {
  @IsString()
  @MinLength(32)
  @MaxLength(256)
  setupToken!: string;
}

export class UpdateWorkspaceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/\S/, { message: "Workspace name must contain visible characters." })
  workspaceName!: string;
}

export class DeleteWorkspaceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  confirmWorkspaceName!: string;
}

export class BootstrapWorkspaceDto extends CreateWorkspaceDto {
  @IsEmail() @MaxLength(254) ownerEmail!: string;
}
