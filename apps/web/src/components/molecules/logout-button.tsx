"use client";

import { LogOut } from "lucide-react";
import { apiRequest } from "@/lib/api/api-request";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LogoutButton({
  className,
  iconOnly = false,
}: {
  className?: string;
  iconOnly?: boolean;
} = {}) {
  async function logout(): Promise<void> {
    await apiRequest<void>("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  return (
    <Button
      variant="destructive"
      size={iconOnly ? "icon-sm" : "sm"}
      className={cn(className)}
      onClick={() => void logout()}
      aria-label="Đăng xuất"
      title="Đăng xuất"
    >
      <LogOut />
      {iconOnly ? <span className="sr-only">Đăng xuất</span> : "Đăng xuất"}
    </Button>
  );
}
