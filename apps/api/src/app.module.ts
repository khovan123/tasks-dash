import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CqrsModule } from "@nestjs/cqrs";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { validateEnvironment } from "./config/environment";
import { SecurityModule } from "./common/security/credential-encryption.service";
import { AuthModule } from "./features/auth/auth.module";
import { ProjectsModule } from "./features/projects/projects.module";
import { WorkItemsModule } from "./features/work-items/work-items.module";
import { WorkflowsModule } from "./features/workflows/workflows.module";
import { SprintsModule } from "./features/sprints/sprints.module";
import { MembersModule } from "./features/members/members.module";
import { DashboardModule } from "./features/dashboard/dashboard.module";
import { IntegrationsModule } from "./features/integrations/integrations.module";
import { AutomationsModule } from "./features/automations/automations.module";
import { HealthModule } from "./features/health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      validate: validateEnvironment,
    }),
    CqrsModule.forRoot(),
    EventEmitterModule.forRoot({ wildcard: false, ignoreErrors: false }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>("MONGODB_URI"),
        maxPoolSize: config.get<number>("MONGODB_MAX_POOL_SIZE", 20),
        minPoolSize: config.get<number>("MONGODB_MIN_POOL_SIZE", 2),
        serverSelectionTimeoutMS: 10_000,
        retryWrites: true,
      }),
    }),
    SecurityModule,
    AuthModule,
    HealthModule,
    ProjectsModule,
    WorkItemsModule,
    WorkflowsModule,
    SprintsModule,
    MembersModule,
    DashboardModule,
    IntegrationsModule,
    AutomationsModule,
  ],
})
export class AppModule {}
