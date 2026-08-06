"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Github, MailWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api/api-request";
import { Spinner } from "@/components/ui/spinner";
import { Loading } from "@/components/ui/loading";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function InvitePageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [discordUsername, setDiscordUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const valid = Boolean(token && token.length >= 20 && token.length <= 256);
  const loginUrl = `/api/auth/github/login?invite=${encodeURIComponent(token || "")}&discordUsername=${encodeURIComponent(discordUsername.trim())}`;

  const handleNext = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (!discordUsername.trim() || validating) return;

    setValidating(true);
    setError(null);

    try {
      await apiRequest("/api/auth/invite/validate-discord", {
        method: "POST",
        body: JSON.stringify({
          invite: token,
          discordUsername: discordUsername.trim(),
        }),
      });

      // If validation succeeds, proceed to login/OAuth redirect
      window.location.href = loginUrl;
    } catch (err: any) {
      console.error(err);
      setError(
        err.message ||
          "Không thể xác thực tài khoản Discord. Vui lòng kiểm tra lại Username của bạn.",
      );
    } finally {
      setValidating(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10 bg-background/40">
      <Card className="w-full max-w-lg border-primary/20 shadow-xl shadow-primary/10">
        <CardHeader className="items-center text-center">
          <img
            src="/assets/images/logo.png"
            alt="Tasks Dash Logo"
            className="mb-2 size-16 rounded-2xl object-contain"
          />
          <Badge variant={valid ? "purple" : "destructive"}>
            WORKSPACE INVITATION
          </Badge>
          <CardTitle className="text-3xl">Tham gia Tasks Dash</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            {valid
              ? "Đăng nhập bằng GitHub có email đã được mời. Lời mời chỉ được sử dụng một lần."
              : "Link lời mời không hợp lệ hoặc đã bị cắt mất token."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 w-full items-center">
          {valid ? (
            <>
              <div className="w-full space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Username Discord của bạn (Yêu cầu để tham gia server Discord)
                </label>
                <Input
                  type="text"
                  placeholder="Ví dụ: johndoe hoặc johndoe#1234"
                  value={discordUsername}
                  onChange={(e) => setDiscordUsername(e.target.value)}
                  className="w-full bg-background/50"
                  disabled={validating}
                  required
                />
              </div>

              {error && (
                <div className="w-full p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium leading-relaxed border border-destructive/20">
                  ⚠️ {error}
                </div>
              )}

              <Button
                asChild
                size="lg"
                className="w-full"
                disabled={!discordUsername.trim() || validating}
              >
                <a href={loginUrl} onClick={handleNext}>
                  {validating ? (
                    <>
                      <Spinner className="mr-2" /> Đang kiểm tra Discord...
                    </>
                  ) : (
                    <>
                      <Github data-icon="inline-start" /> Tiếp tục với GitHub
                    </>
                  )}
                </a>
              </Button>
            </>
          ) : (
            <MailWarning className="size-12 text-destructive" />
          )}
        </CardContent>
        <CardFooter className="justify-center text-center text-sm text-muted-foreground flex flex-col gap-2">
          <p>
            Email GitHub đã xác minh phải trùng chính xác với email trong lời
            mời.
          </p>
          {valid && (
            <p className="text-xs text-primary font-semibold mt-2">
              💡 Sau khi kết nối, Bot sẽ tự động phân vai trò tương ứng và giới
              hạn quyền truy cập các kênh dự án (Project Category) của bạn.
            </p>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-background/40">
          <Loading message="Đang tải thông tin lời mời..." />
        </main>
      }
    >
      <InvitePageContent />
    </Suspense>
  );
}
