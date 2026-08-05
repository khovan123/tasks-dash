import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ProjectsModule } from "../projects/projects.module";
import { DocumentsController } from "./documents.controller";
import {
  DocumentDocument,
  DocumentFolderDocument,
  DocumentFolderSchema,
  DocumentSchema,
  DocumentVersionDocument,
  DocumentVersionSchema,
} from "./documents.schema";
import { DocumentsService } from "./documents.service";

@Module({
  imports: [
    ProjectsModule,
    MongooseModule.forFeature([
      { name: DocumentFolderDocument.name, schema: DocumentFolderSchema },
      { name: DocumentDocument.name, schema: DocumentSchema },
      { name: DocumentVersionDocument.name, schema: DocumentVersionSchema },
    ]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
