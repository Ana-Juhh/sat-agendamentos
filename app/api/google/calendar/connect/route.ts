import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import PocketBase from 'pocketbase'
import { randomUUID } from 'crypto'

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
  const scope =
    process.env.GOOGLE_CALENDAR_SCOPE ||
    'https://www.googleapis.com/auth/calendar.events'

  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID não foi encontrado no .env.local')
  }

  if (!clientSecret) {
    throw new Error('GOOGLE_CLIENT_SECRET não foi encontrado no .env.local')
  }

  if (!redirectUri) {
    throw new Error('GOOGLE_REDIRECT_URI não foi encontrado no .env.local')
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    scope,
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

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()

    if (!token) {
      return NextResponse.json(
        {
          error: 'Token do PocketBase não enviado. Faça login novamente.',
        },
        { status: 401 }
      )
    }

    const { user } = await validarUsuarioPocketBase(token)

    const { clientId, clientSecret, redirectUri, scope } = getGoogleConfig()

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    )

    const state = `${user.id}.${randomUUID()}`

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: true,
      scope: scope.split(' '),
      state,
    })

    const response = NextResponse.json({ url })

    const secure = process.env.NODE_ENV === 'production'

    response.cookies.set('google_calendar_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: 10 * 60,
    })

    response.cookies.set('google_calendar_pb_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: 10 * 60,
    })

    return response
  } catch (error: any) {
    console.error('Erro ao iniciar conexão com Google Agenda:', error)

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Erro ao iniciar conexão com Google Agenda. Veja o terminal.',
      },
      { status: 500 }
    )
  }
}