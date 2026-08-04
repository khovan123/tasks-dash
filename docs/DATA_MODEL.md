# Data model

## Project

- `key`: unique 2-10 character key used in work-item identifiers
- `name`, `description`, `color`, `icon`
- `leadId`, `memberIds`, `repositoryFullName`, `driveRootFolderId`
- `workflowId`, `activeSprintId`

## Work item

- `key`: generated as `<PROJECT_KEY>-<sequence>`
- `type`: MODULE, STORY, TASK, BUG, SUB_TASK
- `summary`, `description`, `status`, `priority`
- `moduleId`, `parentId`, `sprintId`
- `reporterId`, `assigneeId`, `labels`
- `storyPoints`, `dueDate`, `startedAt`, `completedAt`
- `github`: branch, commit SHAs, pull request number/url/state

## Workflow

- statuses grouped as TO_DO, IN_PROGRESS, DONE
- directed transitions with optional restrictions
- default status and project binding

## Sprint

- name, goal, start/end dates, state, capacity
- planned/completed points and work-item references

## Automation rule

- trigger, conditions, ordered actions
- execution strategy: EVENT or SCHEDULED
- run count, last result, last error, next run time
