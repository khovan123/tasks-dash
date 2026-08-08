import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function DiscordChannelRow({
  id,
  name,
  label,
}: {
  id?: string | null;
  name?: string | null;
  label: string;
}) {
  if (!id) return null;

  return (
    <div className="flex items-center gap-2">
      <MessageCircle className="size-3.5 text-muted-foreground" />
      <span className="text-sm font-medium">#{name ?? id}</span>
      <Badge variant="outline" className="h-4 px-1 py-0 text-[9px]">
        {label}
      </Badge>
    </div>
  );
}
