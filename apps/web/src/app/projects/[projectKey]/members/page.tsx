import { MEMBER_PRESENCE } from "@tasks-dash/contracts";
import { Mail, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/atoms/avatar";
import { Badge } from "@/components/atoms/badge";
import { Card, CardContent, CardHeader } from "@/components/atoms/card";
import { Button } from "@/components/atoms/button";
import { ProjectShell } from "@/components/organisms/project-shell";
import { projectData } from "@/features/demo/demo-data";
export default async function MembersPage({params}:{params:Promise<{projectKey:string}>}){const{projectKey}=await params;const{project,members}=projectData(projectKey);return <ProjectShell project={project} active="members"><Card><CardHeader><div><h2 className="font-bold">Project members</h2><p className="text-sm text-slate-500">Manage project access and responsibilities</p></div><Button size="sm">Invite member</Button></CardHeader><CardContent><div className="divide-y">{members.map(member=><div key={member.id} className="flex items-center gap-4 py-4"><Avatar name={member.name} src={member.avatarUrl}/><div className="min-w-0 flex-1"><p className="font-semibold">{member.name}</p><p className="flex items-center gap-1 text-xs text-slate-500"><Mail size={12}/>{member.email}</p></div><Badge><ShieldCheck size={12} className="mr-1"/>{member.role.replaceAll("_"," ")}</Badge><span className={`text-xs font-bold ${member.status===MEMBER_PRESENCE.online?"text-emerald-600":"text-amber-600"}`}>{member.status}</span><Button variant="ghost" size="sm">Manage</Button></div>)}</div></CardContent></Card></ProjectShell>}
