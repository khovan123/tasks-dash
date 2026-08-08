import type { ReactNode } from "react";
import { PublicPageShell } from "@/components/templates/public-page-shell";

interface AuthSplitPageProps {
  primary: ReactNode;
  aside: ReactNode;
}

export function AuthSplitPage({ primary, aside }: AuthSplitPageProps) {
  return (
    <PublicPageShell
      className="h-screen"
      containerClassName="max-w-[1160px] py-8"
      contentClassName="justify-center"
    >
      <div className="mx-auto grid w-full max-w-277.5 flex-1 items-center gap-6 overflow-hidden lg:grid-cols-[minmax(0,680px)_380px]">
        {primary}
        {aside}
      </div>
    </PublicPageShell>
  );
}
