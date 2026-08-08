"use client";

import Link from "next/link";
import { KeyRound, LoaderCircle } from "lucide-react";
import { AuthErrorAlert } from "@/components/molecules/auth-error-alert";
import { LoginCodeField } from "@/components/molecules/login-code-field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLoginCodeRedeem } from "@/features/auth/hooks/use-login-code-redeem";

export function DeviceCodeLoginForm() {
  const { code, setCode, busy, error, canSubmit, redeem } = useLoginCodeRedeem();

  return (
    <Card className="rounded-4xl border border-white/80 bg-white/92 shadow-[0_24px_60px_rgba(99,102,241,0.08)] backdrop-blur-xl">
      <CardHeader className="gap-3 border-b border-[#eef2f7] pb-5">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#635bff]">
            <KeyRound className="size-5" />
          </div>
          <div>
            <CardTitle className="font-heading text-2xl font-extrabold text-[#1f2940]">
              Mã đăng nhập
            </CardTitle>
            <CardDescription className="mt-1 leading-6 text-[#7182a3]">
              Mỗi mã chỉ dùng được một lần và sẽ bị xóa sau khi đăng nhập thành
              công.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        <LoginCodeField value={code} onChange={setCode} disabled={busy} />

        <Button
          type="button"
          className="h-12 w-full rounded-2xl bg-[#9f97ee] text-white hover:bg-[#9087ea]"
          disabled={!canSubmit}
          onClick={() => void redeem()}
        >
          {busy ? (
            <>
              <LoaderCircle className="mr-2 size-4 animate-spin" />
              Đang đăng nhập
            </>
          ) : (
            "Đăng nhập bằng mã"
          )}
        </Button>

        {error ? <AuthErrorAlert message={error} /> : null}

        <div className="rounded-3xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] p-4 text-[15px] leading-8 text-[#7182a3]">
          Mã hợp lệ sẽ tạo session cho thiết bị hiện tại ngay khi redeem. Nếu mã
          đã được dùng hoặc hết hạn, bạn cần quay lại thiết bị cũ để tạo mã mới.
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#eef2f7] pt-2 text-sm text-[#7182a3]">
          <Link href="/" className="transition hover:text-[#0f172a]">
            Quay lại đăng nhập thường
          </Link>
          <Link href="/legal" className="transition hover:text-[#0f172a]">
            Legal
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
