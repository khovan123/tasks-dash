export const WORK_ITEM_TYPES = {
  module: "MODULE",
  story: "STORY",
  task: "TASK",
  bug: "BUG",
  subTask: "SUB_TASK",
} as const;
export type WorkItemType = (typeof WORK_ITEM_TYPES)[keyof typeof WORK_ITEM_TYPES];

export const WORKFLOW_CATEGORIES = {
  toDo: "TO_DO",
  inProgress: "IN_PROGRESS",
  done: "DONE",
} as const;
export type WorkflowCategory = (typeof WORKFLOW_CATEGORIES)[keyof typeof WORKFLOW_CATEGORIES];

export const DEFAULT_WORKFLOW_STATUS_IDS = {
  toDo: "TO_DO",
  inProgress: "IN_PROGRESS",
  done: "DONE",
} as const;
export type DefaultWorkflowStatusId = (typeof DEFAULT_WORKFLOW_STATUS_IDS)[keyof typeof DEFAULT_WORKFLOW_STATUS_IDS];

export const PRIORITIES = {
  lowest: "LOWEST",
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  highest: "HIGHEST",
} as const;
export type Priority = (typeof PRIORITIES)[keyof typeof PRIORITIES];

export const SPRINT_STATES = {
  planned: "PLANNED",
  active: "ACTIVE",
  completed: "COMPLETED",
} as const;
export type SprintState = (typeof SPRINT_STATES)[keyof typeof SPRINT_STATES];

export const MEMBER_ROLES = {
  owner: "OWNER",
  admin: "ADMIN",
  projectLead: "PROJECT_LEAD",
  member: "MEMBER",
  viewer: "VIEWER",
} as const;
export type MemberRole = (typeof MEMBER_ROLES)[keyof typeof MEMBER_ROLES];

export const MEMBER_PRESENCE = {
  online: "ONLINE",
  away: "AWAY",
  offline: "OFFLINE",
} as const;
export type MemberPresence = (typeof MEMBER_PRESENCE)[keyof typeof MEMBER_PRESENCE];

export const MEMBER_INVITATION_STATUSES = {
  pending: "PENDING",
  accepted: "ACCEPTED",
  revoked: "REVOKED",
  expired: "EXPIRED",
} as const;
export type MemberInvitationStatus = (typeof MEMBER_INVITATION_STATUSES)[keyof typeof MEMBER_INVITATION_STATUSES];

export const DESIGN_CATALOG_TYPES = {
  figmaFile: "FIGMA_FILE",
  figmaPage: "FIGMA_PAGE",
  figmaComponent: "FIGMA_COMPONENT",
  figjamBoard: "FIGJAM_BOARD",
  other: "OTHER",
} as const;
export type DesignCatalogType = (typeof DESIGN_CATALOG_TYPES)[keyof typeof DESIGN_CATALOG_TYPES];

export const PROJECT_HEALTH = {
  onTrack: "ON_TRACK",
  atRisk: "AT_RISK",
  offTrack: "OFF_TRACK",
} as const;
export type ProjectHealth = (typeof PROJECT_HEALTH)[keyof typeof PROJECT_HEALTH];

export const GITHUB_WEBHOOK_EVENTS = {
  pullRequest: "pull_request",
  pullRequestReview: "pull_request_review",
  push: "push",
  issues: "issues",
  workflowRun: "workflow_run",
  installation: "installation",
  installationRepositories: "installation_repositories",
} as const;
export type GithubWebhookEvent = (typeof GITHUB_WEBHOOK_EVENTS)[keyof typeof GITHUB_WEBHOOK_EVENTS];

export const GITHUB_INSTALLATION_ACTIONS = {
  created: "created",
  deleted: "deleted",
  suspend: "suspend",
  unsuspend: "unsuspend",
  newPermissionsAccepted: "new_permissions_accepted",
} as const;
export type GithubInstallationAction = (typeof GITHUB_INSTALLATION_ACTIONS)[keyof typeof GITHUB_INSTALLATION_ACTIONS];

export const GITHUB_PULL_REQUEST_ACTIONS = {
  opened: "opened",
  reopened: "reopened",
  closed: "closed",
  synchronize: "synchronize",
  edited: "edited",
  readyForReview: "ready_for_review",
  convertedToDraft: "converted_to_draft",
  reviewRequested: "review_requested",
  reviewRequestRemoved: "review_request_removed",
} as const;
export type GithubPullRequestAction = (typeof GITHUB_PULL_REQUEST_ACTIONS)[keyof typeof GITHUB_PULL_REQUEST_ACTIONS];

export const GITHUB_PR_STATES = { open: "OPEN", closed: "CLOSED", merged: "MERGED" } as const;
export type GithubPullRequestState = (typeof GITHUB_PR_STATES)[keyof typeof GITHUB_PR_STATES];

export const GITHUB_PR_STATUSES = {
  draft: "DRAFT",
  open: "OPEN",
  reviewRequested: "REVIEW_REQUESTED",
  approved: "APPROVED",
  changesRequested: "CHANGES_REQUESTED",
  reviewCommented: "REVIEW_COMMENTED",
  merged: "MERGED",
  closed: "CLOSED",
} as const;
export type GithubPullRequestStatus = (typeof GITHUB_PR_STATUSES)[keyof typeof GITHUB_PR_STATUSES];

export const GITHUB_REVIEW_STATES = {
  pending: "PENDING",
  approved: "APPROVED",
  changesRequested: "CHANGES_REQUESTED",
  commented: "COMMENTED",
  dismissed: "DISMISSED",
} as const;
export type GithubReviewState = (typeof GITHUB_REVIEW_STATES)[keyof typeof GITHUB_REVIEW_STATES];

export const GITHUB_LINK_SOURCES = {
  pullRequestTitle: "PULL_REQUEST_TITLE",
  pullRequestBody: "PULL_REQUEST_BODY",
  branchName: "BRANCH_NAME",
  commitMessage: "COMMIT_MESSAGE",
} as const;
export type GithubLinkSource = (typeof GITHUB_LINK_SOURCES)[keyof typeof GITHUB_LINK_SOURCES];

export const INTEGRATION_TYPES = { github: "GITHUB", discord: "DISCORD" } as const;
export type IntegrationType = (typeof INTEGRATION_TYPES)[keyof typeof INTEGRATION_TYPES];

export const INTEGRATION_STATES = {
  connected: "CONNECTED",
  disconnected: "DISCONNECTED",
  degraded: "DEGRADED",
} as const;
export type IntegrationState = (typeof INTEGRATION_STATES)[keyof typeof INTEGRATION_STATES];

export const AUTOMATION_TRIGGERS = {
  workItemCreated: "WORK_ITEM_CREATED",
  workItemTransitioned: "WORK_ITEM_TRANSITIONED",
  sprintStarted: "SPRINT_STARTED",
  sprintCompleted: "SPRINT_COMPLETED",
  pullRequestOpened: "PULL_REQUEST_OPENED",
  pullRequestMerged: "PULL_REQUEST_MERGED",
  scheduled: "SCHEDULED",
} as const;
export type AutomationTrigger = (typeof AUTOMATION_TRIGGERS)[keyof typeof AUTOMATION_TRIGGERS];

export const AUTOMATION_ACTIONS = {
  transitionWorkItem: "TRANSITION_WORK_ITEM",
  assignMember: "ASSIGN_MEMBER",
  addLabel: "ADD_LABEL",
  notifyDiscord: "NOTIFY_DISCORD",
  createGithubIssue: "CREATE_GITHUB_ISSUE",
} as const;
export type AutomationAction = (typeof AUTOMATION_ACTIONS)[keyof typeof AUTOMATION_ACTIONS];

export const AUTOMATION_EXECUTION_MODES = { event: "EVENT", scheduled: "SCHEDULED" } as const;
export type AutomationExecutionMode = (typeof AUTOMATION_EXECUTION_MODES)[keyof typeof AUTOMATION_EXECUTION_MODES];

export const AUTOMATION_RUN_RESULTS = { succeeded: "SUCCEEDED", failed: "FAILED", skipped: "SKIPPED" } as const;
export type AutomationRunResult = (typeof AUTOMATION_RUN_RESULTS)[keyof typeof AUTOMATION_RUN_RESULTS];

export const DOCUMENT_TYPES = {
  folder: "FOLDER",
  file: "FILE",
  discordAttachment: "DISCORD_ATTACHMENT",
} as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[keyof typeof DOCUMENT_TYPES];

export const PROBLEM_CODES = {
  validationFailed: "VALIDATION_FAILED",
  notFound: "NOT_FOUND",
  conflict: "CONFLICT",
  unauthorized: "UNAUTHORIZED",
  forbidden: "FORBIDDEN",
  integrationUnavailable: "INTEGRATION_UNAVAILABLE",
  internalError: "INTERNAL_ERROR",
} as const;
export type ProblemCode = (typeof PROBLEM_CODES)[keyof typeof PROBLEM_CODES];

export const REQUIRED_ACTIONS = {
  none: "NONE",
  signIn: "SIGN_IN",
  requestAccess: "REQUEST_ACCESS",
  reconnectIntegration: "RECONNECT_INTEGRATION",
  retry: "RETRY",
  fixInput: "FIX_INPUT",
} as const;
export type RequiredAction = (typeof REQUIRED_ACTIONS)[keyof typeof REQUIRED_ACTIONS];

export interface ApiProblem {
  type: string;
  status: number;
  code: ProblemCode;
  titleKey: string;
  detailKey: string;
  requiredAction: RequiredAction;
  correlationId: string;
  meta: Record<string, unknown>;
}
export interface ApiSuccess<T> { ok: true; data: T }
export interface ApiFailure { ok: false; problem: ApiProblem }
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export interface ProjectSummary {
  id: string;
  key: string;
  name: string;
  description: string;
  color: string;
  progress: number;
  completedItems: number;
  totalItems: number;
  activeSprint: string | null;
  repositoryFullName: string | null;
  health: string;
}
export interface MemberSummary {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: MemberRole;
  status: string;
}
export interface ExternalLinkContract { label: string; url: string }
export interface GithubCommitLinkContract {
  sha: string;
  message: string;
  url: string | null;
  branch: string | null;
  committedAt: string | null;
  sources: GithubLinkSource[];
}
export interface GithubPullRequestLinkContract {
  number: number;
  title: string;
  url: string;
  state: GithubPullRequestState;
  status: GithubPullRequestStatus;
  draft: boolean;
  headBranch: string;
  baseBranch: string;
  headSha: string;
  action: string;
  reviewState: GithubReviewState | null;
  authorLogin: string | null;
  updatedAt: string | null;
  closedAt: string | null;
  mergedAt: string | null;
  sources: GithubLinkSource[];
}
export interface GithubLinkContract {
  branches: string[];
  commits: GithubCommitLinkContract[];
  pullRequests: GithubPullRequestLinkContract[];
}
export interface WorkflowStatusContract {
  id: string;
  name: string;
  category: WorkflowCategory;
  color: string;
  order: number;
}
export interface WorkflowTransitionContract {
  id: string;
  name: string;
  fromStatusId: string;
  toStatusId: string;
}
export interface WorkItemContract {
  id: string;
  key: string;
  projectKey: string;
  type: WorkItemType;
  summary: string;
  description: string;
  statusId: string;
  priority: Priority;
  assigneeId: string | null;
  reporterId: string;
  moduleId: string | null;
  parentId: string | null;
  sprintId: string | null;
  labels: string[];
  storyPoints: number | null;
  dueDate: string | null;
  rank: number;
  figmaLinks: ExternalLinkContract[];
  documentLinks: ExternalLinkContract[];
  github: GithubLinkContract | null;
}
