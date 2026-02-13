'use client'
import { useEffect, useState } from 'react'
import { pb } from '@/lib/pocketbase'
import HeaderDashboard from '@/components/HeaderDashboard'

function minutosParaHora(minutos: number) {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatarData(data: string) {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

export default function MeusAgendamentos() {
  const [agendamentos, setAgendamentos] = useState<any[]>([])

  useEffect(() => {
    async function carregar() {
      const dados = await pb.collection('agendamentos').getFullList({
        filter: `usuario = "${pb.authStore.model?.id}"`,
        sort: 'data,inicio',
      })
      setAgendamentos(dados)
    }
    carregar()
  }, [])

  const agendamentosPorData = agendamentos.reduce((acc: any, ag: any) => {
    acc[ag.data] = acc[ag.data] || []
    acc[ag.data].push(ag)
    return acc
  }, {})

  return (
    <>
      <HeaderDashboard />
      
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-8">Meus Agendamentos</h1>

        {agendamentos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <p className="text-6xl mb-4">📅</p>
            <p className="text-gray-500 text-lg">
              Nenhum agendamento encontrado
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(agendamentosPorData).map(([data, itens]: any) => (
              <div key={data} className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold mb-4 text-gray-700">
                  📅 {formatarData(data)}
                </h2>
                
                <div className="space-y-3">
                  {itens.map((a: any) => (
                    <div
                      key={a.id}
                      className="flex justify-between items-center p-4 border border-gray-200 rounded-xl hover:border-blue-300 transition"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          🛒 Carrinho {a.carrinho}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          ⏰ {minutosParaHora(a.inicio)} – {minutosParaHora(a.fim)}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => {
                          if (confirm('Cancelar este agendamento?')) {
                            pb.collection('agendamentos').delete(a.id)
                              .then(() => {
                                setAgendamentos(prev => 
                                  prev.filter(ag => ag.id !== a.id)
                                )
                              })
                          }
                        }}
                        className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}