'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import HeaderDashboard from '@/components/HeaderDashboard'
import { pb } from '@/lib/pocketbase'

const CARRINHOS = [
  { id: 1, label: 'Carrinho 1 – Corredor salas 5 a 10' },
  { id: 2, label: 'Carrinho 2 – Corredor salas 5 a 10' },
  { id: 3, label: 'Carrinho 3 – Corredor salas 11 a 14' },
  { id: 4, label: 'Carrinho 4 – Corredor salas 11 a 14' },
]

export default function NovoAgendamento() {
  const router = useRouter()

  const [carrinho, setCarrinho] = useState('')
  const [data, setData] = useState('')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!pb.authStore.isValid) {
      router.push('/login')
    }
  }, [router])

 function horaParaMinutos(hora: string) {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()

  const inicioMin = horaParaMinutos(inicio)
  const fimMin = horaParaMinutos(fim)

  if (fimMin <= inicioMin) {
    alert('Horário final deve ser maior que o inicial')
    return
  }

  try {
    await pb.collection('agendamentos').create({
      carrinho: Number(carrinho),
      data, // YYYY-MM-DD (string)
      inicio: inicioMin,
      fim: fimMin,
      usuario: pb.authStore.model?.id,
    })

    router.push('/agendamentos/meus')
  } catch (err: any) {
    alert(err?.data?.message || 'Erro ao salvar agendamento')
  }
}


  return (
    <>
      <HeaderDashboard />

      <div className="max-w-3xl mx-auto py-16">
        <h1 className="text-3xl font-bold mb-10 text-center">
          Novo agendamento
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-md rounded-2xl p-8 space-y-6"
        >
         {/* Agendamento individual (link externo) */}
          <div className="mb-8">
            <a
              href="https://aliceapp.ia.br"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center rounded-xl py-4
                        bg-blue-500 text-white font-semibold
                        hover:bg-blue-600 transition"
            >
              💻 Agendar Chromebook individualmente
            </a>
          </div>

          
          {/* Carrinho (ÍCONE) */}
          <div>
            <label className="block font-medium mb-4">
              Escolha o carrinho
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CARRINHOS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCarrinho(String(c.id))}
                  className={`border rounded-xl p-5 text-left transition shadow-sm
                    ${
                      carrinho === String(c.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:border-gray-400'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">🛒</span>

                    <div>
                      <p className="font-semibold text-lg">
                        Carrinho {c.id}
                      </p>
                      <p className="text-sm text-gray-600">
                        {c.label}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Data */}
          <div>
            <label className="block font-medium mb-2">Data</label>
            <input
              type="date"
              className="w-full border rounded-lg px-4 py-2"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
            />
          </div>

          {/* Horários */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-2">Início</label>
              <input
                type="time"
                className="w-full border rounded-lg px-4 py-2"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-2">Fim</label>
              <input
                type="time"
                className="w-full border rounded-lg px-4 py-2"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar agendamento'}
          </button>
        </form>
      </div>
    </>
  )
}
