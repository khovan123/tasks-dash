import { MessageCircle } from "lucide-react";
import { DiscordChannelRow } from "@/components/molecules/discord-channel-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  DiscordProjectStatus,
  DiscordWorkspaceStatus,
} from "@/features/integrations/types";

function projectChannels(project: DiscordProjectStatus) {
  return [
    { id: project.channelId, name: project.channelName, label: "updates" },
    { id: project.docsChannelId, name: project.docsChannelName, label: "docs" },
    { id: project.generalChannelId, name: project.generalChannelName, label: "general" },
    {
      id: project.deploymentChannelId,
      name: project.deploymentChannelName,
      label: "deployment",
    },
    { id: project.designerChannelId, name: project.designerChannelName, label: "designer" },
    { id: project.membersChannelId, name: project.membersChannelName, label: "members" },
    { id: project.reportsChannelId, name: project.reportsChannelName, label: "reports" },
    { id: project.meetingChannelId, name: project.meetingChannelName, label: "meeting" },
  ];
}

export function DiscordIntegrationCard({
  workspace,
  projects,
}: {
  workspace: DiscordWorkspaceStatus;
  projects: DiscordProjectStatus[];
}) {
  const statusVariant = workspace.configured
    ? "success"
    : projects.length
      ? "purple"
      : "secondary";
  const statusLabel = workspace.configured
    ? "Đã kết nối"
    : projects.length
      ? "Đã kết nối (Manual)"
      : "Chưa kết nối Server ID";

  return (
    <Card>
      <CardHeader>
        <MessageCircle className="size-8 text-primary" />
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Discord Bot + Docs</CardTitle>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>
        <CardDescription>
          {workspace.configured
            ? `${workspace.guildName ?? workspace.guildId} · Updates ${workspace.channelNameTemplate} · Docs ${workspace.docsChannelNameTemplate}`
            : "Sau khi bấm Cài bot vào Server, nhập Discord Guild ID ở form bên dưới và bấm Lưu để hoàn tất kết nối."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button asChild variant="outline" size="sm" className="w-fit">
          <a
            href="/api/integrations/discord/install"
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="mr-2 size-4" />
            {workspace.configured
              ? "Thêm bot vào Server khác"
              : "Cài Discord Bot vào Server"}
          </a>
        </Button>

        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          {projects.map((project) => (
            <div
              className="grid gap-1 rounded-md border p-3"
              key={project.projectKey}
            >
              <div className="flex items-center justify-between gap-3">
                <strong className="text-foreground">{project.projectKey}</strong>
                <Badge
                  variant={project.provisionedBy === "BOT" ? "purple" : "secondary"}
                >
                  {project.provisionedBy ?? "MANUAL"}
                </Badge>
              </div>
              <div className="flex flex-col gap-1.5 pt-1">
                {projectChannels(project).map((channel) => (
                  <DiscordChannelRow
                    key={channel.label}
                    id={channel.id}
                    name={channel.name}
                    label={channel.label}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
