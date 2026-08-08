"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { MemberPresence } from "@tasks-dash/contracts";
import { apiRequest } from "@/lib/api/api-request";
import { useAppDispatch } from "@/lib/store/hooks";
import {
  bumpProjectRevision,
  replaceProjects,
  replaceWorkItems,
  setConnectionStatus,
  setPresence,
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

export function WorkspaceRealtimeProvider({
  children,
  initialProjects,
}: {
  children: ReactNode;
  initialProjects: RealtimeProject[];
}) {
  const dispatch = useAppDispatch();
  const workItemSyncTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const projectsSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    dispatch(replaceProjects(initialProjects));
  }, [dispatch, initialProjects]);

  useEffect(() => {
    let cancelled = false;
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    async function heartbeat() {
      try {
        const result = await apiRequest<{ presence: Record<string, MemberPresence> }>(
          "/api/projects/presence",
          { method: "POST" },
        );
        if (!cancelled) {
          dispatch(setPresence(result.presence));
        }
      } catch {
        // Presence must not interrupt the realtime transport.
      }
    }

    async function syncProjects() {
      try {
        const projects = await apiRequest<RealtimeProject[]>("/api/projects");
        if (!cancelled) {
          dispatch(replaceProjects(projects));
        }
      } catch {
        // The next lifecycle event or navigation can retry the project snapshot.
      }
    }

    async function syncWorkItems(projectKey: string) {
      try {
        const items = await apiRequest<RealtimeWorkItem[]>(
          `/api/projects/${projectKey}/work-items`,
        );
        if (!cancelled) {
          dispatch(replaceWorkItems({ projectKey, items }));
        }
      } catch {
        // Keep the last normalized snapshot when a transient sync fails.
      }
    }

    function scheduleProjectsSync() {
      if (projectsSyncTimerRef.current) {
        clearTimeout(projectsSyncTimerRef.current);
      }
      projectsSyncTimerRef.current = setTimeout(() => {
        projectsSyncTimerRef.current = null;
        void syncProjects();
      }, 75);
    }

    function scheduleWorkItemsSync(projectKey: string) {
      const key = projectKey.toUpperCase();
      const currentTimer = workItemSyncTimersRef.current[key];
      if (currentTimer) {
        clearTimeout(currentTimer);
      }
      workItemSyncTimersRef.current[key] = setTimeout(() => {
        delete workItemSyncTimersRef.current[key];
        void syncWorkItems(key);
      }, 75);
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

      if (!projectKey || projectKey === "*") {
        return;
      }

      switch (payload.type) {
        case "WORK_ITEMS_CHANGED":
          dispatch(
            bumpProjectRevision({ projectKey, resource: "workItems" }),
          );
          scheduleWorkItemsSync(projectKey);
          break;
        case "PROJECT_CHANGED":
          dispatch(bumpProjectRevision({ projectKey, resource: "project" }));
          break;
        case "PROJECT_MEMBERS_CHANGED":
        case "members_updated":
          dispatch(bumpProjectRevision({ projectKey, resource: "members" }));
          break;
        case "DOCUMENTS_CHANGED":
          dispatch(bumpProjectRevision({ projectKey, resource: "documents" }));
          break;
        case "DESIGN_CATALOG_CHANGED":
          dispatch(
            bumpProjectRevision({ projectKey, resource: "designCatalog" }),
          );
          break;
        default:
          break;
      }
    }

    function connect() {
      dispatch(setConnectionStatus(reconnectTimer ? "reconnecting" : "connecting"));
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
      const sseUrl = apiBaseUrl
        ? `${apiBaseUrl.replace(/\/$/, "")}/projects/sse`
        : "/api/projects/sse";

      eventSource = new EventSource(sseUrl, { withCredentials: true });
      eventSource.onopen = () => {
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
      for (const timer of Object.values(workItemSyncTimersRef.current)) {
        clearTimeout(timer);
      }
      workItemSyncTimersRef.current = {};
      dispatch(setConnectionStatus("idle"));
    };
  }, [dispatch]);

  return children;
}
