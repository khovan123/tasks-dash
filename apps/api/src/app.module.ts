import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CqrsModule } from "@nestjs/cqrs";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { ProjectsModule } from "./features/projects/projects.module";
import { WorkItemsModule } from "./features/work-items/work-items.module";
import { WorkflowsModule } from "./features/workflows/workflows.module";
import { SprintsModule } from "./features/sprints/sprints.module";
import { MembersModule } from "./features/members/members.module";
import { DashboardModule } from "./features/dashboard/dashboard.module";
import { IntegrationsModule } from "./features/integrations/integrations.module";
import { AutomationsModule } from "./features/automations/automations.module";
import { DemoModule } from "./features/demo/demo.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CqrsModule.forRoot(),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.get<string>("MONGODB_URI", "mongodb://localhost:27017/tasks-dash") }),
    }),
    ProjectsModule,
    WorkItemsModule,
    WorkflowsModule,
    SprintsModule,
    MembersModule,
    DashboardModule,
    IntegrationsModule,
    AutomationsModule,
    DemoModule,
  ],
})
export class AppModule {}
