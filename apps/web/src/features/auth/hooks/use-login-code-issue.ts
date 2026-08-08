"use client";

import { useMemo, useState } from "react";
import type { IssueLoginCodeResponse } from "@/features/auth/types";
import {
  LOGIN_CODE_ISSUE_ENDPOINT,
  loginCodeErrorMessage,
} from "@/features/auth/lib/login-code";
import { apiRequest } from "@/lib/api/api-request";

export function useLoginCodeIssue() {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expiresLabel = useMemo(() => {
    if (!expiresAt) return null;
    return new Date(expiresAt).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [expiresAt]);

  async function issue(): Promise<void> {
    if (busy) return;

    setBusy(true);
    setError(null);
    try {
      const response = await apiRequest<IssueLoginCodeResponse>(
        LOGIN_CODE_ISSUE_ENDPOINT,
        { method: "POST" },
      );
      setCode(response.code);
      setExpiresAt(response.expiresAt);
      setCopied(false);
    } catch (cause) {
      setError(loginCodeErrorMessage(cause, "Không thể tạo mã đăng nhập."));
    } finally {
      setBusy(false);
    }
  }

  async function copy(): Promise<void> {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return {
    code,
    expiresLabel,
    busy,
    copied,
    error,
    issue,
    copy,
  };
}
