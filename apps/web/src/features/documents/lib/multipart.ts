export async function uploadMultipart(
  path: string,
  data: FormData,
): Promise<void> {
  const response = await fetch(path, { method: "POST", body: data });
  const payload = (await response.json().catch(() => null)) as
    | { ok: true }
    | { ok: false; problem?: { detailKey?: string } }
    | null;

  if (!response.ok || !payload || payload.ok !== true) {
    throw new Error(
      payload && "problem" in payload
        ? (payload.problem?.detailKey ?? "Upload thất bại.")
        : "Upload thất bại.",
    );
  }
}
