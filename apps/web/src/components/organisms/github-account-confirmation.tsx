"use client";

import { useState } from "react";
import { Github, LogIn, RefreshCcw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface GithubAccountConfirmationSession {
  name: string;
  login: string;
  email: string;
  avatarUrl: string;
}

export function GithubAccountConfirmation({
  session,
}: {
  session: GithubAccountConfirmationSession;
}) {
  const [busyAction, setBusyAction] = useState<"confirm" | "switch" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function confirmAccount(): Promise<void> {
    setBusyAction("confirm");
    setError(null);
    try {
      const response = await fetch("/api/auth/github/confirm-account", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      window.location.replace("/workspaces");
    } catch {
      setError("Không thể xác nhận GitHub account. Vui lòng thử lại.");
      setBusyAction(null);
    }
  }

  async function chooseAnotherAccount(): Promise<void> {
    setBusyAction("switch");
    setError(null);
    try {
      // Revoke the just-selected GitHub grant and remove the Tasks Dash
      // session before starting a fresh account-picker cycle.
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      window.location.replace("/api/auth/github/login?switch=1");
    } catch {
      setError("Không thể đổi GitHub account. Vui lòng thử lại.");
      setBusyAction(null);
    }
  }

  const initials = (session.name || session.login)
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg border-primary/20 shadow-xl shadow-primary/10">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Github className="size-6" />
          </div>
          <CardTitle className="text-2xl">Xác nhận GitHub account</CardTitle>
          <CardDescription>
            Tasks Dash chưa mở workspace cho đến khi bạn xác nhận đúng account
            GitHub vừa chọn.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 rounded-2xl border bg-muted/30 p-4">
            <Avatar className="size-12">
              <AvatarImage src={session.avatarUrl} alt={session.login} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{session.name}</p>
              <p className="truncate text-sm text-muted-foreground">
                @{session.login}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {session.email}
              </p>
            </div>
          </div>

          {error ? (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </CardContent>

        <CardFooter className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            disabled={busyAction !== null}
            onClick={() => void chooseAnotherAccount()}
          >
            <RefreshCcw />
            {busyAction === "switch" ? "Đang đổi..." : "Chọn account khác"}
          </Button>
          <Button
            disabled={busyAction !== null}
            onClick={() => void confirmAccount()}
          >
            <LogIn />
            {busyAction === "confirm"
              ? "Đang xác nhận..."
              : `Tiếp tục với @${session.login}`}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
