import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TASKS_LIST_ID = process.env.CLICKUP_TASKS_LIST_ID || '901113131877'

function getClickUpToken() {
  const token = process.env.CLICKUP_API_TOKEN

  if (!token) {
    throw new Error('CLICKUP_API_TOKEN não configurado no .env.local')
  }

  return token
}

function normalizarStatus(status: any) {
  return String(status?.status || status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function separarTarefas(tasks: any[]) {
  const todo: any[] = []
  const inProgress: any[] = []

  for (const task of tasks) {
    const status = normalizarStatus(task.status)

    if (
      status.includes('andamento') ||
      status.includes('progress') ||
      status.includes('doing') ||
      status.includes('em andamento')
    ) {
      inProgress.push(task)
    } else {
      todo.push(task)
    }
  }

  return {
    tasks,
    todo,
    inProgress,
  }
}

export async function GET() {
  try {
    const token = getClickUpToken()

    const url = new URL(
      `https://api.clickup.com/api/v2/list/${TASKS_LIST_ID}/task`
    )

    url.searchParams.set('include_closed', 'false')
    url.searchParams.set('subtasks', 'true')

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Erro ClickUp tarefas:', data)

      return NextResponse.json(
        {
          tasks: [],
          todo: [],
          inProgress: [],
          error: data?.err || data?.message || 'Erro ao buscar tarefas.',
        },
        { status: response.status }
      )
    }

    return NextResponse.json(separarTarefas(data.tasks || []))
  } catch (error: any) {
    console.error('Erro /api/tasks:', error)

    return NextResponse.json(
      {
        tasks: [],
        todo: [],
        inProgress: [],
        error: error?.message || 'Erro ao buscar tarefas.',
      },
      { status: 500 }
    )
  }
}