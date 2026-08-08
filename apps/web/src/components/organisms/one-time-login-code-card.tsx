"use client";

import { useMemo, useState } from "react";
import { Copy, KeyRound, LoaderCircle, RefreshCw } from "lucide-react";
import { apiRequest, ApiRequestError } from "@/lib/api/api-request";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface IssueLoginCodeResponse {
  code: string;
  expiresAt: string;
}

export function OneTimeLoginCodeCard() {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expiresLabel = useMemo(() => {
    if (!expiresAt) return null;
    const date = new Date(expiresAt);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [expiresAt]);

  async function issueCode() {
    setBusy(true);
    setError(null);
    try {
      const response = await apiRequest<IssueLoginCodeResponse>(
        "/api/auth/login-code/issue",
        { method: "POST" },
      );
      setCode(response.code);
      setExpiresAt(response.expiresAt);
    } catch (cause) {
      if (cause instanceof ApiRequestError) {
        setError(cause.message);
      } else {
        setError("Không thể tạo mã đăng nhập.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-2xl border bg-card/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <KeyRound className="size-4" />
            Mã đăng nhập một lần
          </div>
          <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
            Tạo một mã dùng một lần để đăng nhập trên thiết bị khác. Khi mã được
            sử dụng thành công, hệ thống sẽ xóa ngay mã đó.
          </p>
        </div>
        <Badge variant="outline">One-time</Badge>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => void issueCode()} disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle className="mr-2 size-4 animate-spin" />
              Đang tạo mã
            </>
          ) : code ? (
            <>
              <RefreshCw className="mr-2 size-4" />
              Tạo mã mới
            </>
          ) : (
            "Tạo mã đăng nhập"
          )}
        </Button>
        {code ? (
          <Button type="button" variant="outline" onClick={() => void copyCode()}>
            <Copy className="mr-2 size-4" />
            {copied ? "Đã copy" : "Copy mã"}
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {code ? (
        <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Mã hiện tại
          </div>
          <div className="mt-2 font-heading text-3xl font-black tracking-[0.24em] text-foreground">
            {code}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Hết hạn lúc {expiresLabel}. Mã mới sẽ ghi đè mã cũ.
          </p>
        </div>
      ) : null}
    </div>
  );
}
