import { KeyRound } from "lucide-react";
import { AuthStepCard } from "@/components/molecules/auth-step-card";

const STEPS = [
  "Trên thiết bị đã đăng nhập, mở Account settings và tạo mã đăng nhập dùng một lần.",
  "Trên thiết bị mới, nhập đúng mã đó để hệ thống xác thực tài khoản.",
  "Redeem thành công sẽ tạo session, set cookie và xóa mã ngay lập tức.",
] as const;

export function LoginCodeIntro() {
  return (
    <section className="rounded-4xl border border-white/80 bg-white/88 px-7 py-8 shadow-[0_24px_60px_rgba(99,102,241,0.08)] backdrop-blur-xl sm:px-9 sm:py-9">
      <div className="mb-4 inline-flex rounded-full border border-[#c7d2fe] bg-[#eef2ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#635bff]">
        <KeyRound className="mr-2 size-3.5" />
        One-Time Login Code
      </div>
      <h1 className="max-w-140 font-heading text-3xl font-extrabold leading-[1.08] text-[#1f2940] sm:text-[3.2rem]">
        Đăng nhập bằng mã dùng một lần mà vẫn nhận đủ session trên thiết bị mới.
      </h1>
      <p className="mt-4 max-w-147.5 text-[15px] leading-8 text-[#7182a3]">
        Mã đăng nhập được tạo từ tài khoản đã đăng nhập sẵn trong Tasks Dash.
        Khi redeem thành công, hệ thống sẽ set session cookie trên thiết bị hiện
        tại và xóa mã ngay sau khi dùng.
      </p>

      <div className="mt-7 grid gap-3 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <AuthStepCard key={step} index={index + 1}>
            {step}
          </AuthStepCard>
        ))}
      </div>
    </section>
  );
}
