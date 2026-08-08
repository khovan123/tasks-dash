import { User } from "lucide-react";
import { MemberAvatar } from "@/components/molecules/member-avatar";
import type { WorkItemMember } from "@/features/work-items/types";

export function WorkItemAssigneeAvatar({
  member,
  presence,
  size = "sm",
  showUnassigned = false,
}: {
  member?: WorkItemMember | null;
  presence?: string;
  size?: "sm" | "md";
  showUnassigned?: boolean;
}) {
  if (!member) {
    return showUnassigned ? (
      <span
        className="flex size-5 items-center justify-center rounded-full border bg-muted text-[8px] text-muted-foreground"
        title="Unassigned"
      >
        <User className="size-3" />
      </span>
    ) : null;
  }

  const isMedium = size === "md";
  return (
    <MemberAvatar
      memberId={member.id}
      name={member.name}
      email={member.email}
      avatarUrl={member.avatarUrl}
      githubLogin={member.githubLogin}
      discordUsername={member.discordUsername}
      className={isMedium ? "size-7" : "size-5"}
      fallbackClassName={
        isMedium
          ? "text-[10px] font-black"
          : "bg-primary text-[8px] font-black text-primary-foreground"
      }
      title={`Assigned to ${member.name}`}
      presence={presence}
    />
  );
}
