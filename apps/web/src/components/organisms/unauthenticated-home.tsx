"use client";

import { Github, LaptopMinimalCheck } from "lucide-react";
import { AuthOptionCard } from "@/components/molecules/auth-option-card";

interface UnauthenticatedHomeProps {
  loginUrl: string;
  deviceLoginHref: string;
}

export function UnauthenticatedHome({
  loginUrl,
  deviceLoginHref,
}: UnauthenticatedHomeProps) {
  return (
    <section className="glass-card mb-8 rounded-4xl px-6 py-8 sm:px-10 sm:py-12">
      <div className="mx-auto max-w-3xl text-center">
        <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
          <div className="absolute -inset-2 rounded-full bg-linear-to-br from-primary/35 via-primary/15 to-info/20 blur-2xl" />
          <img
            src="/assets/images/logo.png"
            alt="Tasks Dash Logo"
            className="relative z-10 h-22 w-22 rounded-[1.7rem] border border-white/20 bg-card object-contain p-1 shadow-xl"
          />
        </div>

        <h1 className="gradient-title text-4xl font-extrabold leading-tight sm:text-5xl">
          Tasks Dash
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
          Hệ thống quản trị và phân phối công việc cao cấp. Kết nối GitHub
          Workspace, tự động hóa kênh Discord và đồng bộ hóa tiến trình dự án.
        </p>

        <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
          <AuthOptionCard
            href={loginUrl}
            icon={<Github className="size-5" />}
            title="Đăng nhập với GitHub"
            description="OAuth đầy đủ để vào Tasks Dash và đồng bộ workspace."
            action="Tiếp tục"
            variant="primary"
          />
          <AuthOptionCard
            href={deviceLoginHref}
            icon={<LaptopMinimalCheck className="size-5" />}
            title="Đăng nhập bằng mã"
            description="Dành cho tài khoản đã có mã đăng nhập dùng một lần được tạo sẵn."
            action="Mở flow"
          />
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Đăng nhập bằng mã chỉ áp dụng cho tài khoản đã có mã được tạo sẵn.
        </p>
      </div>
    </section>
  );
}
