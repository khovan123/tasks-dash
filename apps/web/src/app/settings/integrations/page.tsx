import Link from "next/link";
import { Bot, FileArchive, Github, MessageCircle } from "lucide-react";
import { DiscordConnectForm } from "@/components/discord-connect-form";
import {
  DiscordWorkspaceConfigForm,
  type DiscordWorkspaceStatus,
} from "@/components/discord-workspace-config-form";
import { apiData } from "@/lib/server/api-data";
import { AppPage, AppTopbar, PageHero } from "@/components/layout/app-shell";
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
interface DiscordStatus {
  projectKey: string;
  channelId: string;
  channelName?: string | null;
  docsChannelId?: string | null;
  docsChannelName?: string | null;
  provisionedBy?: "BOT" | "MANUAL";
}
interface Project { key: string; name: string }

export default async function IntegrationsPage() {
  const [github, discordWorkspace, discord, projects] = await Promise.all([
    apiData<GithubInstallation[]>("/integrations/github/status"),
    apiData<DiscordWorkspaceStatus>("/integrations/discord/workspace/status"),
    apiData<DiscordStatus[]>("/integrations/discord/status"),
    apiData<Project[]>("/projects"),
  ]);

  return (
    <AppPage>
      <AppTopbar>
        <Button asChild variant="ghost"><Link href="/">← Tổng quan</Link></Button>
        <strong>Production integrations</strong>
      </AppTopbar>
      <PageHero
        eyebrow="GitHub + Discord only"
        title="Tích hợp production"
        description="GitHub OAuth xác thực người dùng, GitHub App nhận webhook/repository, còn Discord Bot quản lý channel thông báo và file tài liệu."
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
                ? github.map((item) => `${item.accountLogin} · ${item.repositoryCount} repositories`).join(", ")
                : "Cài GitHub App để nhận pull_request, pull_request_review và push bằng webhook đã ký."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild><a href="/api/integrations/github/install">{github.length ? "Quản lý installation" : "Cài GitHub App"}</a></Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <MessageCircle className="size-8 text-primary" />
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Discord Bot + Docs</CardTitle>
              <Badge variant={discordWorkspace.configured ? "success" : "secondary"}>
                {discord.length} projects
              </Badge>
            </div>
            <CardDescription>
              {discordWorkspace.configured
                ? `${discordWorkspace.guildName ?? discordWorkspace.guildId} · Updates ${discordWorkspace.channelNameTemplate} · Docs ${discordWorkspace.docsChannelNameTemplate}`
                : "Cài bot để tự tạo hai channel theo project, lưu attachment tài liệu và gửi GitHub automation."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {discord.map((item) => (
              <div className="grid gap-1 rounded-md border p-3" key={item.projectKey}>
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-foreground">{item.projectKey}</strong>
                  <Badge variant={item.provisionedBy === "BOT" ? "purple" : "secondary"}>{item.provisionedBy ?? "MANUAL"}</Badge>
                </div>
                <span><MessageCircle className="mr-1 inline size-3" />#{item.channelName ?? item.channelId}</span>
                <span><FileArchive className="mr-1 inline size-3" />#{item.docsChannelName ?? item.docsChannelId ?? "chưa provision"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <DiscordWorkspaceConfigForm status={discordWorkspace} />
      <DiscordConnectForm projectKeys={projects.map((project) => project.key)} />
    </AppPage>
  );
}
