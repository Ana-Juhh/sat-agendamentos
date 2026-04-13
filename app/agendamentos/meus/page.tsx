'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { pb } from '@/lib/pocketbase'
import HeaderDashboard from '@/components/HeaderDashboard'
import { AG_COLLECTION } from '@/lib/agendamentoConfig'
import { ESPACOS_COLLECTION } from '@/lib/espacoConfig'

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

type BaseAgendamento = {
  id: string
  usuario: string
  chromebooks?: string[]
  data: string
  inicio: number
  fim: number
  status: 'ativo' | 'cancelado'
  status_entrega?: 'pendente' | 'em_uso' | 'devolvido' | 'atrasado'
  turma?: string
  classe?: string
  observacoes?: string
  tipo?: 'chromebooks' | 'lab' | 'maker'
  expand?: {
    chromebooks?: Chromebook[]
    usuario?: User
  }
}

type Agendamento = BaseAgendamento & {
  origem: typeof AG_COLLECTION | typeof ESPACOS_COLLECTION
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
    const model = pb.authStore.model as { id?: string; role?: 'admin' | 'professor' } | null
    setUsuarioId(model?.id ?? null)
    setRole(model?.role ?? null)
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

      const [chromebooks, espacos] = await Promise.all([
        pb.collection(AG_COLLECTION).getFullList<BaseAgendamento>({
          filter,
          sort: 'data,inicio',
          expand: 'chromebooks,usuario',
          requestKey: null,
        }),
        pb.collection(ESPACOS_COLLECTION).getFullList<BaseAgendamento>({
          filter,
          sort: 'data,inicio',
          expand: 'usuario',
          requestKey: null,
        }),
      ])

      const dados: Agendamento[] = [
        ...chromebooks.map((item) => ({
          ...item,
          tipo: 'chromebooks' as const,
          origem: AG_COLLECTION,
        })),
        ...espacos.map((item) => ({
          ...item,
          origem: ESPACOS_COLLECTION,
        })),
      ].sort((a, b) => {
        const chaveA = `${normalizarDataISO(a.data)}-${String(a.inicio).padStart(4, '0')}`
        const chaveB = `${normalizarDataISO(b.data)}-${String(b.inicio).padStart(4, '0')}`
        return chaveA.localeCompare(chaveB)
      })

      setAgendamentos(dados)
    } catch (e) {
      const erro = e as { data?: { message?: string }; message?: string }
      console.error('ERRO COMPLETO:', e)
      alert(erro?.data?.message || erro?.message || 'Erro ao carregar agendamentos')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    if (!authReady) return
    void carregar()
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

  async function cancelarAgendamento(id: string, origem: Agendamento['origem']) {
    if (!confirm('Cancelar este agendamento?')) return

    try {
      await pb.collection(origem).update(id, { status: 'cancelado' })
      setAgendamentos((prev) => prev.filter((a) => !(a.id === id && a.origem === origem)))
    } catch (e) {
      console.error(e)
      alert('Erro ao cancelar. Veja o console (F12).')
    }
  }

  async function marcarRetirado(id: string, origem: Agendamento['origem']) {
    try {
      await pb.collection(origem).update(id, { status_entrega: 'em_uso' })
      setAgendamentos((prev) =>
        prev.map((a) =>
          a.id === id && a.origem === origem ? { ...a, status_entrega: 'em_uso' } : a
        )
      )
    } catch (e) {
      console.error(e)
      alert('Erro ao marcar como retirado.')
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
          {!authReady ? 'Carregando...' : role === 'admin' ? 'Agendamentos (Admin)' : 'Meus Agendamentos'}
        </h1>

        {carregando ? (
          <div className="text-center py-20 text-gray-500">Carregando...</div>
        ) : agendamentos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <p className="text-gray-500 text-lg">Nenhum agendamento ativo encontrado</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(agendamentosPorData).map(([dataISO, itens]) => (
              <div key={dataISO} className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold mb-4 text-gray-700">{formatarDataBR(dataISO)}</h2>

                <div className="space-y-3">
                  {itens.map((a) => {
                    const chromes = a.expand?.chromebooks ?? []
                    const listaCodigos =
                      chromes.length > 0
                        ? chromes.map((c) => c.codigo ?? c.id).join(', ')
                        : (a.chromebooks ?? []).join(', ')

                    const nomeUsuario =
                      a.expand?.usuario?.name || a.expand?.usuario?.email || 'Usuario sem nome'

                    const turmaCompleta = a.turma
                      ? `${a.turma}${a.classe ? ` ${a.classe}` : ''}`
                      : 'Sem turma'

                    const statusEntrega = a.status_entrega || 'pendente'
                    const isChromebooks = a.origem === AG_COLLECTION
                    const titulo =
                      a.tipo === 'lab'
                        ? 'Lab. de Ciencias'
                        : a.tipo === 'maker'
                          ? 'Sala Maker'
                          : `${chromes.length || (a.chromebooks?.length ?? 0)} Chromebook(s)`

                    return (
                      <div
                        key={`${a.origem}-${a.id}`}
                        className="flex justify-between items-start gap-4 p-4 border border-gray-200 rounded-xl hover:border-blue-300 transition"
                      >
                        <div className="min-w-0 flex-1">
                          {role === 'admin' && (
                            <p className="text-xs text-gray-500 mb-1 truncate">{nomeUsuario}</p>
                          )}

                          <p className="font-semibold text-gray-900">{titulo}</p>

                          {isChromebooks && (
                            <p className="text-sm text-gray-700 mt-1 break-words">{listaCodigos}</p>
                          )}

                          <p className="text-sm text-gray-600 mt-2">{turmaCompleta}</p>

                          {a.observacoes && (
                            <p className="text-sm text-gray-600 mt-1 break-words">{a.observacoes}</p>
                          )}

                          <p className="text-sm text-gray-600 mt-2">
                            {minutosParaHora(a.inicio)} - {minutosParaHora(a.fim)}
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
                          {role === 'admin' && isChromebooks && (
                            <>
                              <button
                                onClick={() => editarAgendamento(a.id)}
                                className="text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition"
                              >
                                Editar
                              </button>

                              <button
                                onClick={() => marcarRetirado(a.id, a.origem)}
                                className="text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-lg transition"
                              >
                                Retirado
                              </button>

                              <button
                                onClick={() => irParaDevolucao(a.id)}
                                className="text-green-600 hover:bg-green-50 px-4 py-2 rounded-lg transition"
                              >
                                Devolucao
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => cancelarAgendamento(a.id, a.origem)}
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
