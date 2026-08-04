import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import {
  DESIGN_CATALOG_TYPES,
  DesignCatalogType,
} from "@tasks-dash/contracts";

export class CreateDesignCatalogItemDto {
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsIn(Object.values(DESIGN_CATALOG_TYPES))
  type: DesignCatalogType = DESIGN_CATALOG_TYPES.figmaComponent;
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @Matches(/^https:\/\/(www\.)?figma\.com\//i)
  @MaxLength(2048)
  figmaUrl!: string;
  @IsString() @MaxLength(2000) @IsOptional() description = "";
  @IsArray() @IsString({ each: true }) @IsOptional() tags: string[] = [];
}

export class UpdateDesignCatalogItemDto {
  @IsString() @MinLength(2) @MaxLength(160) @IsOptional() name?: string;
  @IsIn(Object.values(DESIGN_CATALOG_TYPES)) @IsOptional()
  type?: DesignCatalogType;
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @Matches(/^https:\/\/(www\.)?figma\.com\//i)
  @MaxLength(2048)
  @IsOptional()
  figmaUrl?: string;
  @IsString() @MaxLength(2000) @IsOptional() description?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() tags?: string[];
}
