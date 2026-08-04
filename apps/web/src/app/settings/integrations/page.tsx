import Link from "next/link";
import { Bot, Github, HardDrive, MessageCircle } from "lucide-react";
import { DiscordConnectForm } from "@/components/discord-connect-form";
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
  enabled: boolean;
  lastSuccessAt?: string;
  lastError?: string;
}
interface Project { key: string; name: string }

export default async function IntegrationsPage() {
  const [github, drive, discord, projects] = await Promise.all([
    apiData<GithubInstallation[]>("/integrations/github/status"),
    apiData<DriveStatus>("/integrations/google-drive/status"),
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
        description="Mỗi trạng thái được truy vấn từ backend. Secret không được gửi lại trình duyệt."
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
                : "Cài GitHub App để webhook và API repository hoạt động bằng installation token."}
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
              <Badge variant={discord.length ? "success" : "secondary"}>
                {discord.length} dự án
              </Badge>
            </div>
            <CardDescription>
              {discord.length
                ? discord.map((item) => `${item.projectKey}: ${item.webhookName}`).join(", ")
                : "Webhook được xác minh trước khi mã hóa và lưu vào MongoDB."}
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
      <DiscordConnectForm projectKeys={projects.map((project) => project.key)} />
    </AppPage>
  );
}
