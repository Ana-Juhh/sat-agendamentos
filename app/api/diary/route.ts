import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DIARY_LIST_ID = process.env.CLICKUP_DIARY_LIST_ID || '901113131670'
const DIARY_VIEW_ID = process.env.CLICKUP_DIARY_VIEW_ID || '901113131670'

function getClickUpToken() {
  const token = process.env.CLICKUP_API_TOKEN?.trim()

  if (!token) {
    throw new Error('CLICKUP_API_TOKEN não configurado no .env.local')
  }

  if (token.startsWith('Bearer ')) {
    return token.replace(/^Bearer\s+/i, '').trim()
  }

  return token
}

async function buscarPorLista(token: string) {
  const todasTasks: any[] = []

  for (let page = 0; page < 5; page++) {
    const url = new URL(
      `https://api.clickup.com/api/v2/list/${DIARY_LIST_ID}/task`
    )

    url.searchParams.set('include_closed', 'true')
    url.searchParams.set('subtasks', 'true')
    url.searchParams.set('order_by', 'created')
    url.searchParams.set('reverse', 'true')
    url.searchParams.set('page', String(page))
    // FORÇA O CLICKUP A ENVIAR A DESCRIÇÃO DA TASK NA LISTAGEM:
    url.searchParams.set('include_markdown_description', 'true')

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: token,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        ok: false,
        tasks: [],
        error: data?.err || data?.message || 'Erro ao buscar diário por lista.',
        status: response.status,
        source: 'list',
      }
    }

    const tasks = Array.isArray(data.tasks) ? data.tasks : []

    todasTasks.push(...tasks)

    if (tasks.length === 0) {
      break
    }
  }

  return {
    ok: true,
    tasks: todasTasks,
    source: 'list',
  }
}

async function buscarPorView(token: string) {
  const todasTasks: any[] = []

  for (let page = 0; page < 5; page++) {
    const url = new URL(
      `https://api.clickup.com/api/v2/view/${DIARY_VIEW_ID}/task`
    )

    url.searchParams.set('page', String(page))

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: token,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        ok: false,
        tasks: [],
        error: data?.err || data?.message || 'Erro ao buscar diário por view.',
        status: response.status,
        source: 'view',
      }
    }

    const tasks = Array.isArray(data.tasks) ? data.tasks : []

    todasTasks.push(...tasks)

    if (tasks.length === 0) {
      break
    }
  }

  return {
    ok: true,
    tasks: todasTasks,
    source: 'view',
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = getClickUpToken()
    const debug = new URL(request.url).searchParams.get('debug') === '1'

    const resultadoLista = await buscarPorLista(token)

    let resultadoFinal = resultadoLista

    if (!resultadoLista.ok || resultadoLista.tasks.length === 0) {
      const resultadoView = await buscarPorView(token)

      if (resultadoView.ok && resultadoView.tasks.length > 0) {
        resultadoFinal = resultadoView
      }
    }

    if (!resultadoFinal.ok) {
      console.error('Erro ClickUp diário:', resultadoFinal)

      return NextResponse.json(
        {
          tasks: [],
          error: resultadoFinal.error,
          source: resultadoFinal.source,
          status: resultadoFinal.status,
        },
        { status: resultadoFinal.status || 500 }
      )
    }

    const tasks = resultadoFinal.tasks || []

    return NextResponse.json({
      tasks,
      source: resultadoFinal.source,
      count: tasks.length,
      debug: debug
        ? {
            diaryListId: DIARY_LIST_ID,
            diaryViewId: DIARY_VIEW_ID,
            primeirosTitulos: tasks.slice(0, 15).map((task: any) => task.name),
          }
        : undefined,
    })
  } catch (error: any) {
    console.error('Erro /api/diary:', error)

    return NextResponse.json(
      {
        tasks: [],
        error: error?.message || 'Erro ao buscar diário.',
      },
      { status: 500 }
    )
  }
}