import { NextRequest, NextResponse } from 'next/server'
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

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()

    if (!token) {
      return NextResponse.json(
        { error: 'Token do usuário não enviado.' },
        { status: 401 }
      )
    }

    const { pb, user } = await validarUsuarioPocketBase(token)

    const body = await request.json()

    const summary = String(body.summary || 'Agendamento')
    const description = String(body.description || '')
    const location = String(body.location || '')
    const startDateTime = String(body.startDateTime || '')
    const endDateTime = String(body.endDateTime || '')
    const timeZone = String(body.timeZone || 'America/Sao_Paulo')
    const calendarId = String(body.calendarId || '')

    if (!startDateTime || !endDateTime) {
      return NextResponse.json(
        { error: 'startDateTime e endDateTime são obrigatórios.' },
        { status: 400 }
      )
    }

    const tokenRecord = await pb
      .collection('google_calendar_tokens')
      .getFirstListItem<GoogleCalendarTokenRecord>(`usuario = "${user.id}"`, {
        requestKey: null,
      })
      .catch(() => null)

    if (!tokenRecord?.refresh_token && !tokenRecord?.access_token) {
      return NextResponse.json(
        {
          error:
            'Google Agenda não conectado. Conecte sua conta antes de criar eventos.',
        },
        { status: 400 }
      )
    }

    const { clientId, clientSecret, redirectUri } = getGoogleConfig()

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    )

    oauth2Client.setCredentials({
      access_token: tokenRecord.access_token,
      refresh_token: tokenRecord.refresh_token,
      expiry_date: tokenRecord.expiry_date,
    })

    await oauth2Client.getAccessToken()

    const credentials = oauth2Client.credentials

    if (credentials.access_token || credentials.expiry_date) {
      await pb.collection('google_calendar_tokens').update(tokenRecord.id, {
        access_token: credentials.access_token || tokenRecord.access_token || '',
        expiry_date: credentials.expiry_date || tokenRecord.expiry_date || 0,
        scope: credentials.scope || tokenRecord.scope || '',
      })
    }

    const calendar = google.calendar({
      version: 'v3',
      auth: oauth2Client,
    })

    const resposta = await calendar.events.insert({
      calendarId: calendarId || tokenRecord.calendar_id || 'primary',
      requestBody: {
        summary,
        description,
        location,
        start: {
          dateTime: startDateTime,
          timeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone,
        },
      },
    })

    return NextResponse.json({
      ok: true,
      eventId: resposta.data.id,
      htmlLink: resposta.data.htmlLink,
    })
  } catch (error) {
    console.error('Erro ao criar evento no Google Agenda:', error)

    return NextResponse.json(
      { error: 'Erro ao criar evento no Google Agenda.' },
      { status: 500 }
    )
  }
}