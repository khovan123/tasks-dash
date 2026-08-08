import {
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Equal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIORITY_COLOR: Record<string, string> = {
  highest: "text-red-500",
  critical: "text-red-500",
  high: "text-orange-500",
  medium: "text-yellow-500",
  low: "text-sky-500",
  lowest: "text-blue-400",
};

export function PriorityIcon({
  priority,
  className,
}: {
  priority: string;
  className?: string;
}) {
  const norm = (priority ?? "").toLowerCase();
  const color = PRIORITY_COLOR[norm] ?? "text-muted-foreground";
  const base = cn("size-4 shrink-0", color, className);

  switch (norm) {
    case "highest":
    case "critical":
      return <ChevronsUp className={base} />;
    case "high":
      return <ChevronUp className={base} />;
    case "medium":
      return <Equal className={base} />;
    case "low":
      return <ChevronDown className={base} />;
    case "lowest":
      return <ChevronsDown className={base} />;
    default:
      return null;
  }
}

export const PRIORITY_LABELS: Record<string, string> = {
  HIGHEST: "Highest",
  highest: "Highest",
  CRITICAL: "Critical",
  critical: "Critical",
  HIGH: "High",
  high: "High",
  MEDIUM: "Medium",
  medium: "Medium",
  LOW: "Low",
  low: "Low",
  LOWEST: "Lowest",
  lowest: "Lowest",
};
