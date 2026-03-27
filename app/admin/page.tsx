'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { pb } from '@/lib/pocketbase'
import HeaderDashboard from '@/components/HeaderDashboard'
import { AG_COLLECTION } from '@/lib/agendamentoConfig'

type Chromebook = {
  id: string
  codigo?: string
  status?: string
}

type User = {
  id: string
  name?: string
  email?: string
  role?: 'admin' | 'professor'
}

type Agendamento = {
  id: string
  usuario: string
  chromebooks: string[]
  chromebooks_devolvidos?: string[]
  data: string
  inicio: number
  fim: number
  status: 'ativo' | 'cancelado'
  status_entrega?: 'pendente' | 'em_uso' | 'devolvido' | 'atrasado'
  turma?: string
  classe?: string
  observacoes?: string
  expand?: {
    chromebooks?: Chromebook[]
    chromebooks_devolvidos?: Chromebook[]
    usuario?: User
  }
}

function minutosParaHora(minutos: number) {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function normalizarDataISO(v: string) {
  if (!v) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  return v.slice(0, 10)
}

function formatarDataBR(dataISO: string) {
  const iso = normalizarDataISO(dataISO)
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])

  useEffect(() => {
    const model: any = pb.authStore.model

    if (!pb.authStore.isValid) {
      router.replace('/login')
      return
    }

    if (model?.role !== 'admin') {
      router.replace('/dashboard')
      return
    }

    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function carregar() {
    try {
      setLoading(true)

      const dados = await pb.collection(AG_COLLECTION).getFullList<Agendamento>({
        expand: 'usuario,chromebooks,chromebooks_devolvidos',
        sort: 'data,inicio',
        filter: `status = "ativo"`,
      })

      setAgendamentos(dados)
    } catch (err) {
      console.error(err)
      alert('Erro ao carregar agendamentos')
    } finally {
      setLoading(false)
    }
  }

  async function cancelar(id: string) {
    if (!confirm('Cancelar este agendamento?')) return

    try {
      await pb.collection(AG_COLLECTION).update(id, { status: 'cancelado' })
      setAgendamentos((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      console.error(err)
      alert('Erro ao cancelar')
    }
  }

  async function marcarRetirado(id: string) {
    try {
      await pb.collection(AG_COLLECTION).update(id, { status_entrega: 'em_uso' })
      setAgendamentos((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status_entrega: 'em_uso' } : a))
      )
    } catch (err) {
      console.error(err)
      alert('Erro ao marcar como retirado')
    }
  }

  function editar(id: string) {
    router.push(`/admin/agendamentos/${id}`)
  }

  function irParaDevolucao(id: string) {
    router.push(`/admin/agendamentos/${id}/devolucao`)
  }

  const agendamentosPorData = useMemo(() => {
    return agendamentos.reduce((acc: Record<string, Agendamento[]>, ag) => {
      const chave = normalizarDataISO(ag.data)
      acc[chave] = acc[chave] || []
      acc[chave].push(ag)
      return acc
    }, {})
  }, [agendamentos])

  if (loading) {
    return (
      <>
        <HeaderDashboard />
        <div className="max-w-6xl mx-auto py-16 text-center text-gray-500">
          Carregando...
        </div>
      </>
    )
  }

  return (
    <>
      <HeaderDashboard />

      <div className="max-w-6xl mx-auto py-16 px-4">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Agenda geral (Admin)
        </h1>

        {agendamentos.length === 0 ? (
          <p className="text-center text-gray-500">Nenhum agendamento encontrado</p>
        ) : (
          <div className="space-y-10">
            {Object.entries(agendamentosPorData).map(([dataISO, itens]) => (
              <div key={dataISO}>
                <h2 className="text-xl font-bold mb-4">
                  📅 {formatarDataBR(dataISO)}
                </h2>

                <div className="space-y-4">
                  {itens.map((a) => {
                    const chromes = a.expand?.chromebooks ?? []
                    const devolvidos = a.expand?.chromebooks_devolvidos ?? []

                    const listaCodigos =
                      chromes.length > 0
                        ? chromes.map((c) => c.codigo ?? c.id).join(', ')
                        : (a.chromebooks ?? []).join(', ')

                    const nomeUsuario =
                      a.expand?.usuario?.name ||
                      a.expand?.usuario?.email ||
                      'Usuário sem nome'

                    const turmaCompleta = a.turma
                      ? `${a.turma}${a.classe ? ` ${a.classe}` : ''}`
                      : 'Sem turma'

                    const totalReservados = chromes.length || (a.chromebooks?.length ?? 0)
                    const totalDevolvidos =
                      devolvidos.length || (a.chromebooks_devolvidos?.length ?? 0)
                    const totalPendentes = Math.max(totalReservados - totalDevolvidos, 0)

                    const statusEntrega = a.status_entrega || 'pendente'

                    return (
                      <div
                        key={a.id}
                        className="bg-white shadow rounded-xl p-5 flex justify-between items-start gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-500 mb-1">
                            👤 {nomeUsuario}
                          </p>

                          <p className="font-semibold text-gray-900 text-2xl">
                            💻 {totalReservados} Chromebook(s)
                          </p>

                          <p className="text-sm text-gray-700 mt-1 break-words">
                            {listaCodigos}
                          </p>

                          <p className="text-sm text-gray-600 mt-2">
                            🎓 {turmaCompleta}
                          </p>

                          {a.observacoes && (
                            <p className="text-sm text-gray-600 mt-1 break-words">
                              📝 {a.observacoes}
                            </p>
                          )}

                          <p className="text-sm text-gray-600 mt-2">
                            ⏰ {minutosParaHora(a.inicio)} – {minutosParaHora(a.fim)}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2 text-sm">
                            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                              Reservados: {totalReservados}
                            </span>

                            <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 font-medium">
                              Devolvidos: {totalDevolvidos}
                            </span>

                            <span className="px-3 py-1 rounded-full bg-orange-50 text-orange-700 font-medium">
                              Pendentes: {totalPendentes}
                            </span>
                          </div>

                          <p className="text-sm mt-3">
                            Status entrega:{' '}
                            <span
                              className={
                                statusEntrega === 'devolvido'
                                  ? 'text-green-700 font-medium'
                                  : statusEntrega === 'em_uso'
                                    ? 'text-orange-600 font-medium'
                                    : statusEntrega === 'atrasado'
                                      ? 'text-red-600 font-medium'
                                      : 'text-gray-500 font-medium'
                              }
                            >
                              {statusEntrega}
                            </span>
                          </p>
                        </div>

                        <div className="flex flex-col md:flex-row items-end md:items-center gap-2">
                          <button
                            onClick={() => editar(a.id)}
                            className="text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => marcarRetirado(a.id)}
                            className="text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-lg transition"
                          >
                            Retirado
                          </button>

                          <button
                            onClick={() => irParaDevolucao(a.id)}
                            className="text-green-600 hover:bg-green-50 px-4 py-2 rounded-lg transition"
                          >
                            Devolução
                          </button>

                          <button
                            onClick={() => cancelar(a.id)}
                            className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}