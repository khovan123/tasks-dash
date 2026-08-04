import { IsHexColor, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
export class CreateProjectDto {
  @IsString() @Matches(/^[A-Za-z][A-Za-z0-9]{1,9}$/) key!: string;
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsString() @MaxLength(1000) @IsOptional() description = "";
  @IsHexColor() @IsOptional() color = "#4f46e5";
  @IsString() @IsOptional() leadId?: string;
  @IsString() @Matches(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/) @IsOptional() repositoryFullName?: string;
  @IsString() @MaxLength(256) @IsOptional() driveRootFolderId?: string;
}
