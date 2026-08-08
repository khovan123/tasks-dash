"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  selectProject,
  upsertProjectDetail,
  type RealtimeProject,
} from "@/lib/store/realtime-slice";

export function useRealtimeProject(
  projectKey: string,
  initialProject: RealtimeProject,
): RealtimeProject {
  const dispatch = useAppDispatch();
  const project = useAppSelector(selectProject(projectKey));

  useEffect(() => {
    dispatch(upsertProjectDetail(initialProject));
  }, [dispatch, initialProject]);

  return project ?? initialProject;
}
