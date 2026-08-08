"use client";

import { useState } from "react";
import type { RedeemLoginCodeResponse } from "@/features/auth/types";
import {
  LOGIN_CODE_REDEEM_ENDPOINT,
  loginCodeErrorMessage,
  normalizeLoginCode,
} from "@/features/auth/lib/login-code";
import { apiRequest } from "@/lib/api/api-request";

export function useLoginCodeRedeem() {
  const [code, setCodeState] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setCode(value: string): void {
    setCodeState(normalizeLoginCode(value));
    if (error) setError(null);
  }

  async function redeem(): Promise<void> {
    const normalizedCode = code.trim();
    if (!normalizedCode || busy) return;

    setBusy(true);
    setError(null);
    try {
      const response = await apiRequest<RedeemLoginCodeResponse>(
        LOGIN_CODE_REDEEM_ENDPOINT,
        {
          method: "POST",
          body: JSON.stringify({ code: normalizedCode }),
        },
      );
      window.location.assign(response.redirectUrl);
    } catch (cause) {
      setError(loginCodeErrorMessage(cause, "Không thể đăng nhập bằng mã này."));
    } finally {
      setBusy(false);
    }
  }

  return {
    code,
    setCode,
    busy,
    error,
    canSubmit: Boolean(code.trim()) && !busy,
    redeem,
  };
}
