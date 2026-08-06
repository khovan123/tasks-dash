"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Github, MailWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const valid = Boolean(token && token.length >= 20 && token.length <= 256);
  const loginUrl = `/api/auth/github/login?invite=${encodeURIComponent(token || "")}&discordUsername=${encodeURIComponent(discordUsername.trim())}`;

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
                  required
                />
              </div>

              <Button asChild size="lg" className="w-full" disabled={!discordUsername.trim()}>
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
          <p>Email GitHub đã xác minh phải trùng chính xác với email trong lời mời.</p>
          {valid && (
            <p className="text-xs text-primary font-semibold mt-2">
              💡 Sau khi kết nối, Bot sẽ tự động phân vai trò tương ứng và giới hạn quyền truy cập các kênh dự án (Project Category) của bạn.
            </p>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <main className="grid min-h-screen place-items-center bg-background/40">
        <div className="text-sm text-muted-foreground animate-pulse">Đang tải thông tin lời mời...</div>
      </main>
    }>
      <InvitePageContent />
    </Suspense>
  );
}
