import { Module, forwardRef } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { MongooseModule } from "@nestjs/mongoose";
import { ProjectsModule } from "../projects/projects.module";
import { WorkflowsModule } from "../workflows/workflows.module";
import { WorkItemDocument, WorkItemSchema } from "./work-item.schema";
import { CreateWorkItemHandler, TransitionWorkItemHandler } from "./work-items.cqrs";
import { WorkItemsController } from "./work-items.controller";
import { WorkItemsService } from "./work-items.service";
import { IntegrationsModule } from "../integrations/integrations.module";
import { TaskDiscordLogDocument, TaskDiscordLogSchema } from "../integrations/integration.schemas";

@Module({
  imports: [
    CqrsModule,
    ProjectsModule,
    WorkflowsModule,
    forwardRef(() => IntegrationsModule),
    MongooseModule.forFeature([
      { name: WorkItemDocument.name, schema: WorkItemSchema },
      { name: TaskDiscordLogDocument.name, schema: TaskDiscordLogSchema },
    ]),
  ],
  controllers: [WorkItemsController],
  providers: [WorkItemsService, CreateWorkItemHandler, TransitionWorkItemHandler],
  exports: [WorkItemsService, MongooseModule],
})
export class WorkItemsModule {}
