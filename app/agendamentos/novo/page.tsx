 'use client'

import { useRouter } from 'next/navigation'
import HeaderDashboard from '@/components/HeaderDashboard'
import BackButton from '@/components/BackButton'

export default function EscolherTipoAgendamento() {
  const router = useRouter()

  function irPara(tipo: string) {
    router.push(`/agendamentos/novo/${tipo}`)
  }

  return (
    <>
      <HeaderDashboard />

      <div className="max-w-5xl mx-auto py-16">
        <BackButton href="/dashboard" />
        <h1 className="text-3xl font-bold text-center mb-10">
          O que você deseja agendar?
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Chromebooks */}
          <button
            onClick={() => irPara('chromebooks')}
            className="bg-white shadow rounded-2xl p-8 hover:scale-105 transition text-center"
          >
            <div className="text-4xl mb-4">💻</div>
            <p className="text-lg font-semibold">Chromebooks</p>
          </button>

          {/* Laboratório */}
          <button
            onClick={() => irPara('lab')}
            className="bg-white shadow rounded-2xl p-8 hover:scale-105 transition text-center"
          >
            <div className="text-4xl mb-4">🔬</div>
            <p className="text-lg font-semibold">Lab. de Ciências</p>
          </button>

          {/* Sala Maker */}
          <button
            onClick={() => irPara('maker')}
            className="bg-white shadow rounded-2xl p-8 hover:scale-105 transition text-center"
          >
            <div className="text-4xl mb-4">🛠</div>
            <p className="text-lg font-semibold">Sala Maker</p>
          </button>

        </div>
      </div>
    </>
  )
}