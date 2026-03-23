import { NextResponse } from "next/server";

import { fetchClickUpTasks, getClickUpTimestamp } from "@/lib/clickup";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const listId = process.env.CLICKUP_TASKS_LIST_ID || process.env.CLICKUP_TASKS_VIEW_ID;

    if (!listId) {
      return NextResponse.json(
        { error: "CLICKUP_TASKS_LIST_ID nao configurado." },
        { status: 500 }
      );
    }

    const tasks = (await fetchClickUpTasks(listId, "list"))
      .sort((a, b) => getClickUpTimestamp(b) - getClickUpTimestamp(a))
      .slice(0, 10);

    return NextResponse.json(
      {
        tasks,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao buscar tarefas.";
    return NextResponse.json({ error: message, tasks: [] }, { status: 500 });
  }
}
