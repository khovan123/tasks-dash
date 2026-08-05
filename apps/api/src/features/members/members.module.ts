import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { InvitationMailerService } from "./invitation-mailer.service";
import { MemberDocument, MemberSchema } from "./member.schema";
import { MembersController } from "./members.controller";
import { MembersService } from "./members.service";
import { WorkspaceLifecycleService } from "./workspace-lifecycle.service";
import {
  WorkspaceInvitationDocument,
  WorkspaceInvitationSchema,
} from "./workspace-invitation.schema";
import { WorkspaceDocument, WorkspaceSchema } from "./workspace.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MemberDocument.name, schema: MemberSchema },
      {
        name: WorkspaceInvitationDocument.name,
        schema: WorkspaceInvitationSchema,
      },
      { name: WorkspaceDocument.name, schema: WorkspaceSchema },
    ]),
  ],
  controllers: [MembersController],
  providers: [
    MembersService,
    WorkspaceLifecycleService,
    InvitationMailerService,
  ],
  exports: [MembersService, WorkspaceLifecycleService, MongooseModule],
})
export class MembersModule {}
