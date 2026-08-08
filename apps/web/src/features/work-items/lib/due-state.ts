export interface WorkItemDueState {
  date: Date | null;
  isOverdue: boolean;
  isDueSoon: boolean;
}

export function getWorkItemDueState(
  dueDate?: string,
  now = new Date(),
): WorkItemDueState {
  const date = dueDate ? new Date(dueDate) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return { date: null, isOverdue: false, isDueSoon: false };
  }

  const isOverdue = date < now;
  const isDueSoon =
    !isOverdue && date.getTime() - now.getTime() <= 2 * 24 * 60 * 60 * 1000;

  return { date, isOverdue, isDueSoon };
}
