import { Type } from "class-transformer";
import { IsArray, IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import { PRIORITIES, Priority, WORK_ITEM_TYPES, WorkItemType } from "@tasks-dash/contracts";

export class CreateWorkItemDto {
  @IsIn(Object.values(WORK_ITEM_TYPES)) type!: WorkItemType;
  @IsString() @MinLength(2) summary!: string;
  @IsString() @IsOptional() description = "";
  @IsString() statusId!: string;
  @IsIn(Object.values(PRIORITIES)) priority: Priority = PRIORITIES.medium;
  @IsString() @IsOptional() assigneeId?: string;
  @IsString() @IsOptional() moduleId?: string;
  @IsString() @IsOptional() parentId?: string;
  @IsString() @IsOptional() sprintId?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() labels: string[] = [];
  @Type(() => Number) @IsInt() @Min(0) @Max(100) @IsOptional() storyPoints?: number;
  @IsDateString() @IsOptional() dueDate?: string;
}

export class TransitionWorkItemDto { @IsString() statusId!: string; }
