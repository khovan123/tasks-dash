"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiRequest, ApiRequestError } from "@/lib/api/api-request";
import { useAppSelector } from "@/lib/store/hooks";
import {
  selectProjectRevisions,
  type ProjectRealtimeRevisions,
} from "@/lib/store/realtime-slice";

function routeNeedsServerRefresh(
  previous: ProjectRealtimeRevisions,
  current: ProjectRealtimeRevisions,
  pathname: string,
  projectKey: string,
): boolean {
  const projectBasePath = `/projects/${projectKey}`;

  if (
    current.project !== previous.project ||
    current.members !== previous.members
  ) {
    return true;
  }

  if (current.workItems !== previous.workItems) {
    return (
      pathname === projectBasePath ||
      pathname === `${projectBasePath}/development`
    );
  }

  if (current.documents !== previous.documents) {
    return pathname === `${projectBasePath}/docs`;
  }

  if (current.designCatalog !== previous.designCatalog) {
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
  const revisionsSelector = selectProjectRevisions(projectKey);
  const revisions = useAppSelector(revisionsSelector);
  const previousRevisionsRef = useRef(revisions);
  const removalHandledRef = useRef(false);

  useEffect(() => {
    const previous = previousRevisionsRef.current;
    previousRevisionsRef.current = revisions;

    if (previous === revisions) return;

    const accessMayHaveChanged =
      revisions.project !== previous.project ||
      revisions.members !== previous.members;

    async function applyRealtimeRevision() {
      if (accessMayHaveChanged) {
        try {
          await apiRequest(`/api/projects/${projectKey}`);
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
            return;
          }
        }
      }

      if (routeNeedsServerRefresh(previous, revisions, pathname, projectKey)) {
        router.refresh();
      }
    }

    void applyRealtimeRevision();
  }, [pathname, projectKey, projectName, revisions, router]);

  return children;
}
