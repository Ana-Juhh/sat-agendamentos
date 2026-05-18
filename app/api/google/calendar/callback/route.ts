import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { google } from 'googleapis'
import PocketBase from 'pocketbase'

type GoogleCalendarTokenRecord = {
  id: string
  usuario: string
  email?: string
  access_token?: string
  refresh_token?: string
  expiry_date?: number
  scope?: string
  calendar_id?: string
}

function getPocketBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_POCKETBASE_URL ||
    process.env.POCKETBASE_URL ||
    'http://127.0.0.1:8090'
  )
}

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Configuração do Google Calendar incompleta no .env.local')
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  }
}

async function validarUsuarioPocketBase(token: string) {
  const pb = new PocketBase(getPocketBaseUrl())

  pb.authStore.save(token, null)

  const authData = await pb.collection('users').authRefresh()

  return {
    pb,
    user: authData.record as {
      id: string
      email?: string
      name?: string
      nome?: string
      role?: string
    },
  }
}

function redirectAgenda(request: NextRequest, status: string) {
  return NextResponse.redirect(
    new URL(`/agendamentos/agenda?google_calendar=${status}`, request.url)
  )
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()

  try {
    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')

    const cookieState = cookieStore.get('google_calendar_state')?.value
    const pbToken = cookieStore.get('google_calendar_pb_token')?.value

    if (!code || !state || !cookieState || state !== cookieState || !pbToken) {
      return redirectAgenda(request, 'erro_estado')
    }

    const { pb, user } = await validarUsuarioPocketBase(pbToken)

    const { clientId, clientSecret, redirectUri } = getGoogleConfig()

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    )

    const { tokens } = await oauth2Client.getToken(code)

    const existente = await pb
      .collection('google_calendar_tokens')
      .getFirstListItem<GoogleCalendarTokenRecord>(`usuario = "${user.id}"`, {
        requestKey: null,
      })
      .catch(() => null)

    const dados = {
      usuario: user.id,
      email: user.email || '',
      access_token: tokens.access_token || existente?.access_token || '',
      refresh_token: tokens.refresh_token || existente?.refresh_token || '',
      expiry_date: tokens.expiry_date || existente?.expiry_date || 0,
      scope: tokens.scope || existente?.scope || '',
      calendar_id: existente?.calendar_id || 'primary',
    }

    if (existente) {
      await pb.collection('google_calendar_tokens').update(existente.id, dados)
    } else {
      await pb.collection('google_calendar_tokens').create(dados)
    }

    const response = redirectAgenda(request, 'conectado')

    response.cookies.set('google_calendar_state', '', {
      path: '/',
      maxAge: 0,
    })

    response.cookies.set('google_calendar_pb_token', '', {
      path: '/',
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error('Erro no callback do Google Agenda:', error)

    const response = redirectAgenda(request, 'erro')

    response.cookies.set('google_calendar_state', '', {
      path: '/',
      maxAge: 0,
    })

    response.cookies.set('google_calendar_pb_token', '', {
      path: '/',
      maxAge: 0,
    })

    return response
  }
}