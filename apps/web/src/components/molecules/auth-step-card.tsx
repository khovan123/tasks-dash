import type { ReactNode } from "react";

interface AuthStepCardProps {
  index: number;
  children: ReactNode;
}

export function AuthStepCard({ index, children }: AuthStepCardProps) {
  return (
    <div className="rounded-[1.45rem] border border-[#e5e7eb] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
      <div className="mb-3 inline-flex size-8 items-center justify-center rounded-full bg-[#eef2ff] text-sm font-bold text-[#635bff]">
        {index}
      </div>
      <p className="text-[15px] leading-8 text-[#7182a3]">{children}</p>
    </div>
  );
}
