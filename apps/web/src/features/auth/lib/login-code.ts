import { ApiRequestError } from "@/lib/api/api-request";

export const LOGIN_CODE_ISSUE_ENDPOINT = "/api/auth/login-code/issue";
export const LOGIN_CODE_REDEEM_ENDPOINT = "/api/auth/login-code/redeem";

export function normalizeLoginCode(value: string): string {
  return value.toUpperCase();
}

export function loginCodeErrorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiRequestError ? cause.message : fallback;
}
