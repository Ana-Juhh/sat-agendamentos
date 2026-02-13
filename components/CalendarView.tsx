'use client'
import React from 'react'
import dynamic from 'next/dynamic'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

// Importa o FullCalendar apenas no lado do cliente
const FullCalendar = dynamic(() => import('@fullcalendar/react'), {
  ssr: false,
})

export default function CalendarView() {
  return (
    <div className="bg-white rounded-xl shadow p-4 text-black">
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridDay"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'timeGridDay,timeGridWeek'
        }}
        events={[]}
        height="auto"
        selectable={true}
        locale="pt-br"
      />
    </div>
  )
}