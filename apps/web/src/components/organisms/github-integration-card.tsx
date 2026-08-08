import { Github } from "lucide-react";
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
  GithubInstallation,
  GithubRepositoryStatus,
} from "@/features/integrations/types";

export function GithubIntegrationCard({
  installations,
  linkedRepositories,
}: {
  installations: GithubInstallation[];
  linkedRepositories: GithubRepositoryStatus[];
}) {
  const connected = installations.length > 0;

  return (
    <Card>
      <CardHeader>
        <Github className="size-8 text-primary" />
        <div className="flex items-center justify-between gap-3">
          <CardTitle>GitHub App</CardTitle>
          <Badge variant={connected ? "success" : "secondary"}>
            {connected ? "Đã kết nối" : "Chưa kết nối"}
          </Badge>
        </div>
        <CardDescription>
          {connected
            ? installations
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
              {connected ? "Quản lý installation" : "Cài GitHub App"}
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
                    <a
                      href={repository.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 truncate font-medium text-foreground hover:underline"
                    >
                      {repository.full_name}
                    </a>
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
  );
}
