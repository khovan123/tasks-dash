import { Type } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import {
  PRIORITIES,
  Priority,
  WORK_ITEM_TYPES,
  WorkItemType,
} from "@tasks-dash/contracts";

export class ExternalLinkDto {
  @IsString() @MaxLength(120) @IsOptional() label = "";
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(2048)
  url!: string;
}

export class CreateWorkItemDto {
  @IsIn(Object.values(WORK_ITEM_TYPES)) type!: WorkItemType;
  @IsString() @MinLength(2) @MaxLength(240) summary!: string;
  @IsString() @MaxLength(10_000) @IsOptional() description = "";
  @IsString() @IsOptional() statusId?: string;
  @IsIn(Object.values(PRIORITIES)) priority: Priority = PRIORITIES.medium;
  @IsString() @IsOptional() assigneeId?: string;
  @IsString() @IsOptional() moduleId?: string;
  @IsString() @IsOptional() parentId?: string;
  @IsString() @IsOptional() sprintId?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() labels: string[] = [];
  @Type(() => Number) @IsInt() @Min(0) @Max(100) @IsOptional() storyPoints?: number;
  @IsDateString() @IsOptional() dueDate?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalLinkDto)
  @IsOptional()
  figmaLinks: ExternalLinkDto[] = [];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExternalLinkDto)
  @IsOptional()
  documentLinks: ExternalLinkDto[] = [];
}

export class TransitionWorkItemDto {
  @IsString() statusId!: string;
}

export class ReorderWorkItemsDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  orderedKeys!: string[];
}
