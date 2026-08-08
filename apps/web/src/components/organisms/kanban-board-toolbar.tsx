import { Search } from "lucide-react";
import { MemberAvatar } from "@/components/molecules/member-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WorkItemMember } from "@/features/work-items/types";
import { cn } from "@/lib/utils";

export function KanbanBoardToolbar({
  searchQuery,
  onSearchChange,
  members,
  selectedAssigneeId,
  onAssigneeChange,
  presenceByMemberId,
  canCompleteSprint,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  members: WorkItemMember[];
  selectedAssigneeId: string | null;
  onAssigneeChange: (memberId: string | null) => void;
  presenceByMemberId: Record<string, string>;
  canCompleteSprint: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search board"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-9 pl-9"
          />
        </div>

        <div className="flex items-center -space-x-1 overflow-hidden border-l border-r px-2 py-1">
          <button
            type="button"
            onClick={() => onAssigneeChange(null)}
            className={cn(
              "relative z-10 flex size-7 items-center justify-center rounded-full border border-background bg-muted text-xs font-semibold transition hover:scale-105",
              selectedAssigneeId === null && "ring-2 ring-primary ring-offset-1",
            )}
            title="All Members"
          >
            All
          </button>
          {members.map((member) => {
            const isSelected = selectedAssigneeId === member.id;
            return (
              <button
                type="button"
                key={member.id}
                onClick={() => onAssigneeChange(member.id)}
                className={cn(
                  "flex size-7 items-center justify-center overflow-hidden rounded-full border border-background transition hover:scale-105",
                  isSelected && "z-20 ring-2 ring-primary ring-offset-1",
                )}
                title={member.name}
              >
                <MemberAvatar
                  memberId={member.id}
                  name={member.name}
                  avatarUrl={member.avatarUrl}
                  className="size-7 border-0"
                  fallbackClassName="bg-primary text-[10px] font-black text-primary-foreground"
                  presence={presenceByMemberId[member.id]}
                />
              </button>
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onSearchChange("");
            onAssigneeChange(null);
          }}
          className="text-xs"
        >
          Clear filters
        </Button>
      </div>

      {canCompleteSprint ? (
        <Button size="sm" variant="secondary">
          Complete sprint
        </Button>
      ) : null}
    </div>
  );
}
