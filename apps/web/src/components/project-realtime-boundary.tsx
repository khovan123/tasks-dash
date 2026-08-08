"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiRequest, ApiRequestError } from "@/lib/api/api-request";
import { useAppSelector } from "@/lib/store/hooks";
import { selectProjectRevisions } from "@/lib/store/realtime-slice";

export function ProjectRealtimeBoundary({
  children,
  projectKey,
  projectName,
}: {
  children: ReactNode;
  projectKey: string;
  projectName: string;
}) {
  const router = useRouter();
  const revisions = useAppSelector(selectProjectRevisions(projectKey));
  const previousProjectRevisionRef = useRef(revisions.project);
  const previousMembersRevisionRef = useRef(revisions.members);
  const removalHandledRef = useRef(false);

  useEffect(() => {
    const projectChanged = revisions.project !== previousProjectRevisionRef.current;
    const membersChanged = revisions.members !== previousMembersRevisionRef.current;

    previousProjectRevisionRef.current = revisions.project;
    previousMembersRevisionRef.current = revisions.members;

    if (!projectChanged && !membersChanged) return;

    async function verifyAccess() {
      try {
        await apiRequest(`/api/projects/${projectKey}`);
        // Permissions are still resolved by server-rendered page loaders. Refresh
        // only when membership/role changes, never for ordinary project data.
        if (membersChanged) router.refresh();
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
        }
      }
    }

    void verifyAccess();
  }, [projectKey, projectName, revisions.members, revisions.project, router]);

  return children;
}
