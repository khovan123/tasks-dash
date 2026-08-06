"use client";

import Link from "next/link";
import { ArrowRight, Github, LaptopMinimalCheck } from "lucide-react";
import { PublicPageShell } from "@/components/public-page-shell";

interface UnauthenticatedHomeProps {
  loginUrl: string;
  deviceLoginHref: string;
}

export function UnauthenticatedHome({
  loginUrl,
  deviceLoginHref,
}: UnauthenticatedHomeProps) {
  return (
    <PublicPageShell>
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
            <a
              href={loginUrl}
              className="group rounded-[1.75rem] border border-primary/20 bg-primary px-6 py-6 text-primary-foreground shadow-[0_20px_50px_rgba(99,102,241,0.28)] transition hover:-translate-y-1 hover:bg-primary/95 hover:shadow-[0_26px_60px_rgba(99,102,241,0.34)]"
            >
              <div className="flex items-start gap-4 text-left">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/14 ring-1 ring-white/15">
                  <Github className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-bold leading-tight">
                    Đăng nhập với GitHub
                  </div>
                  <p className="mt-2 text-sm leading-6 text-primary-foreground/78">
                    OAuth đầy đủ để vào Tasks Dash và đồng bộ workspace.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">
                    Tiếp tục
                    <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </a>

            <Link
              href={deviceLoginHref}
              className="group rounded-[1.75rem] border border-border/80 bg-card/80 px-6 py-6 text-foreground shadow-sm transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl"
            >
              <div className="flex items-start gap-4 text-left">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10">
                  <LaptopMinimalCheck className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-bold leading-tight">
                    Đăng nhập bằng mã
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Dành cho tài khoản đã có mã đăng nhập dùng một lần được tạo
                    sẵn.
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    Mở flow
                    <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </Link>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            Đăng nhập bằng mã chỉ áp dụng cho tài khoản đã có mã được tạo sẵn.
          </p>
        </div>
      </section>
    </PublicPageShell>
  );
}
