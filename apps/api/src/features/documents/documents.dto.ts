import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateDocumentFolderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(64)
  @IsOptional()
  parentFolderId?: string;
}

export class RenameDocumentFolderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}

export class UploadDocumentDto {
  @IsString()
  @MaxLength(180)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(64)
  @IsOptional()
  folderId?: string;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  description?: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  tags?: string;
}

export class UpdateDocumentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  description?: string;

  @IsString()
  @MaxLength(64)
  @IsOptional()
  folderId?: string;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  @IsOptional()
  tags?: string[];
}
