"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Github, MailWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const [error, setError] = useState<string | null>(null);

  const valid = Boolean(token && token.length >= 20 && token.length <= 256);
  const loginUrl = `/api/auth/github/login?invite=${encodeURIComponent(token || "")}`;

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
              ? "Chấp nhận lời mời tham gia workspace bằng cách đăng nhập tài khoản GitHub của bạn. Lời mời chỉ có hiệu lực một lần."
              : "Link lời mời không hợp lệ hoặc đã bị cắt mất token."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 w-full items-center">
          {valid ? (
            <>
              {error && (
                <div className="w-full p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium leading-relaxed border border-destructive/20">
                  ⚠️ {error}
                </div>
              )}

              <Button asChild size="lg" className="w-full">
                <a href={loginUrl}>
                  <Github data-icon="inline-start" /> Tiếp tục với GitHub
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
              💡 Sau khi đăng nhập GitHub, bạn sẽ được tự động chuyển tiếp đến
              liên kết tài khoản Discord để đồng bộ phân quyền và nhận thông báo
              dự án.
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
