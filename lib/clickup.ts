type ClickUpTaskStatus =
  | string
  | {
      status?: string;
      type?: string;
      color?: string;
    }
  | null
  | undefined;

export type ClickUpTask = {
  id: string;
  name: string;
  description?: string | null;
  status?: ClickUpTaskStatus;
  priority?: {
    priority?: string;
    color?: string;
  } | null;
  assignees?: Array<{
    id?: number | string;
    username?: string;
    email?: string;
  }>;
  date_created?: string;
  date_updated?: string;
  list?: {
    name?: string;
  };
};

type ClickUpTasksResponse = {
  tasks?: ClickUpTask[];
};

const CLICKUP_BASE_URL = "https://api.clickup.com/api/v2";

export function getClickUpStatusText(status: ClickUpTaskStatus) {
  if (typeof status === "string") {
    return status;
  }

  if (status && typeof status === "object" && typeof status.status === "string") {
    return status.status;
  }

  return "";
}

export function getClickUpTaskDescription(task: ClickUpTask) {
  return typeof task.description === "string" ? task.description.trim() : "";
}

export function getClickUpPriorityText(task: ClickUpTask) {
  return task.priority?.priority || "";
}

export function getClickUpAssigneesText(task: ClickUpTask) {
  if (!Array.isArray(task.assignees)) {
    return "";
  }

  return task.assignees
    .map((assignee) => assignee.username || assignee.email || "")
    .filter(Boolean)
    .join(", ");
}

export function getClickUpTimestamp(task: ClickUpTask) {
  const value = task.date_updated || task.date_created;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function fetchClickUpTasks(sourceId: string, sourceType: "list" | "view" = "list") {
  const token = process.env.CLICKUP_API_TOKEN;

  if (!token) {
    throw new Error("CLICKUP_API_TOKEN nao configurado.");
  }

  const response = await fetch(`${CLICKUP_BASE_URL}/${sourceType}/${sourceId}/task`, {
    method: "GET",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar ClickUp: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as ClickUpTasksResponse;
  return Array.isArray(data.tasks) ? data.tasks : [];
}
