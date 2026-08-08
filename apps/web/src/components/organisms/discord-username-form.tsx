"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  MessageCircle,
  Check,
  Loader2,
  Link2,
  AlertTriangle,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/api-request";

interface Props {
  initialDiscordUsername?: string | null;
}

export function DiscordUsernameForm({ initialDiscordUsername }: Props) {
  const [username, setUsername] = useState(initialDiscordUsername ?? "");
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  // Handle toast/message based on redirect query parameters
  useEffect(() => {
    const status = searchParams.get("discord");
    if (status) {
      if (status === "success") {
        setMessage({
          text: "Liên kết tài khoản Discord thành công!",
          type: "success",
        });
      } else if (status === "stale") {
        setMessage({
          text: "Phiên liên kết đã hết hạn. Vui lòng thử lại.",
          type: "error",
        });
      } else {
        setMessage({
          text: "Liên kết tài khoản Discord thất bại.",
          type: "error",
        });
      }

      // Clean query parameters from URL
      const params = new URLSearchParams(searchParams.toString());
      params.delete("discord");
      router.replace(`/settings/account?${params.toString()}`);
    }
  }, [searchParams, router]);

  async function handleDisconnect() {
    if (!confirm("Bạn có chắc chắn muốn hủy liên kết tài khoản Discord không?"))
      return;
    setDisconnecting(true);
    setMessage(null);
    try {
      await apiRequest("/api/workspace/me", {
        method: "PATCH",
        body: JSON.stringify({ discordUsername: "" }),
      });
      setUsername("");
      setMessage({
        text: "Đã hủy liên kết tài khoản Discord.",
        type: "success",
      });
    } catch (e: unknown) {
      setMessage({
        text: e instanceof Error ? e.message : "Hủy liên kết thất bại.",
        type: "error",
      });
    } finally {
      setDisconnecting(false);
    }
  }

  function handleConnect() {
    window.location.href = "/api/auth/discord/login";
  }

  return (
    <div className="rounded-2xl border bg-card/60 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
        <MessageCircle className="size-4" />
        Tài khoản Discord
      </div>

      {username ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">
            <div className="flex items-center gap-2 text-emerald-500">
              <span className="text-sm font-medium">
                <strong className="font-bold">@{username}</strong>
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-xs text-destructive hover:bg-destructive/10 h-7 px-2"
            >
              {disconnecting ? (
                <Loader2 className="size-3 animate-spin mr-1" />
              ) : (
                <Unlink className="size-3 mr-1" />
              )}
              Hủy liên kết
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Button
            id="discord-connect-btn"
            onClick={handleConnect}
            className="w-full flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium text-sm h-9 rounded-xl transition-colors"
          >
            <Link2 className="size-4" />
            Liên kết tài khoản Discord
          </Button>
        </div>
      )}

      {message && (
        <div
          className={`mt-2 flex items-center gap-2 text-xs rounded-lg p-2 border ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {message.type === "error" && <AlertTriangle className="size-3.5" />}
          <span>{message.text}</span>
        </div>
      )}
    </div>
  );
}
