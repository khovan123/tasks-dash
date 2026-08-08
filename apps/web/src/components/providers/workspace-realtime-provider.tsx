"use client";

import {
  useEffect,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from "react";
import type { MemberPresence } from "@tasks-dash/contracts";
import { apiRequest } from "@/lib/api/api-request";
import { useAppDispatch, useAppStore } from "@/lib/store/hooks";
import {
  bumpProjectRevision,
  replaceDesignCatalog,
  replaceDocumentTree,
  replaceProjects,
  replaceWorkItems,
  setConnectionStatus,
  setPresence,
  upsertProjectDetail,
  type RealtimeDesignCatalogItem,
  type RealtimeDocumentTree,
  type RealtimeProject,
  type RealtimeWorkItem,
} from "@/lib/store/realtime-slice";

interface WorkspaceRealtimeEvent {
  type: string;
  data?: {
    projectKey?: string;
    presence?: Record<string, MemberPresence>;
    [key: string]: unknown;
  };
}

const PROJECT_LIFECYCLE_EVENT_TYPES = new Set([
  "created",
  "updated",
  "deleted",
  "members_updated",
  "PROJECT_CHANGED",
  "PROJECT_MEMBERS_CHANGED",
]);

const SYNC_DEBOUNCE_MS = 75;

type TimerMapRef = MutableRefObject<
  Record<string, ReturnType<typeof setTimeout>>
>;

export function WorkspaceRealtimeProvider({
  children,
  initialProjects,
}: {
  children: ReactNode;
  initialProjects: RealtimeProject[];
}) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const workItemSyncTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const projectDetailSyncTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const documentSyncTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const designSyncTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const projectsSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    dispatch(replaceProjects(initialProjects));
  }, [dispatch, initialProjects]);

  useEffect(() => {
    let cancelled = false;
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let hasConnected = false;

    async function heartbeat() {
      try {
        const result = await apiRequest<{
          presence: Record<string, MemberPresence>;
        }>("/api/projects/presence", { method: "POST" });
        if (!cancelled) dispatch(setPresence(result.presence));
      } catch {
        // Presence must not interrupt the realtime transport.
      }
    }

    async function syncProjects() {
      try {
        const projects = await apiRequest<RealtimeProject[]>("/api/projects");
        if (!cancelled) dispatch(replaceProjects(projects));
      } catch {
        // The next lifecycle event or navigation can retry the project snapshot.
      }
    }

    async function syncProjectDetail(projectKey: string) {
      try {
        const project = await apiRequest<RealtimeProject>(
          `/api/projects/${projectKey}`,
        );
        if (!cancelled) dispatch(upsertProjectDetail(project));
      } catch {
        // Access changes are handled by ProjectRealtimeBoundary.
      }
    }

    async function syncWorkItems(projectKey: string) {
      try {
        const items = await apiRequest<RealtimeWorkItem[]>(
          `/api/projects/${projectKey}/work-items`,
        );
        if (!cancelled) {
          dispatch(
            replaceWorkItems({ projectKey, items, bumpRevision: false }),
          );
        }
      } catch {
        // Keep the last normalized snapshot when a transient sync fails.
      }
    }

    async function syncDocuments(projectKey: string) {
      try {
        const tree = await apiRequest<RealtimeDocumentTree>(
          `/api/projects/${projectKey}/documents`,
        );
        if (!cancelled) dispatch(replaceDocumentTree(tree));
      } catch {
        // Keep the last document snapshot when Discord is temporarily unavailable.
      }
    }

    async function syncDesignCatalog(projectKey: string) {
      try {
        const items = await apiRequest<RealtimeDesignCatalogItem[]>(
          `/api/projects/${projectKey}/design-catalog`,
        );
        if (!cancelled) dispatch(replaceDesignCatalog({ projectKey, items }));
      } catch {
        // Keep the last design snapshot when a transient sync fails.
      }
    }

    function scheduleProjectsSync() {
      if (projectsSyncTimerRef.current) {
        clearTimeout(projectsSyncTimerRef.current);
      }
      projectsSyncTimerRef.current = setTimeout(() => {
        projectsSyncTimerRef.current = null;
        void syncProjects();
      }, SYNC_DEBOUNCE_MS);
    }

    function scheduleProjectScopedSync(
      timers: TimerMapRef,
      projectKey: string,
      sync: (key: string) => Promise<void>,
    ) {
      const key = projectKey.toUpperCase();
      const currentTimer = timers.current[key];
      if (currentTimer) clearTimeout(currentTimer);
      timers.current[key] = setTimeout(() => {
        delete timers.current[key];
        void sync(key);
      }, SYNC_DEBOUNCE_MS);
    }

    function handleRealtimeEvent(payload: WorkspaceRealtimeEvent) {
      const projectKey = payload.data?.projectKey?.toUpperCase();

      if (payload.type === "PRESENCE_CHANGED" && payload.data?.presence) {
        dispatch(setPresence(payload.data.presence));
        return;
      }

      if (PROJECT_LIFECYCLE_EVENT_TYPES.has(payload.type)) {
        scheduleProjectsSync();
      }

      if (!projectKey || projectKey === "*") return;

      const realtimeState = store.getState().realtime;

      switch (payload.type) {
        case "WORK_ITEMS_CHANGED":
          dispatch(bumpProjectRevision({ projectKey, resource: "workItems" }));
          if (realtimeState.workItemsByProject[projectKey]?.hydrated) {
            scheduleProjectScopedSync(
              workItemSyncTimersRef,
              projectKey,
              syncWorkItems,
            );
          }
          break;
        case "PROJECT_CHANGED":
          dispatch(bumpProjectRevision({ projectKey, resource: "project" }));
          if (realtimeState.projects.detailHydrated[projectKey]) {
            scheduleProjectScopedSync(
              projectDetailSyncTimersRef,
              projectKey,
              syncProjectDetail,
            );
          }
          break;
        case "PROJECT_MEMBERS_CHANGED":
        case "members_updated":
          dispatch(bumpProjectRevision({ projectKey, resource: "members" }));
          break;
        case "DOCUMENTS_CHANGED":
          dispatch(bumpProjectRevision({ projectKey, resource: "documents" }));
          if (realtimeState.documentsByProject[projectKey]?.hydrated) {
            scheduleProjectScopedSync(
              documentSyncTimersRef,
              projectKey,
              syncDocuments,
            );
          }
          break;
        case "DESIGN_CATALOG_CHANGED":
          dispatch(
            bumpProjectRevision({ projectKey, resource: "designCatalog" }),
          );
          if (realtimeState.designCatalogByProject[projectKey]?.hydrated) {
            scheduleProjectScopedSync(
              designSyncTimersRef,
              projectKey,
              syncDesignCatalog,
            );
          }
          break;
        default:
          break;
      }
    }

    function connect() {
      dispatch(
        setConnectionStatus(hasConnected ? "reconnecting" : "connecting"),
      );
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
      const sseUrl = apiBaseUrl
        ? `${apiBaseUrl.replace(/\/$/, "")}/projects/sse`
        : "/api/projects/sse";

      eventSource = new EventSource(sseUrl, { withCredentials: true });
      eventSource.onopen = () => {
        hasConnected = true;
        dispatch(setConnectionStatus("open"));
      };
      eventSource.onmessage = (event) => {
        if (event.data === "ping") return;
        try {
          handleRealtimeEvent(JSON.parse(event.data) as WorkspaceRealtimeEvent);
        } catch (error) {
          console.error("Failed to parse workspace SSE payload", error);
        }
      };
      eventSource.onerror = () => {
        dispatch(setConnectionStatus("reconnecting"));
        eventSource?.close();
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connect();
        }, 5000);
      };
    }

    void heartbeat();
    const heartbeatInterval = window.setInterval(() => {
      void heartbeat();
    }, 20_000);
    connect();

    return () => {
      cancelled = true;
      window.clearInterval(heartbeatInterval);
      eventSource?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (projectsSyncTimerRef.current) clearTimeout(projectsSyncTimerRef.current);
      for (const timers of [
        workItemSyncTimersRef,
        projectDetailSyncTimersRef,
        documentSyncTimersRef,
        designSyncTimersRef,
      ]) {
        for (const timer of Object.values(timers.current)) clearTimeout(timer);
        timers.current = {};
      }
      dispatch(setConnectionStatus("idle"));
    };
  }, [dispatch, store]);

  return children;
}
