import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, isValidObjectId, Model } from "mongoose";
import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import {
  MemberRole,
  MEMBER_INVITATION_STATUSES,
  MEMBER_PRESENCE,
  MEMBER_ROLES,
} from "@tasks-dash/contracts";
import {
  BootstrapWorkspaceDto,
  CreateWorkspaceDto,
  InviteWorkspaceMemberDto,
} from "./members.dto";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InvitationMailerService } from "./invitation-mailer.service";
import { MemberDocument, MemberHydratedDocument } from "./member.schema";
import {
  WorkspaceInvitationDocument,
  WorkspaceInvitationHydratedDocument,
} from "./workspace-invitation.schema";
import {
  WorkspaceDocument,
  WorkspaceHydratedDocument,
} from "./workspace.schema";

interface IdentityProfile {
  name: string;
  avatarUrl: string;
}

export interface WorkspaceMembershipView {
  workspaceId: string;
  name: string;
  slug: string;
  role: MemberRole;
  memberId: string;
  lastLoginAt: Date | null;
}

@Injectable()
export class MembersService {
  constructor(
    private readonly config: ConfigService,
    private readonly mailer: InvitationMailerService,
    private readonly events: EventEmitter2,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(MemberDocument.name)
    private readonly members: Model<MemberHydratedDocument>,
    @InjectModel(WorkspaceInvitationDocument.name)
    private readonly invitations: Model<WorkspaceInvitationHydratedDocument>,
    @InjectModel(WorkspaceDocument.name)
    private readonly workspaces: Model<WorkspaceHydratedDocument>,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private tokenHash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private inviteExpiry(): Date {
    const hours = this.config.get<number>("INVITE_TTL_HOURS", 72);
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  private workspaceSlug(dto: CreateWorkspaceDto): string {
    const base =
      dto.workspaceSlug ??
      dto.workspaceName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 42);
    if (!base) throw new BadRequestException("Workspace slug is invalid.");
    return `${base}-${randomBytes(3).toString("hex")}`;
  }

  private async workspaceName(workspaceId: string): Promise<string> {
    const workspace = await this.workspaces.findOne({ workspaceId }).lean().exec();
    return workspace?.name ?? `Workspace ${workspaceId}`;
  }

  async list(workspaceId: string): Promise<Record<string, unknown>> {
    await this.invitations.updateMany(
      {
        workspaceId,
        status: MEMBER_INVITATION_STATUSES.pending,
        expiresAt: { $lte: new Date() },
      },
      { status: MEMBER_INVITATION_STATUSES.expired },
    );
    const [workspace, members, invitations] = await Promise.all([
      this.workspaces.findOne({ workspaceId }).lean().exec(),
      this.members
        .find({ workspaceId })
        .select({ authIdentityId: 0, githubId: 0 })
        .sort({ role: 1, name: 1 })
        .lean()
        .exec(),
      this.invitations
        .find({ workspaceId })
        .select({ tokenHash: 0 })
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
    ]);
    return {
      workspace: workspace ?? { workspaceId, name: `Workspace ${workspaceId}` },
      members,
      invitations,
    };
  }

  async bootstrap(
    providedSecret: string | undefined,
    dto: BootstrapWorkspaceDto,
  ): Promise<Record<string, unknown>> {
    const expected = Buffer.from(
      this.config.getOrThrow<string>("WORKSPACE_BOOTSTRAP_SECRET"),
    );
    const actual = Buffer.from(providedSecret ?? "");
    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      throw new UnauthorizedException("Invalid workspace bootstrap secret.");
    }
    const email = this.normalizeEmail(dto.ownerEmail);
    const workspaceId = `ws_${randomUUID().replaceAll("-", "")}`;
    await this.workspaces.create({
      workspaceId,
      name: dto.workspaceName.trim(),
      slug: this.workspaceSlug(dto),
      createdByEmail: email,
    });
    const invitation = await this.createInvitation(
      workspaceId,
      email,
      MEMBER_ROLES.owner,
      undefined,
    );
    return {
      workspaceId,
      workspaceName: dto.workspaceName.trim(),
      invitationId: String(invitation._id),
      ownerEmail: email,
      expiresAt: invitation.expiresAt,
    };
  }

  async createWorkspaceForOwner(
    authIdentityId: string,
    githubId: number,
    emailInput: string,
    profile: IdentityProfile,
    dto: CreateWorkspaceDto,
  ): Promise<{ workspace: WorkspaceHydratedDocument; member: MemberHydratedDocument }> {
    const email = this.normalizeEmail(emailInput);
    let createdWorkspace: WorkspaceHydratedDocument | null = null;
    let createdMember: MemberHydratedDocument | null = null;

    await this.connection.transaction(async (session) => {
      const workspaceId = `ws_${randomUUID().replaceAll("-", "")}`;
      const workspaces = await this.workspaces.create(
        [
          {
            workspaceId,
            name: dto.workspaceName.trim(),
            slug: this.workspaceSlug(dto),
            createdByEmail: email,
          },
        ],
        { session },
      );
      const members = await this.members.create(
        [
          {
            workspaceId,
            name: profile.name,
            email,
            avatarUrl: profile.avatarUrl,
            role: MEMBER_ROLES.owner,
            status: MEMBER_PRESENCE.online,
            authIdentityId,
            githubId,
            lastLoginAt: new Date(),
          },
        ],
        { session },
      );
      createdWorkspace = workspaces[0];
      createdMember = members[0];
    });

    if (!createdWorkspace || !createdMember) {
      throw new ConflictException("Workspace creation failed.");
    }
    return { workspace: createdWorkspace, member: createdMember };
  }

  async linkIdentityToExistingMemberships(
    authIdentityId: string,
    githubId: number,
    emailInput: string,
  ): Promise<void> {
    const email = this.normalizeEmail(emailInput);
    await this.members
      .updateMany(
        {
          email,
          $or: [
            { authIdentityId: { $exists: false } },
            { authIdentityId: null },
            { authIdentityId },
          ],
        },
        { $set: { authIdentityId, githubId } },
      )
      .exec();
  }

  async listMemberships(
    authIdentityId: string,
  ): Promise<WorkspaceMembershipView[]> {
    const memberships = await this.members
      .find({ authIdentityId })
      .sort({ lastLoginAt: -1, createdAt: 1 })
      .lean()
      .exec();
    const workspaceIds = memberships.map((member) => member.workspaceId);
    const workspaces = await this.workspaces
      .find({ workspaceId: { $in: workspaceIds } })
      .lean()
      .exec();
    const byId = new Map(workspaces.map((workspace) => [workspace.workspaceId, workspace]));
    return memberships.flatMap((member) => {
      const workspace = byId.get(member.workspaceId);
      if (!workspace) return [];
      return [
        {
          workspaceId: workspace.workspaceId,
          name: workspace.name,
          slug: workspace.slug,
          role: member.role,
          memberId: String(member._id),
          lastLoginAt: member.lastLoginAt ?? null,
        },
      ];
    });
  }

  async resolveLoginMembership(
    authIdentityId: string,
    preferredWorkspaceId?: string,
  ): Promise<MemberHydratedDocument | null> {
    if (preferredWorkspaceId) {
      const preferred = await this.members
        .findOne({ authIdentityId, workspaceId: preferredWorkspaceId })
        .exec();
      if (preferred) return preferred;
    }
    return this.members
      .findOne({ authIdentityId })
      .sort({ lastLoginAt: -1, createdAt: 1 })
      .exec();
  }

  async membershipForWorkspace(
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
    return member;
  }

  async invite(
    workspaceId: string,
    invitedByMemberId: string,
    dto: InviteWorkspaceMemberDto,
  ): Promise<Record<string, unknown>> {
    if (dto.role === MEMBER_ROLES.owner) {
      throw new BadRequestException("Cannot assign OWNER role via invitation.");
    }
    const email = this.normalizeEmail(dto.email);
    if (await this.members.exists({ workspaceId, email })) {
      throw new ConflictException("This email is already a workspace member.");
    }
    const invitation = await this.createInvitation(
      workspaceId,
      email,
      dto.role,
      invitedByMemberId,
    );
    return this.publicInvitation(invitation);
  }

  private async createInvitation(
    workspaceId: string,
    email: string,
    role: MemberRole,
    invitedByMemberId: string | undefined,
  ): Promise<WorkspaceInvitationHydratedDocument> {
    await this.invitations.updateMany(
      {
        workspaceId,
        email,
        status: MEMBER_INVITATION_STATUSES.pending,
      },
      { status: MEMBER_INVITATION_STATUSES.revoked, revokedAt: new Date() },
    );
    const token = randomBytes(32).toString("base64url");
    const invitation = await this.invitations.create({
      workspaceId,
      email,
      role,
      tokenHash: this.tokenHash(token),
      status: MEMBER_INVITATION_STATUSES.pending,
      expiresAt: this.inviteExpiry(),
      invitedByMemberId,
    });
    const inviteUrl = `${this.config
      .getOrThrow<string>("WEB_APP_URL")
      .replace(/\/$/, "")}/invite?token=${encodeURIComponent(token)}`;
    await this.mailer.send({
      email,
      workspaceName: await this.workspaceName(workspaceId),
      role,
      inviteUrl,
    });
    invitation.lastSentAt = new Date();
    await invitation.save();
    return invitation;
  }

  async resend(
    workspaceId: string,
    invitationId: string,
  ): Promise<Record<string, unknown>> {
    const invitation = await this.invitationById(workspaceId, invitationId);
    if (invitation.status === MEMBER_INVITATION_STATUSES.accepted) {
      throw new ConflictException("Accepted invitations cannot be resent.");
    }
    const replacement = await this.createInvitation(
      workspaceId,
      invitation.email,
      invitation.role,
      invitation.invitedByMemberId,
    );
    return this.publicInvitation(replacement);
  }

  async revoke(workspaceId: string, invitationId: string): Promise<void> {
    const invitation = await this.invitationById(workspaceId, invitationId);
    if (invitation.status === MEMBER_INVITATION_STATUSES.accepted) {
      throw new ConflictException("Accepted invitations cannot be revoked.");
    }
    invitation.status = MEMBER_INVITATION_STATUSES.revoked;
    invitation.revokedAt = new Date();
    await invitation.save();
  }

  async acceptInvitation(
    rawToken: string,
    emailInput: string,
    profile: IdentityProfile & { discordUsername?: string },
    authIdentityId: string,
    githubId: number,
  ): Promise<MemberHydratedDocument> {
    const email = this.normalizeEmail(emailInput);
    const hash = this.tokenHash(rawToken);
    let acceptedMember: MemberHydratedDocument | null = null;

    await this.connection.transaction(async (session) => {
      const invitation = await this.invitations
        .findOne({
          tokenHash: hash,
          status: MEMBER_INVITATION_STATUSES.pending,
          expiresAt: { $gt: new Date() },
        })
        .session(session)
        .exec();
      if (!invitation) {
        throw new UnauthorizedException(
          "A valid workspace invitation is required before GitHub login.",
        );
      }
      if (invitation.email !== email) {
        throw new ForbiddenException(
          "The verified GitHub email does not match this invitation.",
        );
      }
      const existing = await this.members
        .findOne({ workspaceId: invitation.workspaceId, email })
        .session(session)
        .exec();
      if (existing?.authIdentityId && existing.authIdentityId !== authIdentityId) {
        throw new ConflictException(
          "This workspace membership is linked to another GitHub account.",
        );
      }
      if (existing) {
        existing.authIdentityId = authIdentityId;
        existing.githubId = githubId;
        existing.name = profile.name;
        existing.avatarUrl = profile.avatarUrl;
        if (profile.discordUsername) {
          existing.discordUsername = profile.discordUsername;
        }
        existing.status = MEMBER_PRESENCE.online;
        existing.lastLoginAt = new Date();
        await existing.save({ session });
        acceptedMember = existing;
      } else {
        const created = await this.members.create(
          [
            {
              workspaceId: invitation.workspaceId,
              name: profile.name,
              email,
              avatarUrl: profile.avatarUrl,
              role: invitation.role,
              status: MEMBER_PRESENCE.online,
              authIdentityId,
              githubId,
              discordUsername: profile.discordUsername,
              lastLoginAt: new Date(),
            },
          ],
          { session },
        );
        acceptedMember = created[0];
      }
      invitation.status = MEMBER_INVITATION_STATUSES.accepted;
      invitation.acceptedByMemberId = String(acceptedMember._id);
      invitation.acceptedAt = new Date();
      await invitation.save({ session });
    });

    if (!acceptedMember) {
      throw new UnauthorizedException("Workspace invitation acceptance failed.");
    }
    void this.events.emitAsync("workspace.members.changed", {
      workspaceId: (acceptedMember as MemberHydratedDocument).workspaceId,
    }).catch(() => { /* non-critical */ });
    return acceptedMember;
  }

  findMemberById(
    workspaceId: string,
    memberId: string,
  ): Promise<MemberHydratedDocument | null> {
    if (!isValidObjectId(memberId)) return Promise.resolve(null);
    return this.members.findOne({ _id: memberId, workspaceId }).exec();
  }

  async touchLogin(
    member: MemberHydratedDocument,
    profile: IdentityProfile,
  ): Promise<void> {
    member.name = profile.name;
    member.avatarUrl = profile.avatarUrl;
    member.status = MEMBER_PRESENCE.online;
    member.lastLoginAt = new Date();
    await member.save();
  }

  async updateRole(
    workspaceId: string,
    actorMemberId: string,
    memberId: string,
    role: MemberRole,
  ): Promise<MemberHydratedDocument> {
    if (role === MEMBER_ROLES.owner) {
      throw new BadRequestException("Cannot assign OWNER role.");
    }
    const member = await this.memberById(workspaceId, memberId);
    if (member.role === MEMBER_ROLES.owner) {
      throw new ForbiddenException("Cannot modify or change role of workspace OWNER.");
    }
    if (memberId === actorMemberId && role === MEMBER_ROLES.viewer) {
      throw new ConflictException("You cannot change yourself to viewer.");
    }
    member.role = role;
    await member.save();
    void this.events.emitAsync("workspace.members.changed", { workspaceId }).catch(() => { /* non-critical */ });
    return member;
  }

  async removeMember(
    workspaceId: string,
    actorMemberId: string,
    memberId: string,
  ): Promise<void> {
    if (memberId === actorMemberId) {
      throw new ConflictException("You cannot remove yourself from the workspace.");
    }
    const member = await this.memberById(workspaceId, memberId);
    if (member.role === MEMBER_ROLES.owner) {
      throw new ForbiddenException("Cannot remove workspace OWNER.");
    }
    await this.members.deleteOne({ _id: member._id, workspaceId }).exec();
    void this.events.emitAsync("workspace.members.changed", { workspaceId }).catch(() => { /* non-critical */ });
  }

  private async memberById(
    workspaceId: string,
    memberId: string,
  ): Promise<MemberHydratedDocument> {
    const member = await this.findMemberById(workspaceId, memberId);
    if (!member) throw new NotFoundException("Workspace member was not found.");
    return member;
  }

  private async invitationById(
    workspaceId: string,
    invitationId: string,
  ): Promise<WorkspaceInvitationHydratedDocument> {
    if (!isValidObjectId(invitationId)) {
      throw new BadRequestException("Invalid invitation id.");
    }
    const invitation = await this.invitations
      .findOne({ _id: invitationId, workspaceId })
      .exec();
    if (!invitation) {
      throw new NotFoundException("Workspace invitation was not found.");
    }
    return invitation;
  }

  private publicInvitation(
    invitation: WorkspaceInvitationDocument & { _id?: unknown },
  ): Record<string, unknown> {
    return {
      id: String(invitation._id),
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      lastSentAt: invitation.lastSentAt ?? null,
    };
  }
}
