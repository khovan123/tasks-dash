import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { WorkflowDocument, WorkflowSchema } from "./workflows.schema";
import { WorkflowsController, WorkflowsService } from "./workflows.controller";
@Module({ imports: [MongooseModule.forFeature([{ name: WorkflowDocument.name, schema: WorkflowSchema }])], controllers: [WorkflowsController], providers: [WorkflowsService], exports: [WorkflowsService, MongooseModule] })
export class WorkflowsModule {}
