import { Badge } from "@/components/ui/badge";

export function WorkItemLabels({ labels }: { labels?: string[] }) {
  if (!labels?.length) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((label) => (
        <Badge
          key={label}
          variant="outline"
          className="border bg-muted/10 px-1 py-0 text-[9px] text-muted-foreground"
        >
          {label}
        </Badge>
      ))}
    </div>
  );
}
