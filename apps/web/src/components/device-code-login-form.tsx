"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, KeyRound, LoaderCircle } from "lucide-react";
import { ApiRequestError, apiRequest } from "@/lib/api/api-request";
import { PublicPageShell } from "@/components/public-page-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface DeviceStartResponse {
  redirectUrl: string;
}

const STEPS = [
  "Trên thiết bị đã đăng nhập, mở Account settings và tạo mã đăng nhập dùng một lần.",
  "Trên thiết bị mới, nhập đúng mã đó để hệ thống xác thực tài khoản.",
  "Redeem thành công sẽ tạo session, set cookie và xóa mã ngay lập tức.",
] as const;

export function DeviceCodeLoginForm() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function redeemLoginCode() {
    setBusy(true);
    setError(null);
    try {
      const response = await apiRequest<DeviceStartResponse>(
        "/api/auth/login-code/redeem",
        {
          method: "POST",
          body: JSON.stringify({ code: code.trim() }),
        },
      );
      window.location.assign(response.redirectUrl);
    } catch (cause) {
      if (cause instanceof ApiRequestError) {
        setError(cause.message);
      } else {
        setError("Không thể đăng nhập bằng mã này.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicPageShell
      className="h-screen"
      containerClassName="max-w-[1160px] py-8"
      contentClassName="justify-center"
    >
      <div className="mx-auto grid w-full max-w-277.5 flex-1 items-center gap-6 overflow-hidden lg:grid-cols-[minmax(0,680px)_380px]">
        <section className="rounded-4xl border border-white/80 bg-white/88 px-7 py-8 shadow-[0_24px_60px_rgba(99,102,241,0.08)] backdrop-blur-xl sm:px-9 sm:py-9">
          <div className="mb-4 inline-flex rounded-full border border-[#c7d2fe] bg-[#eef2ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#635bff]">
            <KeyRound className="mr-2 size-3.5" />
            One-Time Login Code
          </div>
          <h1 className="max-w-140 font-heading text-3xl font-extrabold leading-[1.08] text-[#1f2940] sm:text-[3.2rem]">
            Đăng nhập bằng mã dùng một lần mà vẫn nhận đủ session trên thiết bị
            mới.
          </h1>
          <p className="mt-4 max-w-147.5 text-[15px] leading-8 text-[#7182a3]">
            Mã đăng nhập được tạo từ tài khoản đã đăng nhập sẵn trong Tasks
            Dash. Khi redeem thành công, hệ thống sẽ set session cookie trên
            thiết bị hiện tại và xóa mã ngay sau khi dùng.
          </p>

          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <div
                key={step}
                className="rounded-[1.45rem] border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
              >
                <div className="mb-3 inline-flex size-8 items-center justify-center rounded-full bg-[#eef2ff] text-sm font-bold text-[#635bff]">
                  {index + 1}
                </div>
                <p className="text-[15px] leading-8 text-[#7182a3]">{step}</p>
              </div>
            ))}
          </div>
        </section>

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
                  Mỗi mã chỉ dùng được một lần và sẽ bị xóa sau khi đăng nhập
                  thành công.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#334155]">
                Nhập mã đăng nhập một lần
              </label>
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="TD-ABC-123-XYZ"
                className="h-12 rounded-2xl border-[#e2e8f0] bg-[#f8fafc] text-[#334155] placeholder:text-[#94a3b8]"
                disabled={busy}
              />
            </div>

            <Button
              type="button"
              className="h-12 w-full rounded-2xl bg-[#9f97ee] text-white hover:bg-[#9087ea]"
              disabled={!code.trim() || busy}
              onClick={() => void redeemLoginCode()}
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

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            <div className="rounded-3xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] p-4 text-[15px] leading-8 text-[#7182a3]">
              Mã hợp lệ sẽ tạo session cho thiết bị hiện tại ngay khi redeem.
              Nếu mã đã được dùng hoặc hết hạn, bạn cần quay lại thiết bị cũ để
              tạo mã mới.
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
      </div>
    </PublicPageShell>
  );
}
