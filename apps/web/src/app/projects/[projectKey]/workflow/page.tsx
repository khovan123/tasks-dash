import { ProjectShell } from "@/components/organisms/project-shell";
import { WorkflowBuilder } from "@/features/workflow/components/workflow-builder";
import { projectData } from "@/features/demo/demo-data";
export default async function WorkflowPage({params}:{params:Promise<{projectKey:string}>}){const{projectKey}=await params;const{project,statuses}=projectData(projectKey);return <ProjectShell project={project} active="workflow"><div className="mb-5"><h2 className="text-xl font-bold">Custom workflow</h2><p className="mt-1 text-sm text-slate-500">Configure statuses and transitions like a Jira workflow.</p></div><WorkflowBuilder statuses={statuses}/></ProjectShell>}
