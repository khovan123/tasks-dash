import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { MongooseModule } from "@nestjs/mongoose";
import { MembersModule } from "../members/members.module";
import { AuthController } from "./auth.controller";
import { GithubAuthorizationController } from "./github-authorization.controller";
import {
  AuthIdentityDocument,
  AuthIdentitySchema,
  AuthLoginCodeDocument,
  AuthLoginCodeSchema,
} from "./auth.schemas";
import {
  ProjectDocument,
  ProjectSchema,
} from "../projects/project.schema";
import {
  IntegrationOauthStateDocument,
  IntegrationOauthStateSchema,
} from "../integrations/integration.schemas";
import {
  WorkItemDocument,
  WorkItemSchema,
} from "../work-items/work-item.schema";
import { GithubUserTokenService } from "./github-user-token.service";
import { SessionAuthGuard } from "./session-auth.guard";
import { SessionService } from "./session.service";
import { WorkspacesController } from "./workspaces.controller";

import { forwardRef } from "@nestjs/common";
import { IntegrationsModule } from "../integrations/integrations.module";

@Global()
@Module({
  imports: [
    MembersModule,
    forwardRef(() => IntegrationsModule),
    MongooseModule.forFeature([
      { name: AuthIdentityDocument.name, schema: AuthIdentitySchema },
      { name: AuthLoginCodeDocument.name, schema: AuthLoginCodeSchema },
      {
        name: IntegrationOauthStateDocument.name,
        schema: IntegrationOauthStateSchema,
      },
      { name: ProjectDocument.name, schema: ProjectSchema },
      { name: WorkItemDocument.name, schema: WorkItemSchema },
    ]),
  ],
  controllers: [
    AuthController,
    GithubAuthorizationController,
    WorkspacesController,
  ],
  providers: [
    SessionService,
    GithubUserTokenService,
    { provide: APP_GUARD, useClass: SessionAuthGuard },
  ],
  exports: [SessionService, GithubUserTokenService],
})
export class AuthModule {}
