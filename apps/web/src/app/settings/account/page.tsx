import { Github, Mail, Shield, User2 } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { OneTimeLoginCodeCard } from "@/components/one-time-login-code-card";
import { DiscordUsernameForm } from "@/components/discord-username-form";
import { apiData } from "@/lib/server/api-data";
import { AppPage, FormCard, PageHero } from "@/components/layout/app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface Session {
  login: string;
  name: string;
  email: string;
  avatarUrl: string;
  workspaceId: string;
}

interface MyProfile {
  discordUsername: string | null;
}

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default async function AccountSettingsPage() {
  const [session, myProfile] = await Promise.all([
    apiData<Session>("/auth/me"),
    apiData<MyProfile>("/workspace/me").catch(() => ({
      discordUsername: null,
    })),
  ]);

  return (
    <AppPage>
      <FormCard
        title="Thông tin đăng nhập"
        description="Tạo mã đăng nhập dùng một lần để đăng nhập trên thiết bị khác mà vẫn nhận đủ session và cookie."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-card/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <User2 className="size-4" />
              Tên hiển thị
            </div>
            <div className="mt-2 text-lg font-bold">
              {session.name || session.login}
            </div>
          </div>
          <div className="rounded-2xl border bg-card/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Github className="size-4" />
              GitHub login
            </div>
            <div className="mt-2 text-lg font-bold">@{session.login}</div>
          </div>
          <div className="rounded-2xl border bg-card/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Mail className="size-4" />
              Email
            </div>
            <div className="mt-2 text-lg font-bold">{session.email}</div>
          </div>

          <DiscordUsernameForm
            initialDiscordUsername={myProfile.discordUsername}
          />
        </div>

        <OneTimeLoginCodeCard />
      </FormCard>
    </AppPage>
  );
}
