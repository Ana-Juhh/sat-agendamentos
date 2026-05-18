'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, EventInput } from '@fullcalendar/core'

import { pb } from '@/lib/pocketbase'
import HeaderDashboard from '@/components/HeaderDashboard'
import { AG_COLLECTION } from '@/lib/agendamentoConfig'
import { ESPACOS_COLLECTION } from '@/lib/espacoConfig'
import { canViewAllAgendamentos } from '@/lib/roles'
import BackButton from '@/components/BackButton'

type User = {
  id: string
  name?: string
  nome?: string
  email?: string
  role?: string
}

type Chromebook = {
  id: string
  codigo?: string
}

type TipoAgendamento = 'chromebooks' | 'lab' | 'maker'

type AgendaRecord = {
  id: string
  usuario: string
  data: string
  inicio: number
  fim: number
  status: 'ativo' | 'cancelado'
  status_entrega?: 'pendente' | 'em_uso' | 'devolvido' | 'atrasado'
  turma?: string
  classe?: string
  observacoes?: string
  tipo?: TipoAgendamento
  chromebooks?: string[]
  grupo_agendamento?: string
  expand?: {
    usuario?: User
    chromebooks?: Chromebook[]
  }
}

const CORES_TIPO: Record<TipoAgendamento, { bg: string; border: string }> = {
  chromebooks: {
    bg: '#DBEAFE',
    border: '#2563EB',
  },
  lab: {
    bg: '#DCFCE7',
    border: '#16A34A',
  },
  maker: {
    bg: '#FEF3C7',
    border: '#D97706',
  },
}

function normalizarDataISO(valor: string) {
  if (!valor) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor
  return valor.slice(0, 10)
}

function minutosParaHora(minutos: number) {
  const h = Math.floor(Number(minutos || 0) / 60)
  const m = Number(minutos || 0) % 60

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function minutosParaISO(data: string, minutos: number) {
  const dataISO = normalizarDataISO(data)
  const h = Math.floor(Number(minutos || 0) / 60)
  const m = Number(minutos || 0) % 60

  return `${dataISO}T${String(h).padStart(2, '0')}:${String(m).padStart(
    2,
    '0'
  )}:00`
}

function nomeProfessor(record: AgendaRecord) {
  return (
    record.expand?.usuario?.name ||
    record.expand?.usuario?.nome ||
    record.expand?.usuario?.email ||
    'Professor(a)'
  )
}

function nomeRecurso(record: AgendaRecord) {
  if (record.tipo === 'lab') return 'Lab. de Ciências'
  if (record.tipo === 'maker') return 'Sala Maker'

  const quantidade =
    record.expand?.chromebooks?.length || record.chromebooks?.length || 0

  return `${quantidade} Chromebook(s)`
}

function nomeTurmaClasse(record: AgendaRecord) {
  if (!record.turma) return 'Sem turma'

  if (!record.classe) {
    return record.turma
  }

  return `${record.turma} ${record.classe}`
}

function codigosChromebooks(record: AgendaRecord) {
  const codigosExpand =
    record.expand?.chromebooks
      ?.map((item) => item.codigo || item.id)
      .filter(Boolean) ?? []

  if (codigosExpand.length > 0) {
    return codigosExpand.join(', ')
  }

  return record.chromebooks?.join(', ') || ''
}

function montarTitulo(record: AgendaRecord, mostrarProfessor: boolean) {
  const recurso = nomeRecurso(record)

  if (mostrarProfessor) {
    return `${nomeProfessor(record)} — ${recurso}`
  }

  return recurso
}

function montarDescricao(record: AgendaRecord) {
  const turma = nomeTurmaClasse(record)
  const horario = `${minutosParaHora(record.inicio)} às ${minutosParaHora(
    record.fim
  )}`

  if (record.tipo === 'chromebooks') {
    const codigos = codigosChromebooks(record)

    return [
      `Turma: ${turma}`,
      `Horário: ${horario}`,
      codigos ? `Chromebooks: ${codigos}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }

  return [`Turma: ${turma}`, `Horário: ${horario}`].join('\n')
}

function nomeStatus(status?: string) {
  if (status === 'em_uso') return 'Em uso'
  if (status === 'atrasado') return 'Atrasado'
  if (status === 'devolvido') return 'Devolvido'
  return 'Pendente'
}

export default function AgendaAgendamentos() {
  const router = useRouter()

  const [eventos, setEventos] = useState<EventInput[]>([])
  const [carregando, setCarregando] = useState(true)
  const [titulo, setTitulo] = useState('Agenda de Agendamentos')
  const [conectandoGoogle, setConectandoGoogle] = useState(false)
  const [statusGoogle, setStatusGoogle] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get('google_calendar')

    if (status) {
      setStatusGoogle(status)
    }
  }, [])

  useEffect(() => {
    async function carregarAgenda() {
      if (!pb.authStore.isValid) {
        router.replace('/login')
        return
      }

      const model = pb.authStore.model as {
        id?: string
        role?: string
      } | null

      const usuarioId = model?.id
      const podeVerTodos = canViewAllAgendamentos(model?.role)

      if (!usuarioId) {
        router.replace('/login')
        return
      }

      setTitulo(podeVerTodos ? 'Agenda Geral' : 'Minha Agenda')

      try {
        setCarregando(true)

        const filtroChromebooks = podeVerTodos
          ? `status = "ativo" && status_entrega != "devolvido"`
          : `usuario = "${usuarioId}" && status = "ativo" && status_entrega != "devolvido"`

        const filtroEspacos = podeVerTodos
          ? `status = "ativo" && status_entrega != "devolvido"`
          : `usuario = "${usuarioId}" && status = "ativo" && status_entrega != "devolvido"`

        const [agendamentosChromebooks, agendamentosEspacos] =
          await Promise.all([
            pb.collection(AG_COLLECTION).getFullList<AgendaRecord>({
              filter: filtroChromebooks,
              expand: 'usuario,chromebooks',
              sort: '+data,+inicio',
              requestKey: null,
            }),

            pb.collection(ESPACOS_COLLECTION).getFullList<AgendaRecord>({
              filter: filtroEspacos,
              expand: 'usuario',
              sort: '+data,+inicio',
              requestKey: null,
            }),
          ])

        const registros: AgendaRecord[] = [
          ...agendamentosChromebooks.map((item) => ({
            ...item,
            tipo: 'chromebooks' as const,
          })),

          ...agendamentosEspacos.map((item) => ({
            ...item,
            tipo: (item.tipo || 'maker') as TipoAgendamento,
          })),
        ]

        const formatados = registros.map((item) => {
          const tipo = item.tipo || 'chromebooks'
          const cor = CORES_TIPO[tipo]

          return {
            id: `${tipo}-${item.id}`,
            title: montarTitulo(item, podeVerTodos),
            start: minutosParaISO(item.data, item.inicio),
            end: minutosParaISO(item.data, item.fim),
            backgroundColor: cor.bg,
            borderColor: cor.border,
            textColor: '#111827',
            extendedProps: {
              professor: nomeProfessor(item),
              recurso: nomeRecurso(item),
              descricao: montarDescricao(item),
              observacoes: item.observacoes || '',
              tipo,
              status_entrega: item.status_entrega || '',
            },
          } satisfies EventInput
        })

        setEventos(formatados)
      } catch (err) {
        console.error('Erro ao carregar agenda:', err)
        alert('Erro ao carregar agenda')
      } finally {
        setCarregando(false)
      }
    }

    void carregarAgenda()
  }, [router])

 async function conectarGoogleAgenda() {
  try {
    setConectandoGoogle(true)

    const token = pb.authStore.token

    if (!token) {
      alert('Faça login novamente para conectar o Google Agenda.')
      return
    }

    const resposta = await fetch('/api/google/calendar/connect', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const dados = await resposta.json().catch(() => null)

    if (!resposta.ok || !dados?.url) {
      console.error('Erro ao conectar Google Agenda:', dados)

      alert(
        dados?.error ||
          `Erro ao conectar Google Agenda. Status: ${resposta.status}`
      )

      return
    }

    window.location.href = dados.url
  } catch (error) {
    console.error(error)
    alert('Erro ao conectar Google Agenda. Veja o console.')
  } finally {
    setConectandoGoogle(false)
  }
}

  function handleEventClick(info: EventClickArg) {
    const props = info.event.extendedProps as {
      professor?: string
      recurso?: string
      descricao?: string
      observacoes?: string
      status_entrega?: string
    }

    const detalhes = [
      `Agendamento: ${info.event.title}`,
      props.professor ? `Responsável: ${props.professor}` : '',
      props.recurso ? `Recurso: ${props.recurso}` : '',
      props.status_entrega
        ? `Status: ${nomeStatus(props.status_entrega)}`
        : '',
      props.descricao ? `\n${props.descricao}` : '',
      props.observacoes ? `\nObservações: ${props.observacoes}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    alert(detalhes)
  }

  return (
    <>
      <HeaderDashboard />

      <main className="max-w-7xl mx-auto px-4 py-10">
        <BackButton href="/dashboard" />

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">{titulo}</h1>

            <p className="text-gray-500 mt-2">
              Visualize os agendamentos de Chromebooks, Sala Maker e Lab. de
              Ciências em formato de calendário.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={conectarGoogleAgenda}
              disabled={conectandoGoogle}
              className="px-5 py-3 rounded-xl border border-slate-400 font-semibold hover:bg-slate-700 hover:text-white hover:border-slate-600 disabled:opacity-50"
            >
              {conectandoGoogle ? 'Conectando...' : 'Conectar Google Agenda'}
            </button>

            <button
              type="button"
              onClick={() => router.push('/agendamentos/novo')}
              className="px-5 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold"
            >
              Novo agendamento
            </button>
          </div>
        </div>

        {statusGoogle ? (
          <div
            className={`mb-6 rounded-2xl border px-5 py-4 ${
              statusGoogle === 'conectado'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {statusGoogle === 'conectado'
              ? 'Google Agenda conectado com sucesso.'
              : 'Não foi possível conectar o Google Agenda. Tente novamente.'}
          </div>
        ) : null}

        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border bg-blue-600 px-4 py-3">
            <p className="text-sm font-semibold text-white">Chromebooks</p>
            <p className="text-xs text-blue-100">Azul</p>
          </div>

          <div className="rounded-xl border bg-green-600 px-4 py-3">
            <p className="text-sm font-semibold text-white">
              Lab. de Ciências
            </p>
            <p className="text-xs text-green-100">Verde</p>
          </div>

          <div className="rounded-xl border bg-orange-600 px-4 py-3">
            <p className="text-sm font-semibold text-white">Sala Maker</p>
            <p className="text-xs text-orange-100">Laranja</p>
          </div>
        </div>

        <div className="bg-white border shadow-sm rounded-2xl p-4">
          {carregando ? (
            <div className="text-center py-20 text-gray-500">
              Carregando agenda...
            </div>
          ) : (
            <FullCalendar
              plugins={[
                dayGridPlugin,
                timeGridPlugin,
                listPlugin,
                interactionPlugin,
              ]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
              }}
              buttonText={{
                today: 'Hoje',
                month: 'Mês',
                week: 'Semana',
                day: 'Dia',
                list: 'Lista',
              }}
              locale="pt-br"
              height="auto"
              events={eventos}
              eventClick={handleEventClick}
              nowIndicator
              slotMinTime="07:00:00"
              slotMaxTime="19:00:00"
              allDaySlot={false}
              dayMaxEvents={3}
              moreLinkText="mais"
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }}
            />
          )}
        </div>
      </main>
    </>
  )
}