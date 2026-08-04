import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
export function Badge({ children, className }: { children: ReactNode; className?: string }) { return <span className={cn("inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600", className)}>{children}</span>; }
