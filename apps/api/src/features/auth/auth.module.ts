import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { MongooseModule } from "@nestjs/mongoose";
import { MembersModule } from "../members/members.module";
import { AuthController } from "./auth.controller";
import {
  AuthIdentityDocument,
  AuthIdentitySchema,
} from "./auth.schemas";
import { GithubUserTokenService } from "./github-user-token.service";
import { SessionAuthGuard } from "./session-auth.guard";
import { SessionService } from "./session.service";
import { WorkspacesController } from "./workspaces.controller";

@Global()
@Module({
  imports: [
    MembersModule,
    MongooseModule.forFeature([
      { name: AuthIdentityDocument.name, schema: AuthIdentitySchema },
    ]),
  ],
  controllers: [AuthController, WorkspacesController],
  providers: [
    SessionService,
    GithubUserTokenService,
    { provide: APP_GUARD, useClass: SessionAuthGuard },
  ],
  exports: [SessionService, GithubUserTokenService],
})
export class AuthModule {}
