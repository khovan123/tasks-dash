import Link from "next/link";
import { FileArchive } from "lucide-react";
import {
  DiscordDocumentManager,
  type DiscordDocumentTree,
} from "@/components/discord-document-manager";
import { apiData } from "@/lib/server/api-data";
import { AppNav, AppPage, AppTopbar } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export const dynamic = "force-dynamic";

export default async function ProjectDocsPage({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  let tree: DiscordDocumentTree | null = null;
  let error: string | null = null;
  try {
    tree = await apiData<DiscordDocumentTree>(`/projects/${key}/documents`);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "Không thể tải Discord Docs.";
  }

  return (
    <AppPage>
      <AppTopbar>
        <Button asChild variant="ghost"><Link href={`/projects/${key}`}>← {key}</Link></Button>
        <AppNav>
          <Button asChild variant="ghost" size="sm"><Link href={`/projects/${key}/backlog`}>Backlog</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link href={`/projects/${key}/designer`}>Designer</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link href={`/projects/${key}/docs`}>Docs</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link href={`/projects/${key}/automations`}>Automation</Link></Button>
        </AppNav>
      </AppTopbar>

      {tree ? (
        <DiscordDocumentManager tree={tree} />
      ) : (
        <Empty className="min-h-80">
          <FileArchive className="size-12 text-primary" />
          <EmptyHeader>
            <EmptyTitle>Discord Docs channel chưa sẵn sàng</EmptyTitle>
            <EmptyDescription>
              {error ?? "Cài Discord bot, cấu hình Guild/Category và provision project để tạo channel Docs."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild><Link href="/settings/integrations">Cấu hình Discord Bot</Link></Button>
          </EmptyContent>
        </Empty>
      )}
    </AppPage>
  );
}
