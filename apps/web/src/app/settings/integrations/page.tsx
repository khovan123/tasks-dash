import Link from "next/link";
import { Bot, Github, HardDrive, MessageCircle } from "lucide-react";
import { DiscordConnectForm } from "@/components/discord-connect-form";
import {
  DiscordWorkspaceConfigForm,
  type DiscordWorkspaceStatus,
} from "@/components/discord-workspace-config-form";
import { apiData } from "@/lib/server/api-data";
import {
  AppPage,
  AppTopbar,
  PageHero,
} from "@/components/layout/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  suspended: boolean;
  synchronizedAt?: string;
}
interface DriveStatus {
  connected: boolean;
  accountEmail?: string;
  workspaceRootFolderName?: string;
  connectedAt?: string;
  lastError?: string | null;
}
interface DiscordStatus {
  projectKey: string;
  webhookName: string;
  channelId: string;
  channelName?: string | null;
  provisionedBy?: "BOT" | "MANUAL";
  enabled: boolean;
  lastSuccessAt?: string;
  lastError?: string;
}
interface Project { key: string; name: string }

export default async function IntegrationsPage() {
  const [github, drive, discordWorkspace, discord, projects] = await Promise.all([
    apiData<GithubInstallation[]>("/integrations/github/status"),
    apiData<DriveStatus>("/integrations/google-drive/status"),
    apiData<DiscordWorkspaceStatus>("/integrations/discord/workspace/status"),
    apiData<DiscordStatus[]>("/integrations/discord/status"),
    apiData<Project[]>("/projects"),
  ]);

  return (
    <AppPage>
      <AppTopbar>
        <Button asChild variant="ghost">
          <Link href="/">← Tổng quan</Link>
        </Button>
        <strong>Production integrations</strong>
      </AppTopbar>
      <PageHero
        eyebrow="Real connections"
        title="Tích hợp production"
        description="GitHub webhook nhận sự kiện thật, Discord bot tự provision channel/webhook theo project, và mọi secret chỉ tồn tại phía server."
        aside={<Bot className="size-14 text-primary" />}
      />
      <section className="grid gap-4 lg:grid-cols-3">
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
            <Button asChild>
              <a href="/api/integrations/github/install">
                {github.length ? "Quản lý installation" : "Cài GitHub App"}
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <HardDrive className="size-8 text-primary" />
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Google Drive</CardTitle>
              <Badge variant={drive.connected ? "success" : "secondary"}>
                {drive.connected ? "Đã kết nối" : "Owner only"}
              </Badge>
            </div>
            <CardDescription>
              {drive.connected
                ? `${drive.accountEmail} · root ${drive.workspaceRootFolderName ?? "Tasks Dash"}`
                : "Workspace Owner cấp quyền drive.file một lần. Hệ thống tự tạo root workspace và folder từng project."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {drive.lastError ? (
              <Alert variant="destructive">
                <AlertTitle>Lỗi đồng bộ</AlertTitle>
                <AlertDescription>{drive.lastError}</AlertDescription>
              </Alert>
            ) : null}
            <Button asChild>
              <a href="/api/integrations/google-drive/connect">
                {drive.connected ? "Owner kết nối lại" : "Owner kết nối Drive"}
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <MessageCircle className="size-8 text-primary" />
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Discord</CardTitle>
              <Badge variant={discordWorkspace.configured ? "success" : "secondary"}>
                {discord.length} project channels
              </Badge>
            </div>
            <CardDescription>
              {discordWorkspace.configured
                ? `${discordWorkspace.guildName ?? discordWorkspace.guildId} · ${discordWorkspace.channelNameTemplate}`
                : "Cài Tasks Dash bot và chọn Discord server để tự tạo channel/webhook cho mỗi project."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {discord.map((item) => (
              <div className="flex items-center justify-between gap-3 rounded-md border p-2" key={item.projectKey}>
                <span>
                  <strong className="text-foreground">{item.projectKey}</strong>
                  {" · #"}{item.channelName ?? item.channelId}
                </span>
                <Badge variant={item.provisionedBy === "BOT" ? "purple" : "secondary"}>
                  {item.provisionedBy ?? "MANUAL"}
                </Badge>
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
