import { redirect } from "next/navigation";
import { Bot, FileArchive, Github, MessageCircle } from "lucide-react";
import {
  DiscordWorkspaceConfigForm,
  type DiscordWorkspaceStatus,
} from "@/components/discord-workspace-config-form";
import { apiData } from "@/lib/server/api-data";
import { AppPage, PageHero } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

interface GithubInstallation {
  installationId: number;
  accountLogin: string;
  repositoryCount: number;
}
interface GithubRepositoryStatus {
  id: number;
  full_name: string;
  html_url: string;
  linkedProjectKey?: string;
}
interface DiscordStatus {
  projectKey: string;
  channelId: string;
  channelName?: string | null;
  docsChannelId?: string | null;
  docsChannelName?: string | null;
  generalChannelId?: string | null;
  generalChannelName?: string | null;
  deploymentChannelId?: string | null;
  deploymentChannelName?: string | null;
  designerChannelId?: string | null;
  designerChannelName?: string | null;
  membersChannelId?: string | null;
  membersChannelName?: string | null;
  reportsChannelId?: string | null;
  reportsChannelName?: string | null;
  meetingChannelId?: string | null;
  meetingChannelName?: string | null;
  provisionedBy?: "BOT" | "MANUAL";
}

export default async function IntegrationsPage() {
  const [github, githubRepositories, discordWorkspace, discord, membersData, session] = await Promise.all([
    apiData<GithubInstallation[]>("/integrations/github/status"),
    apiData<GithubRepositoryStatus[]>("/integrations/github/repositories"),
    apiData<DiscordWorkspaceStatus>("/integrations/discord/workspace/status"),
    apiData<DiscordStatus[]>("/integrations/discord/status"),
    apiData<{ members: Array<{ email: string; role: string }> }>("/workspace/members"),
    apiData<{ email: string }>("/auth/me"),
  ]);

  const currentMemberRole =
    membersData.members.find((member) => member.email === session.email)?.role ?? null;

  if (currentMemberRole !== "OWNER") {
    redirect("/workspaces");
  }

  const linkedRepositories = githubRepositories.filter((repository) =>
    Boolean(repository.linkedProjectKey),
  );

  return (
    <AppPage>
      <PageHero
        eyebrow="GitHub + Discord only"
        title="Tích hợp"
        description="GitHub, GitHub App, Discord Bot"
        aside={<Bot className="size-14 text-primary" />}
      />
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Github className="size-8 text-primary" />
            <div className="flex items-center justify-between gap-3">
              <CardTitle>GitHub App</CardTitle>
              <Badge variant={github.length ? "success" : "secondary"}>
                {github.length ? "Đã kết nối" : "Chưa kết nối"}
              </Badge>
            </div>
            <CardDescription>
              {github.length
                ? github
                    .map(
                      (item) =>
                        `${item.accountLogin} · ${item.repositoryCount} repositories`,
                    )
                    .join(", ")
                : "Cài GitHub App để nhận pull_request, pull_request_review và push bằng webhook đã ký."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Button asChild className="w-fit">
                <a href="/api/integrations/github/install">
                  {github.length ? "Quản lý installation" : "Cài GitHub App"}
                </a>
              </Button>
              {linkedRepositories.length ? (
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">
                    Repo đang được project sử dụng
                  </div>
                  <div className="grid gap-2">
                    {linkedRepositories.map((repository) => (
                      <div
                        key={repository.id}
                        className="flex items-center justify-between gap-3 rounded-md border p-3"
                      >
                        <div className="min-w-0">
                          <a
                            href={repository.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block truncate font-medium text-foreground hover:underline"
                          >
                            {repository.full_name}
                          </a>
                        </div>
                        <Badge variant="outline">
                          {repository.linkedProjectKey}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <MessageCircle className="size-8 text-primary" />
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Discord Bot + Docs</CardTitle>
              <Badge
                variant={
                  discordWorkspace.configured
                    ? "success"
                    : discord.length
                      ? "purple"
                      : "secondary"
                }
              >
                {discordWorkspace.configured
                  ? "Đã kết nối"
                  : discord.length
                    ? "Đã kết nối (Manual)"
                    : "Chưa kết nối Server ID"}
              </Badge>
            </div>
            <CardDescription>
              {discordWorkspace.configured
                ? `${discordWorkspace.guildName ?? discordWorkspace.guildId} · Updates ${discordWorkspace.channelNameTemplate} · Docs ${discordWorkspace.docsChannelNameTemplate}`
                : "Sau khi bấm Cài bot vào Server, bạn cần nhập Discord Guild ID ở form bên dưới và bấm 'Lưu' để hoàn tất kết nối."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3 pb-1">
              <Button asChild variant="outline" size="sm">
                <a
                  href="/api/integrations/discord/install"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-2 size-4" />
                  {discordWorkspace.configured
                    ? "Thêm bot vào Server khác"
                    : "Cài Discord Bot vào Server"}
                </a>
              </Button>
            </div>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              {discord.map((item) => (
                <div
                  className="grid gap-1 rounded-md border p-3"
                  key={item.projectKey}
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-foreground">
                      {item.projectKey}
                    </strong>
                    <Badge
                      variant={
                        item.provisionedBy === "BOT" ? "purple" : "secondary"
                      }
                    >
                      {item.provisionedBy ?? "MANUAL"}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1.5 pt-1">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="size-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        #{item.channelName ?? item.channelId}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 h-4"
                      >
                        updates
                      </Badge>
                    </div>
                    {item.docsChannelId && (
                      <div className="flex items-center gap-2">
                        <MessageCircle className="size-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          #{item.docsChannelName ?? item.docsChannelId}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 h-4"
                        >
                          docs
                        </Badge>
                      </div>
                    )}
                    {item.generalChannelId && (
                      <div className="flex items-center gap-2">
                        <MessageCircle className="size-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          #{item.generalChannelName ?? item.generalChannelId}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 h-4"
                        >
                          general
                        </Badge>
                      </div>
                    )}
                    {item.deploymentChannelId && (
                      <div className="flex items-center gap-2">
                        <MessageCircle className="size-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          #
                          {item.deploymentChannelName ??
                            item.deploymentChannelId}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 h-4"
                        >
                          deployment
                        </Badge>
                      </div>
                    )}
                    {item.designerChannelId && (
                      <div className="flex items-center gap-2">
                        <MessageCircle className="size-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          #{item.designerChannelName ?? item.designerChannelId}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 h-4"
                        >
                          designer
                        </Badge>
                      </div>
                    )}
                    {item.membersChannelId && (
                      <div className="flex items-center gap-2">
                        <MessageCircle className="size-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          #{item.membersChannelName ?? item.membersChannelId}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 h-4"
                        >
                          members
                        </Badge>
                      </div>
                    )}
                    {item.reportsChannelId && (
                      <div className="flex items-center gap-2">
                        <MessageCircle className="size-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          #{item.reportsChannelName ?? item.reportsChannelId}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 h-4"
                        >
                          reports
                        </Badge>
                      </div>
                    )}
                    {item.meetingChannelId && (
                      <div className="flex items-center gap-2">
                        <MessageCircle className="size-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          #{item.meetingChannelName ?? item.meetingChannelId}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 h-4"
                        >
                          meeting
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <DiscordWorkspaceConfigForm status={discordWorkspace} />
    </AppPage>
  );
}
