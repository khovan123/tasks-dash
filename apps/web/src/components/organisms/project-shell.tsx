import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, Bot, FileText, GitBranch, LayoutGrid, ListTodo, Settings2, Users } from "lucide-react";
import { AppSidebar } from "./app-sidebar";
import { TopHeader } from "./top-header";
import { demoData } from "@/features/demo/demo-data";
import type { DemoProject } from "@/features/demo/types";
const nav = [{label:"Overview",slug:"",icon:Activity},{label:"Board",slug:"board",icon:LayoutGrid},{label:"Backlog",slug:"backlog",icon:ListTodo},{label:"Workflow",slug:"workflow",icon:GitBranch},{label:"Docs",slug:"docs",icon:FileText},{label:"Members",slug:"members",icon:Users},{label:"Automations",slug:"automations",icon:Bot},{label:"Settings",slug:"settings",icon:Settings2}];
export function ProjectShell({ project, active, children }: { project: DemoProject; active: string; children: ReactNode }) { return <><AppSidebar projects={demoData.projects}/><div className="ml-[260px] min-h-screen"><TopHeader title={project.name} subtitle={`${project.key} · ${project.repositoryFullName}`}/><div className="border-b bg-white px-7"><nav className="flex gap-6 overflow-x-auto">{nav.map(({label,slug,icon:Icon}) => <Link key={label} href={`/projects/${project.key}${slug ? `/${slug}` : ""}`} className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold ${active === slug ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-900"}`}><Icon size={15}/>{label}</Link>)}</nav></div><main className="p-7">{children}</main></div></>; }
