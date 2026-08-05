import Link from "next/link";
import { ExternalLink, FileText, Github } from "lucide-react";
import {
  GithubWorkItemLinks,
  type GithubWorkItemView,
} from "@/components/github-work-item-links";
import {
  RepositoryLinkForm,
  type GithubRepositoryOption,
} from "@/components/repository-link-form";
import { WorkItemCreateForm } from "@/components/work-item-create-form";
import { apiData } from "@/lib/server/api-data";
import {
  AppNav,
  AppPage,
  AppTopbar,
  PageHero,
  SectionHeading,
} from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

interface Project {
  key: string;
  name: string;
  description: string;
  repositoryFullName?: string;
  discordDocsChannelId?: string;
  discordDocsChannelName?: string;
}
interface ExternalLinkView { label: string; url: string }
interface WorkItem {
  key: string;
  summary: string;
  type: string;
  statusId: string;
  priority: string;
  assigneeId?: string;
  figmaLinks: ExternalLinkView[];
  documentLinks: ExternalLinkView[];
  github?: GithubWorkItemView;
}
interface WorkflowStatus { id: string; name: string; category: string }
interface Workflow { name: string; statuses: WorkflowStatus[] }
interface WorkspaceMember { _id: string; name: string; email: string }
interface WorkspaceMembersResponse { members: WorkspaceMember[] }

export default async function ProjectPage({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const [project, items, workflow, workspace, repositories] = await Promise.all([
    apiData<Project>(`/projects/${key}`),
    apiData<WorkItem[]>(`/projects/${key}/work-items`),
    apiData<Workflow | null>(`/projects/${key}/workflow`),
    apiData<WorkspaceMembersResponse>("/workspace/members"),
    apiData<GithubRepositoryOption[]>("/integrations/github/repositories").catch(() => []),
  ]);
  const memberNames = Object.fromEntries(workspace.members.map((member) => [member._id, member.name]));

  return (
    <AppPage>
      <AppTopbar>
        <Button asChild variant="ghost"><Link href="/">← Tổng quan</Link></Button>
        <AppNav>
          <Button asChild variant="ghost" size="sm"><Link href={`/projects/${key}/backlog`}>Backlog</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link href={`/projects/${key}/designer`}>Designer</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link href={`/projects/${key}/docs`}>Docs</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link href={`/projects/${key}/automations`}>Automation</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link href="/workspace/members">Workspace members</Link></Button>
        </AppNav>
      </AppTopbar>

      <PageHero
        eyebrow={`Project · ${project.key}`}
        title={project.name}
        description={project.description}
        aside={
          <div className="flex max-w-sm flex-col items-start gap-2 sm:items-end">
            {project.repositoryFullName ? (
              <Button asChild variant="outline" size="sm">
                <a href={`https://github.com/${project.repositoryFullName}`} target="_blank" rel="noreferrer"><Github /> {project.repositoryFullName}</a>
              </Button>
            ) : <Badge variant="secondary">Chưa liên kết GitHub repository</Badge>}
            <Button asChild variant="ghost" size="sm">
              <Link href={`/projects/${key}/docs`}>
                <FileText />
                {project.discordDocsChannelId
                  ? `Discord Docs · #${project.discordDocsChannelName ?? project.discordDocsChannelId}`
                  : "Provision Discord Docs channel"}
              </Link>
            </Button>
          </div>
        }
      />

      <RepositoryLinkForm projectKey={key} currentRepositoryFullName={project.repositoryFullName} repositories={repositories} />

      <Card>
        <CardHeader><SectionHeading eyebrow="Live database" title="Work items" meta={`${items.length} items`} /></CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <Empty><EmptyHeader><EmptyTitle>Chưa có work item</EmptyTitle><EmptyDescription>Tạo Task, Module hoặc Bug bằng form bên dưới.</EmptyDescription></EmptyHeader></Empty>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Key</TableHead><TableHead>Summary</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Assignee</TableHead><TableHead>Figma</TableHead><TableHead>Docs</TableHead><TableHead>GitHub</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.key}>
                    <TableCell><Badge variant="purple">{item.key}</Badge></TableCell>
                    <TableCell className="min-w-56 whitespace-normal font-medium">{item.summary}</TableCell>
                    <TableCell><Badge variant="secondary">{item.type}</Badge></TableCell>
                    <TableCell>{workflow?.statuses.find((status) => status.id === item.statusId)?.name ?? item.statusId}</TableCell>
                    <TableCell>{item.assigneeId ? memberNames[item.assigneeId] ?? "Unknown member" : "—"}</TableCell>
                    <TableCell>{item.figmaLinks?.length ? <div className="grid gap-1">{item.figmaLinks.map((link, index) => <a className="inline-flex items-center gap-1 text-primary hover:underline" key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noreferrer"><ExternalLink className="size-3" /> {link.label || `Figma ${index + 1}`}</a>)}</div> : "—"}</TableCell>
                    <TableCell>{item.documentLinks?.length ? <div className="grid gap-1">{item.documentLinks.map((link, index) => <a className="inline-flex items-center gap-1 text-primary hover:underline" key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noreferrer"><ExternalLink className="size-3" /> {link.label || `Doc ${index + 1}`}</a>)}</div> : "—"}</TableCell>
                    <TableCell className="whitespace-normal"><GithubWorkItemLinks github={item.github} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <WorkItemCreateForm
        projectKey={key}
        statuses={workflow?.statuses ?? []}
        members={workspace.members.map((member) => ({ id: member._id, name: member.name, email: member.email }))}
      />
    </AppPage>
  );
}
