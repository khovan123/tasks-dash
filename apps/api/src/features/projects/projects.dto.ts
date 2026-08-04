import { IsHexColor, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
export class CreateProjectDto {
  @IsString() @Matches(/^[A-Za-z][A-Za-z0-9]{1,9}$/) key!: string;
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsString() @IsOptional() description = "";
  @IsHexColor() @IsOptional() color = "#4f46e5";
  @IsString() @IsOptional() leadId?: string;
  @IsString() @IsOptional() repositoryFullName?: string;
  @IsString() @IsOptional() driveRootFolderId?: string;
}
