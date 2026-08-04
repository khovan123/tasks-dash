import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { randomBytes } from "node:crypto";
import {
  IntegrationOauthStateDocument,
  IntegrationOauthStateHydratedDocument,
} from "./integration.schemas";

const GOOGLE_DRIVE_PROVIDER = "GOOGLE_DRIVE";

export interface DriveOauthContext {
  workspaceId: string;
  memberId: string;
}

@Injectable()
export class DriveOauthStateService {
  constructor(
    @InjectModel(IntegrationOauthStateDocument.name)
    private readonly states: Model<IntegrationOauthStateHydratedDocument>,
  ) {}

  async create(workspaceId: string, memberId: string): Promise<string> {
    const state = randomBytes(32).toString("base64url");
    await this.states.create({
      state,
      workspaceId,
      memberId,
      provider: GOOGLE_DRIVE_PROVIDER,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    return state;
  }

  async consume(state: string): Promise<DriveOauthContext> {
    const stored = await this.states
      .findOneAndDelete({
        state,
        provider: GOOGLE_DRIVE_PROVIDER,
        memberId: { $type: "string" },
        expiresAt: { $gt: new Date() },
      })
      .exec();
    if (!stored?.memberId) {
      throw new UnauthorizedException(
        "Google Drive OAuth state is invalid or expired.",
      );
    }
    return { workspaceId: stored.workspaceId, memberId: stored.memberId };
  }
}
