export type MutationResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function mutationErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function mutationSuccess<T>(data: T): MutationResult<T> {
  return { ok: true, data };
}

export function mutationFailure<T = never>(error: string): MutationResult<T> {
  return { ok: false, error };
}
