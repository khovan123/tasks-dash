import {
  AUTOMATION_EXECUTION_MODES,
  AUTOMATION_TRIGGERS,
} from "@tasks-dash/contracts";
import type { AutomationChannelOption } from "@/features/automations/types";

export const AUTOMATION_TRIGGER_GROUPS = [
  "GitHub Webhooks",
  "CI/CD & Builds",
  "WorkItem / Tasks",
  "Workspace & Hệ thống",
] as const;

export const AUTOMATION_TRIGGER_OPTIONS = [
  {
    value: AUTOMATION_TRIGGERS.pullRequestOpened,
    label: "GitHub · PR Opened (Tạo Pull Request)",
    group: "GitHub Webhooks",
  },
  {
    value: AUTOMATION_TRIGGERS.pullRequestMerged,
    label: "GitHub · PR Merged (Merge Pull Request)",
    group: "GitHub Webhooks",
  },
  {
    value: AUTOMATION_TRIGGERS.pullRequestClosed,
    label: "GitHub · PR Closed (Đóng Pull Request)",
    group: "GitHub Webhooks",
  },
  {
    value: AUTOMATION_TRIGGERS.pullRequestReviewCommented,
    label: "GitHub · PR Review Comment (Bình luận PR)",
    group: "GitHub Webhooks",
  },
  {
    value: AUTOMATION_TRIGGERS.pullRequestApproved,
    label: "GitHub · PR Approved (Duyệt Pull Request)",
    group: "GitHub Webhooks",
  },
  {
    value: AUTOMATION_TRIGGERS.githubPushCommit,
    label: "GitHub · Push Commit (Push code mới)",
    group: "GitHub Webhooks",
  },
  {
    value: AUTOMATION_TRIGGERS.githubIssueCreated,
    label: "GitHub · Issue Created (Tạo Issue mới)",
    group: "GitHub Webhooks",
  },
  {
    value: AUTOMATION_TRIGGERS.ciCdDeploymentSuccess,
    label: "CI/CD · Build Success (Deployment thành công)",
    group: "CI/CD & Builds",
  },
  {
    value: AUTOMATION_TRIGGERS.ciCdDeploymentFailed,
    label: "CI/CD · Build Failed (Deployment thất bại)",
    group: "CI/CD & Builds",
  },
  {
    value: AUTOMATION_TRIGGERS.workItemCreated,
    label: "WorkItem · Task Created (Tạo Task mới)",
    group: "WorkItem / Tasks",
  },
  {
    value: AUTOMATION_TRIGGERS.workItemTransitioned,
    label: "WorkItem · Task Status Changed (Chuyển trạng thái Task)",
    group: "WorkItem / Tasks",
  },
  {
    value: AUTOMATION_TRIGGERS.memberAdded,
    label: "Workspace · Member Joined (Thành viên mới)",
    group: "Workspace & Hệ thống",
  },
  {
    value: AUTOMATION_TRIGGERS.documentCreated,
    label: "Docs · Document Created (Tài liệu mới)",
    group: "Workspace & Hệ thống",
  },
  {
    value: AUTOMATION_TRIGGERS.documentDeleted,
    label: "Docs · Document Deleted (Tài liệu bị xóa)",
    group: "Workspace & Hệ thống",
  },
  {
    value: AUTOMATION_TRIGGERS.designCatalogUpdated,
    label: "Designer · Catalog Updated (Figma link cập nhật)",
    group: "Workspace & Hệ thống",
  },
  {
    value: AUTOMATION_TRIGGERS.scheduled,
    label: "Scheduler · Cron Execution (Chạy theo lịch)",
    group: "Workspace & Hệ thống",
  },
] as const;

export const AUTOMATION_CHANNEL_OPTIONS: readonly AutomationChannelOption[] = [
  {
    id: "updates",
    name: "Kênh cập nhật chung (#updates)",
    displayLabel: "#updates (Cập nhật)",
  },
  {
    id: "deployment",
    name: "Kênh CI/CD & Deployments (#deployment)",
    displayLabel: "#deployment (CI/CD)",
  },
  {
    id: "docs",
    name: "Kênh Tài liệu (#docs)",
    displayLabel: "#docs (Tài liệu)",
  },
  {
    id: "general",
    name: "Kênh Thảo luận chung (#general)",
    displayLabel: "#general (Thảo luận)",
  },
  {
    id: "designer",
    name: "Kênh Figma / Design (#designer)",
    displayLabel: "#designer (Design)",
  },
  {
    id: "members",
    name: "Kênh Thành viên (#members)",
    displayLabel: "#members (Thành viên)",
  },
  {
    id: "reports",
    name: "Kênh Báo cáo tiến độ (#reports)",
    displayLabel: "#reports (Báo cáo)",
  },
  {
    id: "meeting",
    name: "Kênh Họp team (#meeting)",
    displayLabel: "#meeting (Họp team)",
  },
];

export const AUTOMATION_MODE_LABELS: Record<string, string> = {
  [AUTOMATION_EXECUTION_MODES.event]: "Sự kiện (Realtime)",
  [AUTOMATION_EXECUTION_MODES.scheduled]: "Lịch định kỳ (Scheduled)",
};

export const AUTOMATION_HELPER_VARIABLES = [
  { code: "{{projectKey}}", label: "Mã dự án", example: "TD" },
  { code: "{{workItemKey}}", label: "Mã Task", example: "TD-12" },
  { code: "{{title}}", label: "Tiêu đề Event", example: "Fix auth bug" },
  { code: "{{pullRequestNumber}}", label: "Số PR", example: "#42" },
  { code: "{{pullRequestUrl}}", label: "Link PR", example: "https://github..." },
  { code: "{{repositoryFullName}}", label: "Tên Repo", example: "org/repo" },
  { code: "{{authorLogin}}", label: "Người tạo", example: "octocat" },
] as const;

export const AUTOMATION_CRON_PRESETS = [
  { label: "Mỗi 5 phút", cron: "*/5 * * * *" },
  { label: "Mỗi giờ", cron: "0 * * * *" },
  { label: "9:00 Sáng hằng ngày", cron: "0 9 * * *" },
  { label: "9:00 Sáng T2 - T6", cron: "0 9 * * 1-5" },
] as const;

export function automationTriggerLabel(trigger: string): string {
  return (
    AUTOMATION_TRIGGER_OPTIONS.find((option) => option.value === trigger)?.label ??
    trigger
  );
}

export function automationChannelLabel(channelType: string): string {
  return (
    AUTOMATION_CHANNEL_OPTIONS.find((channel) => channel.id === channelType)
      ?.displayLabel ?? `#${channelType}`
  );
}

export function automationModeLabel(executionMode: string): string {
  return AUTOMATION_MODE_LABELS[executionMode] ?? executionMode;
}

export function renderAutomationSamplePreview(
  template: string,
  projectKey: string,
): string {
  if (!template) return "";
  return template
    .replace(/\{\{projectKey\}\}/g, projectKey)
    .replace(/\{\{workItemKey\}\}/g, `${projectKey}-42`)
    .replace(/\{\{title\}\}/g, "Fix authentication token refresh issue")
    .replace(/\{\{pullRequestNumber\}\}/g, "42")
    .replace(
      /\{\{pullRequestUrl\}\}/g,
      "https://github.com/tasks-dash/app/pull/42",
    )
    .replace(/\{\{repositoryFullName\}\}/g, "tasks-dash/app")
    .replace(/\{\{authorLogin\}\}/g, "developer_bot");
}
