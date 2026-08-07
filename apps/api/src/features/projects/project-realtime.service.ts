import { Injectable } from "@nestjs/common";
import {
  MEMBER_PRESENCE,
  type MemberPresence,
} from "@tasks-dash/contracts";
import { Subject } from "rxjs";

export const PROJECT_REALTIME_EVENT_TYPES = {
  projectChanged: "PROJECT_CHANGED",
  projectMembersChanged: "PROJECT_MEMBERS_CHANGED",
  workItemsChanged: "WORK_ITEMS_CHANGED",
  documentsChanged: "DOCUMENTS_CHANGED",
  designCatalogChanged: "DESIGN_CATALOG_CHANGED",
  presenceChanged: "PRESENCE_CHANGED",
} as const;

export type ProjectRealtimeEventType =
  (typeof PROJECT_REALTIME_EVENT_TYPES)[keyof typeof PROJECT_REALTIME_EVENT_TYPES];

export interface ProjectRealtimeEvent {
  type: ProjectRealtimeEventType;
  workspaceId: string;
  projectKey: string;
  data?: Record<string, unknown>;
}

interface PresenceEntry {
  lastSeenAt: number;
  status: MemberPresence;
  timeout: NodeJS.Timeout | null;
}

const PRESENCE_OFFLINE_AFTER_MS = 35_000;

@Injectable()
export class ProjectRealtimeService {
  readonly events$ = new Subject<ProjectRealtimeEvent>();

  private readonly presenceByWorkspace = new Map<
    string,
    Map<string, PresenceEntry>
  >();

  emit(event: ProjectRealtimeEvent): void {
    this.events$.next(event);
  }

  touchPresence(
    workspaceId: string,
    _projectKey: string,
    memberId: string,
  ): Record<string, MemberPresence> {
    const workspacePresence = this.ensureWorkspacePresence(workspaceId);
    const current = workspacePresence.get(memberId);
    if (current?.timeout) {
      clearTimeout(current.timeout);
    }

    const entry: PresenceEntry = {
      lastSeenAt: Date.now(),
      status: MEMBER_PRESENCE.online,
      timeout: setTimeout(() => {
        this.markOffline(workspaceId, memberId);
      }, PRESENCE_OFFLINE_AFTER_MS),
    };

    workspacePresence.set(memberId, entry);
    this.emitPresence(workspaceId);
    return this.getPresenceSnapshot(workspaceId, "");
  }

  getPresenceSnapshot(
    workspaceId: string,
    _projectKey: string,
  ): Record<string, MemberPresence> {
    const workspacePresence = this.presenceByWorkspace.get(workspaceId);
    if (!workspacePresence) return {};

    return Object.fromEntries(
      Array.from(workspacePresence.entries()).map(([memberId, entry]) => [
        memberId,
        entry.status,
      ]),
    );
  }

  syncMembers(
    _workspaceId: string,
    _projectKey: string,
    _memberIds: string[],
  ): void {
    // Presence is workspace-scoped.
  }

  clearProject(_workspaceId: string, _projectKey: string): void {
    // Presence is workspace-scoped.
  }

  private markOffline(
    workspaceId: string,
    memberId: string,
  ): void {
    const workspacePresence = this.presenceByWorkspace.get(workspaceId);
    const entry = workspacePresence?.get(memberId);
    if (!workspacePresence || !entry) return;

    entry.status = MEMBER_PRESENCE.offline;
    entry.timeout = null;
    this.emitPresence(workspaceId);
  }

  private emitPresence(workspaceId: string): void {
    this.emit({
      type: PROJECT_REALTIME_EVENT_TYPES.presenceChanged,
      workspaceId,
      projectKey: "*",
      data: {
        presence: this.getPresenceSnapshot(workspaceId, ""),
      },
    });
  }

  private ensureWorkspacePresence(
    workspaceId: string,
  ): Map<string, PresenceEntry> {
    const existing = this.presenceByWorkspace.get(workspaceId);
    if (existing) return existing;

    const created = new Map<string, PresenceEntry>();
    this.presenceByWorkspace.set(workspaceId, created);
    return created;
  }
}
