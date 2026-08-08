"use client";

import { Copy, KeyRound, LoaderCircle, RefreshCw } from "lucide-react";
import { AuthErrorAlert } from "@/components/molecules/auth-error-alert";
import { LoginCodeDisplay } from "@/components/molecules/login-code-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLoginCodeIssue } from "@/features/auth/hooks/use-login-code-issue";

export function OneTimeLoginCodeCard() {
  const { code, expiresLabel, busy, copied, error, issue, copy } =
    useLoginCodeIssue();

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
        <Button type="button" onClick={() => void issue()} disabled={busy}>
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
          <Button type="button" variant="outline" onClick={() => void copy()}>
            <Copy className="mr-2 size-4" />
            {copied ? "Đã copy" : "Copy mã"}
          </Button>
        ) : null}
      </div>

      {error ? <AuthErrorAlert message={error} className="mt-4" /> : null}

      {code ? (
        <div className="mt-4">
          <LoginCodeDisplay code={code} expiresLabel={expiresLabel} />
        </div>
      ) : null}
    </div>
  );
}
