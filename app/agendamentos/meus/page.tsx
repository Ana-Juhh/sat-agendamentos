'use client'

import { useEffect, useMemo, useState } from 'react'
import { pb } from '@/lib/pocketbase'
import HeaderDashboard from '@/components/HeaderDashboard'
import { AG_COLLECTION } from '@/lib/agendamentoConfig'
import { useRouter } from 'next/navigation'

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

export default function MeusAgendamentos() {
  const router = useRouter()

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [carregando, setCarregando] = useState(true)

  const [authReady, setAuthReady] = useState(false)
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [role, setRole] = useState<'admin' | 'professor' | null>(null)

  useEffect(() => {
    const model: any = pb.authStore.model
    setUsuarioId(model?.id ?? null)
    setRole((model?.role as any) ?? null)
    setAuthReady(true)
  }, [])

  async function carregar() {
  try {
    setCarregando(true)

    if (!pb.authStore.isValid || !usuarioId) {
      setAgendamentos([])
      return
    }

    const filter =
      role === 'admin'
        ? `status = "ativo"`
        : `usuario = "${usuarioId}" && status = "ativo"`

    console.log('AG_COLLECTION:', AG_COLLECTION)
    console.log('FILTER:', filter)

    const dados = await pb.collection(AG_COLLECTION).getFullList<Agendamento>({
      filter,
      sort: 'data,inicio',
      expand: 'chromebooks,usuario',
    })

    console.log('DADOS:', dados)
    setAgendamentos(dados)
  } catch (e: any) {
    console.error('ERRO COMPLETO:', e)
    console.error('STATUS:', e?.status)
    console.error('DATA:', e?.data)
    console.error('MESSAGE:', e?.message)
    alert(e?.data?.message || e?.message || 'Erro ao carregar agendamentos')
  } finally {
    setCarregando(false)
  }
}

  useEffect(() => {
    if (!authReady) return
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, usuarioId, role])

  const agendamentosPorData = useMemo(() => {
    return agendamentos.reduce((acc: Record<string, Agendamento[]>, ag) => {
      const chave = normalizarDataISO(ag.data)
      acc[chave] = acc[chave] || []
      acc[chave].push(ag)
      return acc
    }, {})
  }, [agendamentos])

  async function cancelarAgendamento(id: string) {
    if (!confirm('Cancelar este agendamento?')) return

    try {
      await pb.collection(AG_COLLECTION).update(id, { status: 'cancelado' })
      setAgendamentos((prev) => prev.filter((a) => a.id !== id))
    } catch (e) {
      console.error(e)
      alert('Erro ao cancelar. Veja o console (F12).')
    }
  }

  async function marcarRetirado(id: string) {
    try {
      await pb.collection(AG_COLLECTION).update(id, { status_entrega: 'em_uso' })

      setAgendamentos((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status_entrega: 'em_uso' } : a
        )
      )
    } catch (e) {
      console.error(e)
      alert('Erro ao marcar como retirado.')
    }
  }

  async function marcarDevolvido(id: string) {
    try {
      await pb.collection(AG_COLLECTION).update(id, { status_entrega: 'devolvido' })

      setAgendamentos((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status_entrega: 'devolvido' } : a
        )
      )
    } catch (e) {
      console.error(e)
      alert('Erro ao marcar como devolvido.')
    }
  }

  function editarAgendamento(id: string) {
    router.push(`/admin/agendamentos/${id}`)
  }

  function irParaDevolucao(id: string) {
    router.push(`/admin/agendamentos/${id}/devolucao`)
  }

  return (
    <>
      <HeaderDashboard />

      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-8 text-center">
          {!authReady
            ? 'Carregando...'
            : role === 'admin'
              ? 'Agendamentos (Admin)'
              : 'Meus Agendamentos'}
        </h1>

        {carregando ? (
          <div className="text-center py-20 text-gray-500">Carregando...</div>
        ) : agendamentos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <p className="text-6xl mb-4">📅</p>
            <p className="text-gray-500 text-lg">Nenhum agendamento ativo encontrado</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(agendamentosPorData).map(([dataISO, itens]) => (
              <div key={dataISO} className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold mb-4 text-gray-700">
                  📅 {formatarDataBR(dataISO)}
                </h2>

                <div className="space-y-3">
                  {itens.map((a) => {
                    const chromes = a.expand?.chromebooks ?? []
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

                    const statusEntrega = a.status_entrega || 'pendente'

                    return (
                      <div
                        key={a.id}
                        className="flex justify-between items-start gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-300 transition"
                      >
                        <div className="min-w-0 flex-1">
                          {role === 'admin' && (
                            <p className="text-xs text-gray-500 mb-1 truncate">
                              👤 {nomeUsuario}
                            </p>
                          )}

                          <p className="font-semibold text-gray-900">
                            💻 {chromes.length || (a.chromebooks?.length ?? 0)} Chromebook(s)
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

                          <p className="text-sm mt-2">
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

                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {role === 'admin' && (
                            <>
                              <button
                                onClick={() => editarAgendamento(a.id)}
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
                            </>
                          )}

                          <button
                            onClick={() => cancelarAgendamento(a.id)}
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
      </main>
    </>
  )
}