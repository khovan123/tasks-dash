"use client";

import { LogOut } from "lucide-react";
import { apiRequest } from "@/lib/api/api-request";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  async function logout(): Promise<void> {
    await apiRequest<void>("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  return (
    <Button variant="ghost" size="sm" onClick={() => void logout()}>
      <LogOut /> Đăng xuất
    </Button>
  );
}
