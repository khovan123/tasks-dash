import { Module, forwardRef } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { MongooseModule } from "@nestjs/mongoose";
import { ProjectDocument, ProjectSchema } from "./project.schema";
import { ProjectRealtimeService } from "./project-realtime.service";
import { CreateProjectHandler, ListProjectsHandler } from "./projects.cqrs";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";
import { MembersModule } from "../members/members.module";
import { IntegrationsModule } from "../integrations/integrations.module";

@Module({
  imports: [
    CqrsModule,
    MongooseModule.forFeature([{ name: ProjectDocument.name, schema: ProjectSchema }]),
    forwardRef(() => MembersModule),
    forwardRef(() => IntegrationsModule),
  ],
  controllers: [ProjectsController],
  providers: [
    ProjectRealtimeService,
    ProjectsService,
    CreateProjectHandler,
    ListProjectsHandler,
  ],
  exports: [ProjectRealtimeService, ProjectsService, MongooseModule],
})
export class ProjectsModule {}
