import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ProjectsModule } from "../projects/projects.module";
import { MembersModule } from "../members/members.module";
import { IntegrationsModule } from "../integrations/integrations.module";
import { MemberDocument, MemberSchema } from "../members/member.schema";
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
    forwardRef(() => MembersModule),
    forwardRef(() => IntegrationsModule),
    MongooseModule.forFeature([
      { name: DocumentFolderDocument.name, schema: DocumentFolderSchema },
      { name: DocumentDocument.name, schema: DocumentSchema },
      { name: DocumentVersionDocument.name, schema: DocumentVersionSchema },
      { name: MemberDocument.name, schema: MemberSchema },
    ]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
