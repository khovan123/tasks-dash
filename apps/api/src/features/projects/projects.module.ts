import { Module, forwardRef } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { MongooseModule } from "@nestjs/mongoose";
import { ProjectDocument, ProjectSchema } from "./project.schema";
import { CreateProjectHandler, ListProjectsHandler } from "./projects.cqrs";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";
import { MembersModule } from "../members/members.module";
@Module({
  imports: [
    CqrsModule,
    MongooseModule.forFeature([{ name: ProjectDocument.name, schema: ProjectSchema }]),
    forwardRef(() => MembersModule),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, CreateProjectHandler, ListProjectsHandler],
  exports: [ProjectsService, MongooseModule],
})
export class ProjectsModule {}
