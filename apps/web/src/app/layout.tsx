import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./github-links.css";
import "./drive.css";

export const metadata: Metadata = {
  title: "Tasks Dash",
  description: "Production multi-project delivery workspace",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
