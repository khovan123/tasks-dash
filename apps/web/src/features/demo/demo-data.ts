import data from "../../../public/assets/mocks/dashboard.json";
import type { DemoData } from "./types";
export const demoData = data as DemoData;
export function projectData(key: string) {
  const project = demoData.projects.find((item) => item.key === key.toUpperCase()) ?? demoData.projects[0];
  return { project, members: demoData.members.filter((member) => project.memberIds.includes(member.id)), items: demoData.workItems.filter((item) => item.projectKey === project.key), sprint: demoData.sprints.find((item) => item.projectKey === project.key), automations: demoData.automations.filter((item) => item.projectKey === project.key), statuses: demoData.statuses };
}
