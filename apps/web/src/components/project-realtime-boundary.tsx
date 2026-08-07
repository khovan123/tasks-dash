"use client";

import {
  MEMBER_PRESENCE,
  type MemberPresence,
} from "@tasks-dash/contracts";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiRequest, ApiRequestError } from "@/lib/api/api-request";

type PresenceMap = Record<string, MemberPresence>;

const WORK_ITEM_EVENT_TYPE = "WORK_ITEMS_CHANGED";
const PROJECT_MEMBERS_EVENT_TYPE = "PROJECT_MEMBERS_CHANGED";
const PROJECT_CHANGED_EVENT_TYPE = "PROJECT_CHANGED";
const PRESENCE_CHANGED_EVENT_TYPE = "PRESENCE_CHANGED";

const ProjectPresenceContext = createContext<PresenceMap>({});

export function useProjectPresence(): PresenceMap {
  return useContext(ProjectPresenceContext);
}

export function ProjectRealtimeBoundary({
  children,
  memberId,
  projectKey,
  projectName,
}: {
  children: ReactNode;
  memberId: string;
  projectKey: string;
  projectName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [presence, setPresence] = useState<PresenceMap>({});
  const removalHandledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function heartbeat() {
      try {
        const result = await apiRequest<{ presence: PresenceMap }>(
          `/api/projects/${projectKey}/presence`,
          { method: "POST" },
        );
        if (!cancelled) {
          setPresence(result.presence);
        }
      } catch {
        // Ignore transient presence failures; the SSE channel will reconnect independently.
      }
    }

    void heartbeat();
    const intervalId = window.setInterval(() => {
      void heartbeat();
    }, 20_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [projectKey]);

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
      if (type === PROJECT_MEMBERS_EVENT_TYPE || type === PROJECT_CHANGED_EVENT_TYPE) {
        const hasAccess = await ensureProjectAccess();
        if (!hasAccess) return;
      }

      if (
        type === WORK_ITEM_EVENT_TYPE &&
        (pathname === `/projects/${projectKey}/board` ||
          pathname === `/projects/${projectKey}/backlog`)
      ) {
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
          const payload = JSON.parse(event.data) as {
            type: string;
            data?: { presence?: PresenceMap };
          };

          if (
            payload.type === PRESENCE_CHANGED_EVENT_TYPE &&
            payload.data?.presence
          ) {
            setPresence(payload.data.presence);
            return;
          }

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

  const value = useMemo(
    () => ({
      ...presence,
      [memberId]: presence[memberId] ?? MEMBER_PRESENCE.online,
    }),
    [memberId, presence],
  );

  return (
    <ProjectPresenceContext.Provider value={value}>
      {children}
    </ProjectPresenceContext.Provider>
  );
}
