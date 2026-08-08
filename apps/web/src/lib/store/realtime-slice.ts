import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { MemberPresence } from "@tasks-dash/contracts";

export interface RealtimeProject {
  key: string;
  name: string;
  color?: string;
  currentMemberRole?: string;
  description?: string;
  repositoryFullName?: string;
  discordDocsChannelId?: string;
  discordDocsChannelName?: string;
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
}

export interface RealtimeDocumentFolder {
  id: string;
  name: string;
  parentFolderId: string | null;
  createdAt: string;
}

export interface RealtimeDocumentItem {
  id: string;
  name: string;
  description: string;
  tags: string[];
  folderId: string | null;
  currentVersion: number;
  updatedAt: string;
  latestVersion: null | {
    version: number;
    fileName: string;
    mimeType: string;
    size: number;
    messageId: string;
    attachmentId: string;
    openInDiscordUrl: string;
    downloadUrl: string;
    createdAt: string;
  };
}

export interface RealtimeDocumentTree {
  projectKey: string;
  guildId: string;
  channelId: string;
  channelName: string;
  channelUrl: string;
  maxFileSize: number;
  folders: RealtimeDocumentFolder[];
  documents: RealtimeDocumentItem[];
}

export interface RealtimeDesignCatalogItem {
  _id: string;
  name: string;
  type: string;
  figmaUrl: string;
  description: string;
  tags: string[];
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
  detailHydrated: Record<string, boolean>;
}

interface NormalizedWorkItemsState {
  ids: string[];
  entities: Record<string, RealtimeWorkItem>;
  hydrated: boolean;
}

interface NormalizedDocumentsState {
  folderIds: string[];
  folders: Record<string, RealtimeDocumentFolder>;
  documentIds: string[];
  documents: Record<string, RealtimeDocumentItem>;
  meta: Omit<RealtimeDocumentTree, "folders" | "documents"> | null;
  hydrated: boolean;
}

interface NormalizedDesignCatalogState {
  ids: string[];
  entities: Record<string, RealtimeDesignCatalogItem>;
  hydrated: boolean;
}

export interface RealtimeState {
  projects: NormalizedProjectsState;
  workItemsByProject: Record<string, NormalizedWorkItemsState>;
  documentsByProject: Record<string, NormalizedDocumentsState>;
  designCatalogByProject: Record<string, NormalizedDesignCatalogState>;
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
  projects: { ids: [], entities: {}, hydrated: false, detailHydrated: {} },
  workItemsByProject: {},
  documentsByProject: {},
  designCatalogByProject: {},
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

  state.workItemsByProject[key] = { ids, entities, hydrated: true };
}

function replaceProjectDocuments(
  state: RealtimeState,
  tree: RealtimeDocumentTree,
): void {
  const key = normalizeProjectKey(tree.projectKey);
  const folders: Record<string, RealtimeDocumentFolder> = {};
  const folderIds: string[] = [];
  const documents: Record<string, RealtimeDocumentItem> = {};
  const documentIds: string[] = [];

  for (const folder of tree.folders) {
    folderIds.push(folder.id);
    folders[folder.id] = folder;
  }
  for (const document of tree.documents) {
    documentIds.push(document.id);
    documents[document.id] = document;
  }

  state.documentsByProject[key] = {
    folderIds,
    folders,
    documentIds,
    documents,
    meta: {
      projectKey: key,
      guildId: tree.guildId,
      channelId: tree.channelId,
      channelName: tree.channelName,
      channelUrl: tree.channelUrl,
      maxFileSize: tree.maxFileSize,
    },
    hydrated: true,
  };
}

function replaceProjectDesignCatalog(
  state: RealtimeState,
  projectKey: string,
  items: RealtimeDesignCatalogItem[],
): void {
  const key = normalizeProjectKey(projectKey);
  const ids: string[] = [];
  const entities: Record<string, RealtimeDesignCatalogItem> = {};

  for (const item of items) {
    ids.push(item._id);
    entities[item._id] = item;
  }

  state.designCatalogByProject[key] = { ids, entities, hydrated: true };
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
        entities[key] = {
          ...(state.projects.entities[key] ?? {}),
          ...project,
          key,
        } as RealtimeProject;
      }

      state.projects.ids = ids;
      state.projects.entities = entities;
      state.projects.hydrated = true;
    },
    upsertProjectDetail(state, action: PayloadAction<RealtimeProject>) {
      const key = normalizeProjectKey(action.payload.key);
      state.projects.entities[key] = {
        ...(state.projects.entities[key] ?? {}),
        ...action.payload,
        key,
      } as RealtimeProject;
      if (!state.projects.ids.includes(key)) state.projects.ids.push(key);
      state.projects.detailHydrated[key] = true;
    },
    replaceWorkItems(
      state,
      action: PayloadAction<{
        projectKey: string;
        items: RealtimeWorkItem[];
        bumpRevision?: boolean;
      }>,
    ) {
      replaceProjectItems(state, action.payload.projectKey, action.payload.items);
      if (action.payload.bumpRevision !== false) {
        bumpRevision(state, action.payload.projectKey, "workItems");
      }
    },
    replaceDocumentTree(state, action: PayloadAction<RealtimeDocumentTree>) {
      replaceProjectDocuments(state, action.payload);
    },
    replaceDesignCatalog(
      state,
      action: PayloadAction<{
        projectKey: string;
        items: RealtimeDesignCatalogItem[];
      }>,
    ) {
      replaceProjectDesignCatalog(
        state,
        action.payload.projectKey,
        action.payload.items,
      );
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
  upsertProjectDetail,
  replaceWorkItems,
  replaceDocumentTree,
  replaceDesignCatalog,
  setPresence,
  bumpProjectRevision,
  setConnectionStatus,
} = realtimeSlice.actions;

export const realtimeReducer = realtimeSlice.reducer;

export interface RealtimeRootState {
  realtime: RealtimeState;
}

export const selectPresence = (state: RealtimeRootState) => state.realtime.presence;
export const selectConnectionStatus = (state: RealtimeRootState) =>
  state.realtime.connectionStatus;

const selectProjectIds = (state: RealtimeRootState) => state.realtime.projects.ids;
const selectProjectEntities = (state: RealtimeRootState) =>
  state.realtime.projects.entities;

export const selectProjects = createSelector(
  [selectProjectIds, selectProjectEntities],
  (ids, entities) =>
    ids.map((id) => entities[id]).filter(Boolean) as RealtimeProject[],
);

export const selectProjectsHydrated = (state: RealtimeRootState) =>
  state.realtime.projects.hydrated;

export function selectProject(projectKey: string) {
  const key = normalizeProjectKey(projectKey);
  return (state: RealtimeRootState) => state.realtime.projects.entities[key];
}

export function selectProjectDetailHydrated(projectKey: string) {
  const key = normalizeProjectKey(projectKey);
  return (state: RealtimeRootState) =>
    state.realtime.projects.detailHydrated[key] ?? false;
}

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

export function selectDocumentTree(projectKey: string) {
  const key = normalizeProjectKey(projectKey);
  return createSelector(
    [(state: RealtimeRootState) => state.realtime.documentsByProject[key]],
    (documentsState): RealtimeDocumentTree | null => {
      if (!documentsState?.hydrated || !documentsState.meta) return null;
      return {
        ...documentsState.meta,
        folders: documentsState.folderIds
          .map((id) => documentsState.folders[id])
          .filter(Boolean),
        documents: documentsState.documentIds
          .map((id) => documentsState.documents[id])
          .filter(Boolean),
      };
    },
  );
}

export function selectDocumentsHydrated(projectKey: string) {
  const key = normalizeProjectKey(projectKey);
  return (state: RealtimeRootState) =>
    state.realtime.documentsByProject[key]?.hydrated ?? false;
}

export function selectDesignCatalog(projectKey: string) {
  const key = normalizeProjectKey(projectKey);
  return createSelector(
    [
      (state: RealtimeRootState) => state.realtime.designCatalogByProject[key]?.ids,
      (state: RealtimeRootState) =>
        state.realtime.designCatalogByProject[key]?.entities,
    ],
    (ids = [], entities = {}) =>
      ids.map((id) => entities[id]).filter(Boolean) as RealtimeDesignCatalogItem[],
  );
}

export function selectDesignCatalogHydrated(projectKey: string) {
  const key = normalizeProjectKey(projectKey);
  return (state: RealtimeRootState) =>
    state.realtime.designCatalogByProject[key]?.hydrated ?? false;
}

export function selectProjectRevisions(projectKey: string) {
  const key = normalizeProjectKey(projectKey);
  return (state: RealtimeRootState): ProjectRealtimeRevisions =>
    state.realtime.revisionsByProject[key] ?? emptyRevisions;
}
