import { NextResponse } from "next/server";

import { fetchClickUpTasks, getClickUpTimestamp } from "@/lib/clickup";

export const dynamic = "force-dynamic";

function getSaoPauloDateKey(timestamp: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

export async function GET() {
  try {
    const listId = process.env.CLICKUP_DIARY_LIST_ID || process.env.CLICKUP_DIARY_VIEW_ID;

    if (!listId) {
      return NextResponse.json(
        { error: "CLICKUP_DIARY_LIST_ID nao configurado." },
        { status: 500 }
      );
    }

    const now = Date.now();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = getSaoPauloDateKey(yesterday.getTime());

    const tasks = (await fetchClickUpTasks(listId, "list"))
      .filter((task) => {
        const timestamp = getClickUpTimestamp(task);
        return timestamp > 0 && getSaoPauloDateKey(timestamp) === yesterdayKey;
      })
      .sort((a, b) => getClickUpTimestamp(b) - getClickUpTimestamp(a));

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
    const message = error instanceof Error ? error.message : "Erro ao buscar diario.";
    return NextResponse.json({ error: message, tasks: [] }, { status: 500 });
  }
}
