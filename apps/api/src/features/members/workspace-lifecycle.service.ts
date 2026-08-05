import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model } from "mongoose";
import { MEMBER_ROLES } from "@tasks-dash/contracts";
import { MemberDocument, MemberHydratedDocument } from "./member.schema";
import {
  WorkspaceDocument,
  WorkspaceHydratedDocument,
} from "./workspace.schema";

@Injectable()
export class WorkspaceLifecycleService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(MemberDocument.name)
    private readonly members: Model<MemberHydratedDocument>,
    @InjectModel(WorkspaceDocument.name)
    private readonly workspaces: Model<WorkspaceHydratedDocument>,
  ) {}

  private async ownerMembership(
    authIdentityId: string,
    workspaceId: string,
  ): Promise<MemberHydratedDocument> {
    const member = await this.members
      .findOne({ authIdentityId, workspaceId })
      .exec();
    if (!member) {
      throw new ForbiddenException(
        "The GitHub account is not a member of this workspace.",
      );
    }
    if (member.role !== MEMBER_ROLES.owner) {
      throw new ForbiddenException("Only a workspace Owner can do this action.");
    }
    return member;
  }

  async rename(
    authIdentityId: string,
    workspaceId: string,
    workspaceNameInput: string,
  ): Promise<WorkspaceHydratedDocument> {
    await this.ownerMembership(authIdentityId, workspaceId);
    const workspaceName = workspaceNameInput.trim();
    if (workspaceName.length < 2 || workspaceName.length > 80) {
      throw new BadRequestException(
        "Workspace name must contain between 2 and 80 characters.",
      );
    }
    const workspace = await this.workspaces
      .findOneAndUpdate(
        { workspaceId },
        { $set: { name: workspaceName } },
        { new: true },
      )
      .exec();
    if (!workspace) throw new NotFoundException("Workspace was not found.");
    return workspace;
  }

  async delete(
    authIdentityId: string,
    workspaceId: string,
    confirmWorkspaceNameInput: string,
  ): Promise<void> {
    await this.ownerMembership(authIdentityId, workspaceId);
    const workspace = await this.workspaces.findOne({ workspaceId }).exec();
    if (!workspace) throw new NotFoundException("Workspace was not found.");

    if (confirmWorkspaceNameInput.trim() !== workspace.name) {
      throw new BadRequestException(
        "Workspace name confirmation does not match.",
      );
    }

    const database = this.connection.db;
    const collections = await database
      .listCollections({}, { nameOnly: true })
      .toArray();

    await this.connection.transaction(async (session) => {
      for (const collection of collections) {
        await database
          .collection(collection.name)
          .deleteMany({ workspaceId }, { session });
      }
    });
  }
}
