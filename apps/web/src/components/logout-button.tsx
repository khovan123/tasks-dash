"use client";

import { apiRequest } from "@/lib/api/api-request";

export function LogoutButton() {
  async function logout(): Promise<void> {
    await apiRequest<void>("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  return <button className="ghost" onClick={() => void logout()}>Đăng xuất</button>;
}
