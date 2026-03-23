'use client'

import { useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'

import { pb } from '@/lib/pocketbase'
import HeaderDashboard from '@/components/HeaderDashboard'

/* =========================
   UTILIDADES
========================= */

function minutosParaISO(data: string, minutos: number) {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60

  return `${data}T${String(h).padStart(2, '0')}:${String(m).padStart(
    2,
    '0'
  )}:00`
}

/* =========================
   CORES POR CARRINHO
========================= */

const CORES_CARRINHO: Record<
  number,
  { bg: string; border: string }
> = {
  1: { bg: '#DBEAFE', border: '#2563EB' }, // azul
  2: { bg: '#DCFCE7', border: '#16A34A' }, // verde
  3: { bg: '#FEF3C7', border: '#D97706' }, // amarelo
  4: { bg: '#FCE7F3', border: '#DB2777' }, // rosa
}

/* =========================
   GOOGLE AGENDA
========================= */

function gerarLinkGoogle(evento: any) {
  const inicio = evento.startStr.replace(/[-:]/g, '').split('.')[0]
  const fim = evento.endStr.replace(/[-:]/g, '').split('.')[0]

  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    evento.title
  )}&dates=${inicio}/${fim}`
}

/* =========================
   COMPONENTE
========================= */

export default function Agenda() {
  const [eventos, setEventos] = useState<any[]>([])

  useEffect(() => {
    async function carregarAgenda() {
      const agendamentos =
        await pb.collection('agendamentos_tmp').getFullList({
          expand: 'usuario',
        })

      const formatados = agendamentos.map((a) => {
        const cor =
          CORES_CARRINHO[a.carrinho] || {
            bg: '#E5E7EB',
            border: '#6B7280',
          }

        return {
          title: `${a.expand?.usuario?.name || 'Professor(a)'} – Carrinho ${
            a.carrinho
          }`,
          start: minutosParaISO(a.data, a.inicio),
          end: minutosParaISO(a.data, a.fim),
          backgroundColor: cor.bg,
          borderColor: cor.border,
          textColor: '#1F2937',
        }
      })

      setEventos(formatados)
    }

    carregarAgenda()
  }, [])

  return (
    <>
      <HeaderDashboard />

      <div className="max-w-6xl mx-auto p-6 bg-white rounded-2xl shadow">
        <FullCalendar
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            listPlugin,
            interactionPlugin,
          ]}
          locale="pt-br"
          initialView="listDay"
          timeZone="local"
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          height="auto"
          events={eventos}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek,listDay',
          }}
          eventClick={(info) => {
            const link = gerarLinkGoogle(info.event)
            window.open(link, '_blank')
          }}
        />
      </div>
    </>
  )
}
