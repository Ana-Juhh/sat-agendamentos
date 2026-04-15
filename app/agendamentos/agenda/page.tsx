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

type User = {
  id: string
  name?: string
  nome?: string
  email?: string
}

type Chromebook = {
  id: string
  codigo?: string
}

type AgendaRecord = {
  id: string
  data: string
  inicio: number
  fim: number
  status: 'ativo' | 'cancelado'
  turma?: string
  classe?: string
  observacoes?: string
  tipo?: 'chromebooks' | 'lab' | 'maker'
  chromebooks?: string[]
  expand?: {
    usuario?: User
    chromebooks?: Chromebook[]
  }
}

const CORES_TIPO = {
  chromebooks: { bg: '#DBEAFE', border: '#2563EB' },
  lab: { bg: '#DCFCE7', border: '#16A34A' },
  maker: { bg: '#FEF3C7', border: '#D97706' },
}

function normalizarDataISO(v: string) {
  if (!v) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  return v.slice(0, 10)
}

function minutosParaHora(minutos: number) {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function minutosParaISO(data: string, minutos: number) {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${normalizarDataISO(data)}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}

function montarTitulo(record: AgendaRecord) {
  const nomeProfessor =
    record.expand?.usuario?.name ||
    record.expand?.usuario?.nome ||
    record.expand?.usuario?.email ||
    'Professor(a)'

  const recurso =
    record.tipo === 'lab'
      ? 'Lab. de Ciencias'
      : record.tipo === 'maker'
        ? 'Sala Maker'
        : `${record.expand?.chromebooks?.length || record.chromebooks?.length || 0} Chromebook(s)`

  return `${nomeProfessor} - ${recurso}`
}

function montarDescricao(record: AgendaRecord) {
  const turma = record.turma ? `${record.turma}${record.classe ? ` ${record.classe}` : ''}` : 'Sem turma'
  const horario = `${minutosParaHora(record.inicio)} - ${minutosParaHora(record.fim)}`

  if (record.tipo === 'chromebooks') {
    const codigos =
      record.expand?.chromebooks?.map((item) => item.codigo || item.id).join(', ') ||
      record.chromebooks?.join(', ') ||
      'Sem itens'

    return `${turma}\n${horario}\n${codigos}`
  }

  return `${turma}\n${horario}`
}

export default function Agenda() {
  const router = useRouter()
  const [eventos, setEventos] = useState<EventInput[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregarAgenda() {
      const model = pb.authStore.model as { role?: string } | null

      if (!pb.authStore.isValid) {
        router.replace('/login')
        return
      }

      if (!canViewAllAgendamentos(model?.role)) {
        router.replace('/dashboard')
        return
      }

      try {
        setCarregando(true)

        const [agendamentosChromebooks, agendamentosEspacos] = await Promise.all([
          pb.collection(AG_COLLECTION).getFullList<AgendaRecord>({
            filter: `status = "ativo"`,
            expand: 'usuario,chromebooks',
            sort: 'data,inicio',
            requestKey: null,
          }),
          pb.collection(ESPACOS_COLLECTION).getFullList<AgendaRecord>({
            filter: `status = "ativo"`,
            expand: 'usuario',
            sort: 'data,inicio',
            requestKey: null,
          }),
        ])

        const registros: AgendaRecord[] = [
          ...agendamentosChromebooks.map((item) => ({ ...item, tipo: 'chromebooks' as const })),
          ...agendamentosEspacos,
        ]

        const formatados = registros.map((item) => {
          const tipo = item.tipo || 'chromebooks'
          const cor = CORES_TIPO[tipo]

          return {
            id: `${tipo}-${item.id}`,
            title: montarTitulo(item),
            start: minutosParaISO(item.data, item.inicio),
            end: minutosParaISO(item.data, item.fim),
            backgroundColor: cor.bg,
            borderColor: cor.border,
            textColor: '#1F2937',
            extendedProps: {
              descricao: montarDescricao(item),
              observacoes: item.observacoes || '',
            },
          } satisfies EventInput
        })

        setEventos(formatados)
      } catch (err) {
        console.error(err)
        alert('Erro ao carregar agenda geral')
      } finally {
        setCarregando(false)
      }
    }

    void carregarAgenda()
  }, [router])

  function handleEventClick(info: EventClickArg) {
    const descricao = String(info.event.extendedProps.descricao || '')
    const observacoes = String(info.event.extendedProps.observacoes || '')

    alert(
      [info.event.title, descricao, observacoes ? `Observacoes: ${observacoes}` : '']
        .filter(Boolean)
        .join('\n\n')
    )
  }

  return (
    <>
      <HeaderDashboard />

      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h1 className="text-3xl font-bold mb-3">Agenda geral</h1>
          <p className="text-sm text-gray-600">
            Professores podem consultar aqui quem ja reservou Chromebooks, Lab. de Ciencias ou Sala Maker.
          </p>

          <div className="flex flex-wrap gap-3 mt-4 text-sm">
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
              Chromebooks
            </span>
            <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 font-medium">
              Lab. de Ciencias
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">
              Sala Maker
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          {carregando ? (
            <div className="text-center py-20 text-gray-500">Carregando agenda...</div>
          ) : (
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
              locale="pt-br"
              initialView="timeGridWeek"
              timeZone="local"
              slotMinTime="07:00:00"
              slotMaxTime="22:00:00"
              height="auto"
              allDaySlot={false}
              events={eventos}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listWeek,listDay',
              }}
              eventClick={handleEventClick}
            />
          )}
        </div>
      </div>
    </>
  )
}
