"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiRequest, ApiRequestError } from "@/lib/api/api-request";
import { useAppSelector } from "@/lib/store/hooks";
import {
  selectProjectDeleted,
  selectProjectRevisions,
} from "@/lib/store/realtime-slice";

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
  const projectDeleted = useAppSelector(selectProjectDeleted(projectKey));
  const previousMembersRevisionRef = useRef(revisions.members);
  const removalHandledRef = useRef(false);

  useEffect(() => {
    if (!projectDeleted) return;
    if (!removalHandledRef.current) {
      removalHandledRef.current = true;
      toast.error(`Dự án ${projectName} không còn khả dụng.`);
    }
    router.replace("/");
  }, [projectDeleted, projectName, router]);

  useEffect(() => {
    const membersChanged = revisions.members !== previousMembersRevisionRef.current;
    previousMembersRevisionRef.current = revisions.members;
    if (!membersChanged || projectDeleted) return;

    async function verifyMembership() {
      try {
        await apiRequest(`/api/projects/${projectKey}`);
        // Role-dependent controls still come from server page loaders. This is
        // the only realtime path that still requires a server refresh.
        router.refresh();
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

    void verifyMembership();
  }, [projectDeleted, projectKey, projectName, revisions.members, router]);

  return children;
}
