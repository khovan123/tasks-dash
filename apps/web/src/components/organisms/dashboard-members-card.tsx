import Link from "next/link";
import { MemberInfoBadge } from "@/components/molecules/member-info-badge";
import { SectionHeading } from "@/components/molecules/section-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { DashboardMember } from "@/features/dashboard/types";

export function DashboardMembersCard({
  members,
  canManageMembers,
}: {
  members: DashboardMember[];
  canManageMembers: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <SectionHeading
          eyebrow="Workspace people"
          title="Current members"
          meta={`${members.length} members`}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {members.slice(0, 8).map((member) => (
          <div key={member.email} className="flex items-center gap-3">
            <MemberInfoBadge
              memberId={member._id}
              name={member.name}
              avatarUrl={member.avatarUrl}
              email={member.email}
              githubLogin={member.githubLogin}
              discordUsername={member.discordUsername}
              presence={member.status}
              avatarClassName="size-9"
              textClassName="text-sm font-semibold"
            />
          </div>
        ))}
      </CardContent>
      {canManageMembers ? (
        <CardFooter>
          <Button asChild variant="ghost" size="sm">
            <Link href="/workspace/members">Quản lý thành viên</Link>
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
