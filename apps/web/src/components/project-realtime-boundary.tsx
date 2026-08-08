"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiRequest, ApiRequestError } from "@/lib/api/api-request";

const WORK_ITEM_EVENT_TYPE = "WORK_ITEMS_CHANGED";
const PROJECT_MEMBERS_EVENT_TYPE = "PROJECT_MEMBERS_CHANGED";
const PROJECT_CHANGED_EVENT_TYPE = "PROJECT_CHANGED";
const DOCUMENTS_CHANGED_EVENT_TYPE = "DOCUMENTS_CHANGED";
const DESIGN_CATALOG_CHANGED_EVENT_TYPE = "DESIGN_CATALOG_CHANGED";
const PRESENCE_CHANGED_EVENT_TYPE = "PRESENCE_CHANGED";

function shouldRefreshProjectRoute(
  type: string,
  pathname: string,
  projectKey: string,
): boolean {
  const projectBasePath = `/projects/${projectKey}`;

  if (
    type === PROJECT_CHANGED_EVENT_TYPE ||
    type === PROJECT_MEMBERS_EVENT_TYPE
  ) {
    return true;
  }

  if (type === WORK_ITEM_EVENT_TYPE) {
    return (
      pathname === projectBasePath ||
      pathname === `${projectBasePath}/development`
    );
  }

  if (type === DOCUMENTS_CHANGED_EVENT_TYPE) {
    return pathname === `${projectBasePath}/docs`;
  }

  if (type === DESIGN_CATALOG_CHANGED_EVENT_TYPE) {
    return pathname === `${projectBasePath}/designer`;
  }

  return false;
}

export function ProjectRealtimeBoundary({
  children,
  projectKey,
  projectName,
}: {
  children: ReactNode;
  projectKey: string;
  projectName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const removalHandledRef = useRef(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    async function ensureProjectAccess(): Promise<boolean> {
      try {
        await apiRequest(`/api/projects/${projectKey}`);
        return true;
      } catch (error) {
        if (
          error instanceof ApiRequestError &&
          (error.status === 403 || error.status === 404)
        ) {
          if (!removalHandledRef.current) {
            removalHandledRef.current = true;
            toast.error(`Bạn đã bị gỡ khỏi dự án ${projectName}.`);
          }
          router.replace("/");
          router.refresh();
          return false;
        }
        return true;
      }
    }

    const refreshProject = async (type: string) => {
      if (type === PRESENCE_CHANGED_EVENT_TYPE) {
        return;
      }

      if (
        type === PROJECT_MEMBERS_EVENT_TYPE ||
        type === PROJECT_CHANGED_EVENT_TYPE
      ) {
        const hasAccess = await ensureProjectAccess();
        if (!hasAccess) return;
      }

      if (!shouldRefreshProjectRoute(type, pathname, projectKey)) {
        return;
      }

      router.refresh();
    };

    const connect = () => {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
      const sseUrl = apiBaseUrl
        ? `${apiBaseUrl.replace(/\/$/, "")}/projects/${projectKey}/sse`
        : `/api/projects/${projectKey}/sse`;

      eventSource = new EventSource(sseUrl, { withCredentials: true });

      eventSource.onmessage = (event) => {
        try {
          if (event.data === "ping") return;
          const payload = JSON.parse(event.data) as { type: string };
          void refreshProject(payload.type);
        } catch (error) {
          console.error("Failed to parse project SSE payload", error);
        }
      };

      eventSource.onerror = (error) => {
        console.warn(
          "Project SSE connection encountered an issue. Reconnecting in 5s...",
          error,
        );
        if (eventSource) {
          eventSource.close();
        }
        reconnectTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [pathname, projectKey, projectName, router]);

  return children;
}
