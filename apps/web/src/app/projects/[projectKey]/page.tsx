import Link from "next/link";
import {
  GithubWorkItemLinks,
  type GithubWorkItemView,
} from "@/components/github-work-item-links";
import {
  GithubRepositoryOption,
  RepositoryLinkForm,
} from "@/components/repository-link-form";
import { WorkItemCreateForm } from "@/components/work-item-create-form";
import { apiData } from "@/lib/server/api-data";

export const dynamic = "force-dynamic";

interface Project {
  key: string;
  name: string;
  description: string;
  repositoryFullName?: string;
  driveRootFolderId?: string;
}

interface ExternalLink {
  label: string;
  url: string;
}

interface WorkItem {
  key: string;
  summary: string;
  type: string;
  statusId: string;
  priority: string;
  assigneeId?: string;
  figmaLinks: ExternalLink[];
  documentLinks: ExternalLink[];
  github?: GithubWorkItemView;
}

interface WorkflowStatus {
  id: string;
  name: string;
  category: string;
}

interface Workflow {
  name: string;
  statuses: WorkflowStatus[];
}

interface WorkspaceMember {
  _id: string;
  name: string;
  email: string;
}

interface WorkspaceMembersResponse {
  members: WorkspaceMember[];
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const [project, items, workflow, workspace, repositories] = await Promise.all([
    apiData<Project>(`/projects/${key}`),
    apiData<WorkItem[]>(`/projects/${key}/work-items`),
    apiData<Workflow | null>(`/projects/${key}/workflow`),
    apiData<WorkspaceMembersResponse>("/workspace/members"),
    apiData<GithubRepositoryOption[]>("/integrations/github/repositories").catch(
      () => [],
    ),
  ]);
  const memberNames = Object.fromEntries(
    workspace.members.map((member) => [member._id, member.name]),
  );

  return (
    <main className="app-page">
      <header className="topbar">
        <Link href="/">← Tổng quan</Link>
        <nav>
          <Link href={`/projects/${key}/backlog`}>Backlog</Link>
          <Link href={`/projects/${key}/designer`}>Designer</Link>
          <Link href={`/projects/${key}/automations`}>Automation</Link>
          <Link href="/workspace/members">Workspace members</Link>
        </nav>
      </header>

      <section className="hero-panel">
        <div>
          <span className="project-key">{project.key}</span>
          <h1>{project.name}</h1>
          <p>{project.description}</p>
        </div>
        <div className="project-links">
          {project.repositoryFullName ? (
            <a
              href={`https://github.com/${project.repositoryFullName}`}
              target="_blank"
              rel="noreferrer"
            >
              {project.repositoryFullName}
            </a>
          ) : (
            <span>Chưa liên kết GitHub repository</span>
          )}
          <span>
            {project.driveRootFolderId
              ? "Drive đã cấu hình"
              : "Chưa có Drive folder"}
          </span>
        </div>
      </section>

      <RepositoryLinkForm
        projectKey={key}
        currentRepositoryFullName={project.repositoryFullName}
        repositories={repositories}
      />

      <section className="data-card">
        <div className="section-heading">
          <div>
            <span>LIVE DATABASE</span>
            <h2>Work items</h2>
          </div>
          <strong>{items.length}</strong>
        </div>
        {items.length === 0 ? (
          <p className="empty-inline">Chưa có work item.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Summary</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Figma</th>
                  <th>Docs</th>
                  <th>GitHub</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.key}>
                    <td>
                      <strong>{item.key}</strong>
                    </td>
                    <td>{item.summary}</td>
                    <td>{item.type}</td>
                    <td>
                      {workflow?.statuses.find(
                        (status) => status.id === item.statusId,
                      )?.name ?? item.statusId}
                    </td>
                    <td>
                      {item.assigneeId
                        ? memberNames[item.assigneeId] ?? "Unknown member"
                        : "—"}
                    </td>
                    <td>
                      {item.figmaLinks?.length ? (
                        <div className="inline-links">
                          {item.figmaLinks.map((link, index) => (
                            <a
                              key={`${link.url}-${index}`}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {link.label || `Figma ${index + 1}`}
                            </a>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {item.documentLinks?.length ? (
                        <div className="inline-links">
                          {item.documentLinks.map((link, index) => (
                            <a
                              key={`${link.url}-${index}`}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {link.label || `Doc ${index + 1}`}
                            </a>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <GithubWorkItemLinks github={item.github} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <WorkItemCreateForm
        projectKey={key}
        statuses={workflow?.statuses ?? []}
        members={workspace.members.map((member) => ({
          id: member._id,
          name: member.name,
          email: member.email,
        }))}
      />
    </main>
  );
}
