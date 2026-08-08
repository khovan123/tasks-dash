import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { MemberPresence } from "@tasks-dash/contracts";

export interface RealtimeProject {
  key: string;
  name: string;
  color?: string;
  currentMemberRole?: string;
}

export interface RealtimeWorkItem {
  key: string;
  projectKey?: string;
  summary: string;
  type: string;
  priority: string;
  statusId: string;
  rank?: number;
  sequence?: number;
  storyPoints?: number;
  dueDate?: string;
  startDate?: string;
  startedAt?: string;
  completedAt?: string;
  assigneeId?: string;
  reporterId?: string;
  description?: string;
  labels?: string[];
  sprintId?: string;
  figmaLinks?: Array<{ label: string; url: string }>;
  documentLinks?: Array<{ label: string; url: string }>;
  github?: any;
  [key: string]: unknown;
}

export interface ProjectRealtimeRevisions {
  project: number;
  members: number;
  workItems: number;
  documents: number;
  designCatalog: number;
}

interface NormalizedProjectsState {
  ids: string[];
  entities: Record<string, RealtimeProject>;
  hydrated: boolean;
}

interface NormalizedWorkItemsState {
  ids: string[];
  entities: Record<string, RealtimeWorkItem>;
  hydrated: boolean;
}

export interface RealtimeState {
  projects: NormalizedProjectsState;
  workItemsByProject: Record<string, NormalizedWorkItemsState>;
  presence: Record<string, MemberPresence>;
  revisionsByProject: Record<string, ProjectRealtimeRevisions>;
  connectionStatus: "idle" | "connecting" | "open" | "reconnecting";
}

const emptyRevisions: ProjectRealtimeRevisions = {
  project: 0,
  members: 0,
  workItems: 0,
  documents: 0,
  designCatalog: 0,
};

const initialState: RealtimeState = {
  projects: { ids: [], entities: {}, hydrated: false },
  workItemsByProject: {},
  presence: {},
  revisionsByProject: {},
  connectionStatus: "idle",
};

function normalizeProjectKey(projectKey: string): string {
  return projectKey.toUpperCase();
}

function replaceProjectItems(
  state: RealtimeState,
  projectKey: string,
  items: RealtimeWorkItem[],
): void {
  const key = normalizeProjectKey(projectKey);
  const ids: string[] = [];
  const entities: Record<string, RealtimeWorkItem> = {};

  for (const item of items) {
    ids.push(item.key);
    entities[item.key] = item;
  }

  state.workItemsByProject[key] = {
    ids,
    entities,
    hydrated: true,
  };
}

function bumpRevision(
  state: RealtimeState,
  projectKey: string,
  resource: keyof ProjectRealtimeRevisions,
): void {
  const key = normalizeProjectKey(projectKey);
  const current = state.revisionsByProject[key] ?? emptyRevisions;
  state.revisionsByProject[key] = {
    ...current,
    [resource]: current[resource] + 1,
  };
}

const realtimeSlice = createSlice({
  name: "realtime",
  initialState,
  reducers: {
    replaceProjects(state, action: PayloadAction<RealtimeProject[]>) {
      const ids: string[] = [];
      const entities: Record<string, RealtimeProject> = {};

      for (const project of action.payload) {
        const key = normalizeProjectKey(project.key);
        ids.push(key);
        entities[key] = { ...project, key };
      }

      state.projects = { ids, entities, hydrated: true };
    },
    replaceWorkItems(
      state,
      action: PayloadAction<{
        projectKey: string;
        items: RealtimeWorkItem[];
        bumpRevision?: boolean;
      }>,
    ) {
      replaceProjectItems(
        state,
        action.payload.projectKey,
        action.payload.items,
      );
      if (action.payload.bumpRevision !== false) {
        bumpRevision(state, action.payload.projectKey, "workItems");
      }
    },
    setPresence(state, action: PayloadAction<Record<string, MemberPresence>>) {
      state.presence = action.payload;
    },
    bumpProjectRevision(
      state,
      action: PayloadAction<{
        projectKey: string;
        resource: keyof ProjectRealtimeRevisions;
      }>,
    ) {
      bumpRevision(
        state,
        action.payload.projectKey,
        action.payload.resource,
      );
    },
    setConnectionStatus(
      state,
      action: PayloadAction<RealtimeState["connectionStatus"]>,
    ) {
      state.connectionStatus = action.payload;
    },
  },
});

export const {
  replaceProjects,
  replaceWorkItems,
  setPresence,
  bumpProjectRevision,
  setConnectionStatus,
} = realtimeSlice.actions;

export const realtimeReducer = realtimeSlice.reducer;

export interface RealtimeRootState {
  realtime: RealtimeState;
}

export const selectPresence = (state: RealtimeRootState) =>
  state.realtime.presence;

export const selectConnectionStatus = (state: RealtimeRootState) =>
  state.realtime.connectionStatus;

const selectProjectIds = (state: RealtimeRootState) =>
  state.realtime.projects.ids;
const selectProjectEntities = (state: RealtimeRootState) =>
  state.realtime.projects.entities;

export const selectProjects = createSelector(
  [selectProjectIds, selectProjectEntities],
  (ids, entities) =>
    ids.map((id) => entities[id]).filter(Boolean) as RealtimeProject[],
);

export const selectProjectsHydrated = (state: RealtimeRootState) =>
  state.realtime.projects.hydrated;

export function selectWorkItemsByProject(projectKey: string) {
  const key = normalizeProjectKey(projectKey);
  return createSelector(
    [
      (state: RealtimeRootState) => state.realtime.workItemsByProject[key]?.ids,
      (state: RealtimeRootState) =>
        state.realtime.workItemsByProject[key]?.entities,
    ],
    (ids = [], entities = {}) =>
      ids.map((id) => entities[id]).filter(Boolean) as RealtimeWorkItem[],
  );
}

export function selectWorkItemsHydrated(projectKey: string) {
  const key = normalizeProjectKey(projectKey);
  return (state: RealtimeRootState) =>
    state.realtime.workItemsByProject[key]?.hydrated ?? false;
}

export function selectProjectRevisions(projectKey: string) {
  const key = normalizeProjectKey(projectKey);
  return (state: RealtimeRootState): ProjectRealtimeRevisions =>
    state.realtime.revisionsByProject[key] ?? emptyRevisions;
}
