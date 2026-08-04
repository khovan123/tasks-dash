import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { MongooseModule } from "@nestjs/mongoose";
import { MembersModule } from "../members/members.module";
import { AuthController } from "./auth.controller";
import { AuthUserDocument, AuthUserSchema } from "./auth.schemas";
import { GithubUserTokenService } from "./github-user-token.service";
import { SessionAuthGuard } from "./session-auth.guard";
import { SessionService } from "./session.service";

@Global()
@Module({
  imports: [
    MembersModule,
    MongooseModule.forFeature([
      { name: AuthUserDocument.name, schema: AuthUserSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    SessionService,
    GithubUserTokenService,
    { provide: APP_GUARD, useClass: SessionAuthGuard },
  ],
  exports: [SessionService, GithubUserTokenService],
})
export class AuthModule {}
