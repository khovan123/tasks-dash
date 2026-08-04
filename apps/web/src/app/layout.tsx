import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tasks Dash",
  description: "Production multi-project delivery workspace",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
