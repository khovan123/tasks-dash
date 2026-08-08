import { DeviceCodeLoginForm } from "@/components/organisms/device-code-login-form";
import { LoginCodeIntro } from "@/components/organisms/login-code-intro";
import { AuthSplitPage } from "@/components/templates/auth-split-page";

export const dynamic = "force-dynamic";

export default function LoginCodePage() {
  return (
    <AuthSplitPage
      primary={<LoginCodeIntro />}
      aside={<DeviceCodeLoginForm />}
    />
  );
}
