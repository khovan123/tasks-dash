import "server-only";

import type { AccountProfile, AccountSession } from "@/features/account/types";
import { apiData } from "@/lib/server/api-data";

export async function loadAccountSettings() {
  const [session, profile] = await Promise.all([
    apiData<AccountSession>("/auth/me"),
    apiData<AccountProfile>("/workspace/me").catch(() => ({
      discordUsername: null,
    })),
  ]);

  return { session, profile };
}
