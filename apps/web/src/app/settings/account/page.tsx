import { AccountSettingsPanel } from "@/components/organisms/account-settings-panel";
import { AppPage } from "@/components/templates/app-page";
import { loadAccountSettings } from "@/features/account/server/load-account-settings";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const context = await loadAccountSettings();

  return (
    <AppPage>
      <AccountSettingsPanel
        session={context.session}
        profile={context.profile}
      />
    </AppPage>
  );
}
