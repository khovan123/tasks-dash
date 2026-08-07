import "server-only";
import { redirect } from "next/navigation";
import { ApiDataError, apiData, apiResponse } from "./api-data";

export function redirectIfProjectAccessLost(error: unknown): never | void {
  if (
    error instanceof ApiDataError &&
    (error.status === 403 || error.status === 404)
  ) {
    redirect("/");
  }
}

export async function apiProjectData<T>(path: string): Promise<T> {
  try {
    return await apiData<T>(path);
  } catch (error) {
    redirectIfProjectAccessLost(error);
    throw error;
  }
}

export async function apiProjectResponse(path: string): Promise<Response> {
  const response = await apiResponse(path);
  if (response.status === 403 || response.status === 404) {
    redirect("/");
  }
  return response;
}
