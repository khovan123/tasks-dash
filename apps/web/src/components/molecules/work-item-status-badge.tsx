import { Badge } from "@/components/ui/badge";

export function WorkItemStatusBadge({
  statusId,
  name,
  color,
}: {
  statusId: string;
  name?: string;
  color?: string;
}) {
  const label = name ?? statusId;

  return color ? (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
      style={{ background: color }}
    >
      {label}
    </span>
  ) : (
    <Badge variant="secondary" className="text-[11px]">
      {label}
    </Badge>
  );
}
