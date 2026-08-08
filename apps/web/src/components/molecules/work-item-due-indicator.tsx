import { AlertCircle, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getWorkItemDueState } from "@/features/work-items/lib/due-state";
import { cn } from "@/lib/utils";

export function WorkItemDueIndicator({
  dueDate,
  variant = "badge",
}: {
  dueDate?: string;
  variant?: "badge" | "compact";
}) {
  const { date, isOverdue, isDueSoon } = getWorkItemDueState(dueDate);
  if (!date) return null;

  const title = isOverdue ? "Overdue!" : isDueSoon ? "Due soon" : "Due date";
  const tone = isOverdue
    ? "text-destructive"
    : isDueSoon
      ? "text-warning"
      : "text-muted-foreground";

  if (variant === "compact") {
    return (
      <span
        className={cn(
          "flex items-center gap-1 text-[10px]",
          tone,
          (isOverdue || isDueSoon) && "font-semibold",
        )}
        title={title}
      >
        <Clock className="size-3" />
        <span>
          {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </span>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-[10px]",
        isOverdue
          ? "border-destructive text-destructive"
          : isDueSoon
            ? "border-warning text-warning"
            : "text-muted-foreground",
      )}
      title={title}
    >
      {isOverdue ? (
        <>
          <AlertCircle className="size-3" />
          <span>Overdue</span>
        </>
      ) : isDueSoon ? (
        <>
          <Clock className="size-3" />
          <span>Due soon</span>
        </>
      ) : (
        <>
          <Calendar className="size-3" />
          <span>
            {date.toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
            })}
          </span>
        </>
      )}
    </Badge>
  );
}
