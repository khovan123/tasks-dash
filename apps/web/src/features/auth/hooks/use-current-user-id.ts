"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api/api-request";

interface CurrentUserResponse {
  userId?: string;
}

export function useCurrentUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void apiRequest<CurrentUserResponse>("/api/auth/me")
      .then((response) => {
        if (active) setUserId(response.userId ?? null);
      })
      .catch(() => {
        if (active) setUserId(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return userId;
}
