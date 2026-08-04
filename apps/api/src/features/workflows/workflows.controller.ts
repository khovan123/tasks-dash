import { Body, Controller, Get, Headers, Injectable, Param, Put } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { WorkflowDocument, WorkflowHydratedDocument } from "./workflows.schema";
@Injectable()
export class WorkflowsService {
  constructor(@InjectModel(WorkflowDocument.name) private readonly workflows: Model<WorkflowHydratedDocument>) {}
  get(workspaceId: string, projectKey: string) { return this.workflows.findOne({ workspaceId, projectKey: projectKey.toUpperCase() }).exec(); }
  upsert(workspaceId: string, projectKey: string, input: Partial<WorkflowDocument>) {
    return this.workflows.findOneAndUpdate({ workspaceId, projectKey: projectKey.toUpperCase() }, { ...input, workspaceId, projectKey: projectKey.toUpperCase() }, { upsert: true, new: true, setDefaultsOnInsert: true }).exec();
  }
}
@Controller("projects/:projectKey/workflow")
export class WorkflowsController {
  constructor(private readonly service: WorkflowsService) {}
  @Get() get(@Param("projectKey") key: string, @Headers("x-workspace-id") workspaceId = "demo") { return this.service.get(workspaceId, key); }
  @Put() update(@Param("projectKey") key: string, @Body() body: Partial<WorkflowDocument>, @Headers("x-workspace-id") workspaceId = "demo") { return this.service.upsert(workspaceId, key, body); }
}
