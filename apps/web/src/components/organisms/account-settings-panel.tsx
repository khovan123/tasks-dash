import { Github, Mail, User2 } from "lucide-react";
import { DiscordUsernameForm } from "@/components/organisms/discord-username-form";
import { OneTimeLoginCodeCard } from "@/components/organisms/one-time-login-code-card";
import { FormCard } from "@/components/organisms/form-card";
import { LabeledValueCard } from "@/components/molecules/labeled-value-card";
import type { AccountProfile, AccountSession } from "@/features/account/types";

export function AccountSettingsPanel({
  session,
  profile,
}: {
  session: AccountSession;
  profile: AccountProfile;
}) {
  return (
    <FormCard
      title="Thông tin đăng nhập"
      description="Tạo mã đăng nhập dùng một lần để đăng nhập trên thiết bị khác mà vẫn nhận đủ session và cookie."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <LabeledValueCard
          icon={<User2 className="size-4" />}
          label="Tên hiển thị"
          value={session.name || session.login}
        />
        <LabeledValueCard
          icon={<Github className="size-4" />}
          label="GitHub login"
          value={`@${session.login}`}
        />
        <LabeledValueCard
          icon={<Mail className="size-4" />}
          label="Email"
          value={session.email}
        />
        <DiscordUsernameForm
          initialDiscordUsername={profile.discordUsername}
        />
      </div>

      <OneTimeLoginCodeCard />
    </FormCard>
  );
}
