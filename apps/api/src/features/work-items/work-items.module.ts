import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { MongooseModule } from "@nestjs/mongoose";
import { ProjectsModule } from "../projects/projects.module";
import { WorkflowsModule } from "../workflows/workflows.module";
import { WorkItemDocument, WorkItemSchema } from "./work-item.schema";
import { CreateWorkItemHandler, TransitionWorkItemHandler } from "./work-items.cqrs";
import { WorkItemsController } from "./work-items.controller";
import { WorkItemsService } from "./work-items.service";
@Module({
  imports: [CqrsModule, ProjectsModule, WorkflowsModule, MongooseModule.forFeature([{ name: WorkItemDocument.name, schema: WorkItemSchema }])],
  controllers: [WorkItemsController], providers: [WorkItemsService, CreateWorkItemHandler, TransitionWorkItemHandler], exports: [WorkItemsService, MongooseModule],
})
export class WorkItemsModule {}
