'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { pb } from '@/lib/pocketbase'
import HeaderDashboard from '@/components/HeaderDashboard'
import { AG_COLLECTION } from '@/lib/agendamentoConfig'
import { ESPACOS_COLLECTION } from '@/lib/espacoConfig'
import { canViewAllAgendamentos } from '@/lib/roles'
import BackButton from '@/components/BackButton'

type StatusEntrega = 'pendente' | 'em_uso' | 'devolvido' | 'atrasado'

type Chromebook = {
  id: string
  codigo?: string
  status?: string
}

type User = {
  id: string
  name?: string
  nome?: string
  email?: string
  role?: string
}

type BaseAgendamento = {
  id: string
  usuario: string
  chromebooks?: string[]
  data: string
  inicio: number
  fim: number
  status: 'ativo' | 'cancelado'
  status_entrega?: StatusEntrega
  turma?: string
  classe?: string
  observacoes?: string
  tipo?: 'chromebooks' | 'lab' | 'maker' | 'carrinhos'
  carrinho?: string
  grupo_agendamento?: string
  expand?: {
    chromebooks?: Chromebook[]
    usuario?: User
  }
}

type Agendamento = BaseAgendamento & {
  origem: typeof AG_COLLECTION | typeof ESPACOS_COLLECTION
}

type GrupoAgendamento = {
  chave: string
  origem: Agendamento['origem']
  itens: Agendamento[]
  principal: Agendamento
  isChromebooks: boolean
  dataInicio: string
  dataFim: string
}

function hojeISO() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')

  return `${ano}-${mes}-${dia}`
}

function criarDataLocal(dataISO: string) {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

function formatarDataISO(data: Date) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')

  return `${ano}-${mes}-${dia}`
}

function somarDias(dataISO: string, dias: number) {
  const data = criarDataLocal(dataISO)
  data.setDate(data.getDate() + dias)
  return formatarDataISO(data)
}

function minutosAgora() {
  const agora = new Date()
  return agora.getHours() * 60 + agora.getMinutes()
}

function minutosParaHora(minutos: number) {
  const h = Math.floor(Number(minutos || 0) / 60)
  const m = Number(minutos || 0) % 60

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function normalizarDataISO(valor: string) {
  if (!valor) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor
  return valor.slice(0, 10)
}

function formatarDataBR(dataISO: string) {
  const iso = normalizarDataISO(dataISO)

  if (!iso) return 'Data não informada'

  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

function calcularStatusAutomatico(agendamento: Agendamento): StatusEntrega {
  if (agendamento.origem !== AG_COLLECTION) {
    return agendamento.status_entrega || 'pendente'
  }

  if (agendamento.status_entrega === 'devolvido') {
    return 'devolvido'
  }

  const dataAgendamento = normalizarDataISO(agendamento.data)
  const hoje = hojeISO()

  if (!dataAgendamento) {
    return agendamento.status_entrega || 'pendente'
  }

  if (dataAgendamento < hoje) {
    return 'atrasado'
  }

  if (dataAgendamento > hoje) {
    return 'pendente'
  }

  const agoraMin = minutosAgora()
  const inicioMin = Number(agendamento.inicio || 0)
  const fimMin = Number(agendamento.fim || 0)

  if (agoraMin >= inicioMin && agoraMin <= fimMin) {
    return 'em_uso'
  }

  if (agoraMin > fimMin) {
    return 'atrasado'
  }

  return 'pendente'
}

function statusDoGrupo(grupo: GrupoAgendamento): StatusEntrega {
  const statusDosItens = grupo.itens.map((item) => {
    return item.status_entrega || 'pendente'
  })

  if (statusDosItens.includes('atrasado')) {
    return 'atrasado'
  }

  if (statusDosItens.includes('em_uso')) {
    return 'em_uso'
  }

  if (statusDosItens.every((status) => status === 'devolvido')) {
    return 'devolvido'
  }

  return 'pendente'
}

function nomeStatusEntrega(status?: string) {
  if (status === 'em_uso') return 'Em uso'
  if (status === 'devolvido') return 'Devolvido'
  if (status === 'atrasado') return 'Atrasado'
  return 'Pendente'
}

function classeStatusEntrega(status?: string) {
  if (status === 'em_uso') return 'bg-orange-600 text-white'
  if (status === 'devolvido') return 'bg-green-600 text-white'
  if (status === 'atrasado') return 'bg-red-600 text-white'
  return 'bg-slate-600 text-white'
}

function nomeTipoAgendamento(agendamento: Agendamento, totalDias: number) {
  if (agendamento.tipo === 'lab') return 'Lab. de Ciências'
  if (agendamento.tipo === 'maker') return 'Sala Maker'
  if (agendamento.tipo === 'carrinhos') {
    return agendamento.carrinho
      ? `Carrinho de Chromebook — ${agendamento.carrinho}`
      : 'Carrinho de Chromebook'
  }

  const chromes = agendamento.expand?.chromebooks ?? []
  const quantidade = chromes.length || agendamento.chromebooks?.length || 0

  if (totalDias > 1) {
    return `${quantidade} Chromebook(s) — ${totalDias} dias`
  }

  return `${quantidade} Chromebook(s)`
}

function nomeResponsavel(agendamento: Agendamento) {
  return (
    agendamento.expand?.usuario?.name ||
    agendamento.expand?.usuario?.nome ||
    agendamento.expand?.usuario?.email ||
    'Usuário sem nome'
  )
}

function nomeTurmaClasse(agendamento: Agendamento) {
  if (!agendamento.turma) return 'Sem turma'

  if (!agendamento.classe) {
    return agendamento.turma
  }

  return `${agendamento.turma} ${agendamento.classe}`
}

function listaCodigosChromebooks(agendamento: Agendamento) {
  const chromes = agendamento.expand?.chromebooks ?? []

  if (chromes.length > 0) {
    return chromes.map((chromebook) => chromebook.codigo ?? chromebook.id).join(', ')
  }

  return (agendamento.chromebooks ?? []).join(', ')
}

function periodoGrupo(grupo: GrupoAgendamento) {
  if (grupo.dataInicio === grupo.dataFim) {
    return formatarDataBR(grupo.dataInicio)
  }

  return `${formatarDataBR(grupo.dataInicio)} até ${formatarDataBR(grupo.dataFim)}`
}

function MeusAgendamentosContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [authReady, setAuthReady] = useState(false)
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)

  const [dataInicioFiltro, setDataInicioFiltro] = useState(hojeISO())
  const [dataFimFiltro, setDataFimFiltro] = useState('')

  useEffect(() => {
    const model = pb.authStore.model as { id?: string; role?: string } | null

    setUsuarioId(model?.id ?? null)
    setRole(model?.role ?? null)
    setAuthReady(true)
  }, [])

  const podeVerTodos = canViewAllAgendamentos(role)

  async function sincronizarStatusAutomatico(lista: Agendamento[]) {
    const atualizados = await Promise.all(
      lista.map(async (agendamento) => {
        if (agendamento.origem !== AG_COLLECTION) {
          return agendamento
        }

        const statusAtual = agendamento.status_entrega || 'pendente'
        const novoStatus = calcularStatusAutomatico(agendamento)

        if (statusAtual === novoStatus) {
          return agendamento
        }

        try {
          await pb.collection(agendamento.origem).update(agendamento.id, {
            status_entrega: novoStatus,
          })

          return {
            ...agendamento,
            status_entrega: novoStatus,
          }
        } catch (e) {
          console.error('Erro ao atualizar status automático:', e)
          return agendamento
        }
      })
    )

    return atualizados
  }

  async function carregar() {
    try {
      setCarregando(true)

      if (!pb.authStore.isValid || !usuarioId) {
        setAgendamentos([])
        return
      }

      const dataInicioISO = normalizarDataISO(dataInicioFiltro)
      const dataFimISO = normalizarDataISO(dataFimFiltro)

      let filter = podeVerTodos
        ? `status = "ativo" && status_entrega != "devolvido"`
        : `usuario = "${usuarioId}" && status = "ativo" && status_entrega != "devolvido"`

      if (dataInicioISO) {
        filter += ` && data >= "${dataInicioISO}"`
      }

      if (dataFimISO) {
        const fimExclusivo = somarDias(dataFimISO, 1)
        filter += ` && data < "${fimExclusivo}"`
      }

      const temFiltroData = Boolean(dataInicioISO || dataFimISO)

      const sort = temFiltroData ? '+data,+inicio' : '-data,+inicio'

      const [chromebooks, espacos] = await Promise.all([
        pb.collection(AG_COLLECTION).getFullList<BaseAgendamento>({
          filter,
          sort,
          expand: 'chromebooks,usuario',
          requestKey: null,
        }),

        pb.collection(ESPACOS_COLLECTION).getFullList<BaseAgendamento>({
          filter,
          sort,
          expand: 'usuario',
          requestKey: null,
        }),
      ])

      const dados: Agendamento[] = [
        ...chromebooks.map((item) => ({
          ...item,
          tipo: 'chromebooks' as const,
          origem: AG_COLLECTION as typeof AG_COLLECTION,
        })),

        ...espacos.map((item) => ({
          ...item,
          origem: ESPACOS_COLLECTION as typeof ESPACOS_COLLECTION,
        })),
      ].sort((a, b) => {
        const dataA = normalizarDataISO(a.data)
        const dataB = normalizarDataISO(b.data)

        if (dataA !== dataB) {
          return temFiltroData
            ? dataA.localeCompare(dataB)
            : dataB.localeCompare(dataA)
        }

        return Number(a.inicio || 0) - Number(b.inicio || 0)
      })

      const dadosComStatusAtualizado = await sincronizarStatusAutomatico(dados)

      setAgendamentos(dadosComStatusAtualizado)
    } catch (e) {
      const erro = e as { data?: { message?: string }; message?: string }

      console.error('ERRO COMPLETO:', e)

      alert(
        erro?.data?.message ||
          erro?.message ||
          'Erro ao carregar agendamentos'
      )
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    if (!authReady) return

    void carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, usuarioId, role, dataInicioFiltro, dataFimFiltro])

  const grupos = useMemo<GrupoAgendamento[]>(() => {
    const mapa = new Map<string, Agendamento[]>()

    for (const agendamento of agendamentos) {
      const isChromebooks = agendamento.origem === AG_COLLECTION

      const chave =
        isChromebooks && agendamento.grupo_agendamento
          ? `grupo-${agendamento.grupo_agendamento}`
          : `${agendamento.origem}-${agendamento.id}`

      const lista = mapa.get(chave) ?? []
      lista.push(agendamento)
      mapa.set(chave, lista)
    }

    return Array.from(mapa.entries())
      .map(([chave, itens]) => {
        const ordenados = [...itens].sort((a, b) => {
          const dataA = normalizarDataISO(a.data)
          const dataB = normalizarDataISO(b.data)

          if (dataA !== dataB) return dataA.localeCompare(dataB)

          return Number(a.inicio || 0) - Number(b.inicio || 0)
        })

        const principal = ordenados[0]
        const dataInicio = normalizarDataISO(ordenados[0]?.data || '')
        const dataFim = normalizarDataISO(ordenados[ordenados.length - 1]?.data || '')

        return {
          chave,
          origem: principal.origem,
          itens: ordenados,
          principal,
          isChromebooks: principal.origem === AG_COLLECTION,
          dataInicio,
          dataFim,
        }
      })
      .sort((a, b) => {
        const temFiltroData = Boolean(dataInicioFiltro || dataFimFiltro)

        if (a.dataInicio !== b.dataInicio) {
          return temFiltroData
            ? a.dataInicio.localeCompare(b.dataInicio)
            : b.dataInicio.localeCompare(a.dataInicio)
        }

        return Number(a.principal.inicio || 0) - Number(b.principal.inicio || 0)
      })
  }, [agendamentos, dataInicioFiltro, dataFimFiltro])

  const gruposPorData = useMemo(() => {
    return grupos.reduce((acc: Record<string, GrupoAgendamento[]>, grupo) => {
      const chave = grupo.dataInicio

      if (!chave) return acc

      if (!acc[chave]) {
        acc[chave] = []
      }

      acc[chave].push(grupo)

      return acc
    }, {})
  }, [grupos])

  const datasOrdenadas = useMemo(() => {
    const datas = Object.keys(gruposPorData)
    const temFiltroData = Boolean(dataInicioFiltro || dataFimFiltro)

    return datas.sort((a, b) => {
      return temFiltroData ? a.localeCompare(b) : b.localeCompare(a)
    })
  }, [gruposPorData, dataInicioFiltro, dataFimFiltro])

  async function cancelarGrupo(grupo: GrupoAgendamento) {
    if (!confirm('Cancelar este agendamento?')) return

    try {
      await Promise.all(
        grupo.itens.map((item) =>
          pb.collection(item.origem).update(item.id, {
            status: 'cancelado',
          })
        )
      )

      setAgendamentos((prev) =>
        prev.filter(
          (agendamento) =>
            !grupo.itens.some(
              (item) =>
                item.id === agendamento.id && item.origem === agendamento.origem
            )
        )
      )
    } catch (e) {
      console.error(e)
      alert('Erro ao cancelar. Veja o console (F12).')
    }
  }

  function editarAgendamentoChromebooks(id: string) {
    router.push(`/admin/agendamentos/${id}`)
  }

  function irParaDevolucao(id: string) {
    const query = searchParams.toString()
    const paginaAtual = `${pathname}${query ? `?${query}` : ''}`

    router.push(
      `/admin/agendamentos/${id}/devolucao?returnTo=${encodeURIComponent(
        paginaAtual
      )}`
    )
  }

  return (
    <>
      <HeaderDashboard />

      <main className="max-w-5xl mx-auto px-4 py-10">
        <BackButton href="/dashboard" />

        <h1 className="text-3xl font-bold mb-8 text-center">
          {!authReady
            ? 'Carregando...'
            : podeVerTodos
              ? 'Todos os agendamentos'
              : 'Meus Agendamentos'}
        </h1>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
            <div>
              <label className="block font-medium mb-2">Data inicial</label>

              <input
                type="date"
                className="w-full border border-slate-300 rounded-lg px-4 py-2"
                value={dataInicioFiltro}
                onChange={(e) => setDataInicioFiltro(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-medium mb-2">Data final</label>

              <input
                type="date"
                className="w-full border border-slate-300 rounded-lg px-4 py-2"
                value={dataFimFiltro}
                onChange={(e) => setDataFimFiltro(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  setDataInicioFiltro(hojeISO())
                  setDataFimFiltro('')
                }}
                className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold"
              >
                A partir de hoje
              </button>

              <button
                type="button"
                onClick={() => {
                  setDataInicioFiltro('')
                  setDataFimFiltro('')
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 font-semibold hover:bg-slate-50 hover:border-slate-400"
              >
                Ver todos
              </button>
            </div>
          </div>
        </div>

        {carregando ? (
          <div className="text-center py-20 text-gray-500">
            Carregando...
          </div>
        ) : grupos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-200">
            <p className="text-gray-500 text-lg">
              Nenhum agendamento ativo encontrado
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {datasOrdenadas.map((dataISO) => {
              const itens = gruposPorData[dataISO] || []

              return (
                <div
                  key={dataISO}
                  className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200"
                >
                  <h2 className="text-lg font-bold mb-4 text-gray-700">
                    {formatarDataBR(dataISO)}
                  </h2>

                  <div className="space-y-3">
                    {itens.map((grupo) => {
                      const agendamento = grupo.principal
                      const totalDias = grupo.itens.length
                      const isChromebooks = grupo.isChromebooks
                      const listaCodigos = listaCodigosChromebooks(agendamento)
                      const statusEntrega = statusDoGrupo(grupo)

                      return (
                        <div
                          key={grupo.chave}
                          className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="font-bold text-gray-800">
                                {nomeTipoAgendamento(agendamento, totalDias)}
                              </h3>

                              {isChromebooks ? (
                                <span
                                  className={`text-xs font-semibold px-2 py-1 rounded-full ${classeStatusEntrega(
                                    statusEntrega
                                  )}`}
                                >
                                  {nomeStatusEntrega(statusEntrega)}
                                </span>
                              ) : (
                                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-yellow-300 text-black">
                                    Reservado
                                </span>
                              )}
                            </div>

                            <p className="text-sm text-gray-600">
                              <strong>Período:</strong> {periodoGrupo(grupo)}
                            </p>

                            <p className="text-sm text-gray-600">
                              <strong>Horário:</strong>{' '}
                              {minutosParaHora(agendamento.inicio)} às{' '}
                              {minutosParaHora(agendamento.fim)}
                            </p>

                            <p className="text-sm text-gray-600">
                              <strong>Turma:</strong>{' '}
                              {nomeTurmaClasse(agendamento)}
                            </p>

                            <p className="text-sm text-gray-600">
                              <strong>Responsável:</strong>{' '}
                              {nomeResponsavel(agendamento)}
                            </p>

                            {isChromebooks ? (
                              <p className="text-sm text-gray-600 break-words">
                                <strong>Chromebooks:</strong>{' '}
                                {listaCodigos || 'Não informado'}
                              </p>
                            ) : null}

                            {agendamento.tipo === 'carrinhos' && agendamento.carrinho ? (
                              <p className="text-sm text-gray-600">
                                <strong>Carrinho:</strong>{' '}
                                <span className="inline-block bg-lime-300 text-black text-xs font-semibold px-2 py-0.5 rounded-full ml-1">
                                  {agendamento.carrinho}
                                </span>
                              </p>
                            ) : null}

                            {agendamento.observacoes ? (
                              <p className="text-sm text-gray-500 mt-2">
                                <strong>Observações:</strong>{' '}
                                {agendamento.observacoes}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            {isChromebooks ? (
                              <button
                                type="button"
                                onClick={() => irParaDevolucao(agendamento.id)}
                                className="px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-semibold"
                              >
                                Registrar devolução
                              </button>
                            ) : null}

                            {podeVerTodos && isChromebooks ? (
                              <button
                                type="button"
                                onClick={() =>
                                  editarAgendamentoChromebooks(agendamento.id)
                                }
                                className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold hover:bg-gray-50"
                              >
                                Editar
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => cancelarGrupo(grupo)}
                              className="px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}

export default function MeusAgendamentos() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-500">
          Carregando agendamentos...
        </div>
      }
    >
      <MeusAgendamentosContent />
    </Suspense>
  );
}
