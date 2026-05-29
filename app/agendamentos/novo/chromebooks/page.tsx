'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import HeaderDashboard from '@/components/HeaderDashboard'
import { pb } from '@/lib/pocketbase'
import { AG_COLLECTION } from '@/lib/agendamentoConfig'
import BackButton from '@/components/BackButton'

type TipoRecorrencia = 'unico' | 'dias_seguidos' | 'semanal'

type Chromebook = {
  id: string
  codigo: string
  status?: string
}

type ReservaChromebook = {
  id?: string
  data?: string
  inicio?: number
  fim?: number
  chromebooks?: string[]
  grupo_agendamento?: string
  expand?: {
    chromebooks?: Chromebook[]
  }
}

type AuthUser = {
  id?: string
  collectionName?: string
}

const TURMAS_CONFIG: Record<string, string[]> = {
  'Uso Próprio': [],
  '1º ano': ['A', 'B', 'C', 'D'],
  '2º ano': ['A', 'B', 'C'],
  '3º ano': ['A', 'B', 'C'],
  '4º ano': ['A', 'B', 'C'],
  '5º ano': ['A', 'B'],
  '6º ano': ['A', 'B'],
  '7º ano': ['A', 'B'],
  '8º ano': ['A', 'B'],
  '9º ano': ['A', 'B'],
  '1ª série': ['A', 'B'],
  '2ª série': ['A', 'B'],
  '3ª série': ['A', 'B'],
  'Bilíngue': [],
}

const DIAS_SEMANA_OPCOES = [
  { valor: 1, label: 'Segunda' },
  { valor: 2, label: 'Terça' },
  { valor: 3, label: 'Quarta' },
  { valor: 4, label: 'Quinta' },
  { valor: 5, label: 'Sexta' },
]

function horaParaMinutos(hora: string) {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

function minutosAte(data: string, hora: string) {
  if (!data || !hora) return Number.POSITIVE_INFINITY

  const [h, m] = hora.split(':').map(Number)

  const alvo = new Date(
    `${data}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
  )

  const agora = new Date()

  return Math.floor((alvo.getTime() - agora.getTime()) / 60000)
}

function normalizarDataISO(valor: string) {
  if (!valor) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor
  return valor.slice(0, 10)
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

function formatarDataBR(dataISO: string) {
  const iso = normalizarDataISO(dataISO)

  if (!iso) return 'Data não informada'

  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

function minutosParaHora(minutos: number) {
  const h = Math.floor(Number(minutos || 0) / 60)
  const m = Number(minutos || 0) % 60

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function gerarDatasEntre(inicioISO: string, fimISO: string) {
  if (!inicioISO || !fimISO) return []

  const datas: string[] = []
  const atual = criarDataLocal(inicioISO)
  const fim = criarDataLocal(fimISO)

  while (atual <= fim) {
    datas.push(formatarDataISO(atual))
    atual.setDate(atual.getDate() + 1)
  }

  return datas
}

function gerarDatasPorDiasDaSemana(
  inicioISO: string,
  fimISO: string,
  diasSemana: number[]
) {
  if (!inicioISO || !fimISO || diasSemana.length === 0) return []

  const datas: string[] = []
  const atual = criarDataLocal(inicioISO)
  const fim = criarDataLocal(fimISO)
  const diasPermitidos = new Set(diasSemana)

  while (atual <= fim) {
    if (diasPermitidos.has(atual.getDay())) {
      datas.push(formatarDataISO(atual))
    }

    atual.setDate(atual.getDate() + 1)
  }

  return datas
}

function nomesDiasSelecionados(diasSemana: number[]) {
  if (diasSemana.length === 0) return ''

  const nomes = diasSemana
    .map((dia) => DIAS_SEMANA_OPCOES.find((opcao) => opcao.valor === dia)?.label)
    .filter(Boolean)

  return nomes.join(', ')
}

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function gerarGrupoAgendamento() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `grupo_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export default function NovoAgendamentoChromebooks() {
  const router = useRouter()

  const [chromebooks, setChromebooks] = useState<Chromebook[]>([])
  const [carregandoChromes, setCarregandoChromes] = useState(true)

  const [chromebookIds, setChromebookIds] = useState<string[]>([])
  const [ocupadosNoHorario, setOcupadosNoHorario] = useState<string[]>([])

  const [data, setData] = useState('')
  const [tipoRecorrencia, setTipoRecorrencia] =
    useState<TipoRecorrencia>('unico')
  const [dataFim, setDataFim] = useState('')
  const [diasSemanaSelecionados, setDiasSemanaSelecionados] = useState<number[]>(
    []
  )

  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')

  const [turma, setTurma] = useState('')
  const [classe, setClasse] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const [loading, setLoading] = useState(false)
  const [verificandoDisponibilidade, setVerificandoDisponibilidade] =
    useState(false)

  useEffect(() => {
    if (!pb.authStore.isValid) {
      router.push('/login')
      return
    }

    async function carregarChromebooks() {
      try {
        setCarregandoChromes(true)

        const lista = await pb.collection('chromebooks').getFullList<Chromebook>({
          filter: 'tipo = "agendamento"',
          sort: 'codigo',
        })

        setChromebooks(lista)
      } catch (e) {
        console.error(e)
        alert('Erro ao carregar chromebooks')
      } finally {
        setCarregandoChromes(false)
      }
    }

    void carregarChromebooks()
  }, [router])

  const dataInicioISO = normalizarDataISO(data)

  const dataFinalISO = useMemo(() => {
    if (tipoRecorrencia === 'unico') return dataInicioISO
    return normalizarDataISO(dataFim)
  }, [tipoRecorrencia, dataFim, dataInicioISO])

  const datasDoAgendamento = useMemo(() => {
    if (!dataInicioISO) return []

    if (tipoRecorrencia === 'unico') {
      return [dataInicioISO]
    }

    if (!dataFinalISO) return []

    if (dataFinalISO < dataInicioISO) return []

    if (tipoRecorrencia === 'dias_seguidos') {
      return gerarDatasEntre(dataInicioISO, dataFinalISO)
    }

    return gerarDatasPorDiasDaSemana(
      dataInicioISO,
      dataFinalISO,
      diasSemanaSelecionados
    )
  }, [tipoRecorrencia, dataInicioISO, dataFinalISO, diasSemanaSelecionados])

  const selecionados = useMemo(() => {
    const map = new Map(chromebooks.map((c) => [c.id, c]))
    return chromebookIds.map((id) => map.get(id)).filter(Boolean) as Chromebook[]
  }, [chromebooks, chromebookIds])

  const limite = useMemo(() => {
    const faltam = minutosAte(data, inicio)
    return faltam < 60 ? 5 : 999
  }, [data, inicio])

  const opcoesClasse = turma ? TURMAS_CONFIG[turma] || [] : []
  const classeObrigatoria = opcoesClasse.length > 0

  function chromeOcupadoNoHorario(c: Chromebook) {
    return ocupadosNoHorario.includes(c.id)
  }

  function chromeDisponivel(c: Chromebook) {
    const statusOk = (c.status || 'disponivel') === 'disponivel'
    const livreNoHorario = !chromeOcupadoNoHorario(c)

    return statusOk && livreNoHorario
  }

  function handleTurmaChange(value: string) {
    setTurma(value)
    setClasse('')
  }

  function toggleDiaSemana(valor: number) {
    setDiasSemanaSelecionados((prev) => {
      if (prev.includes(valor)) {
        return prev.filter((item) => item !== valor)
      }

      return [...prev, valor].sort()
    })
  }

  function toggleChromebook(id: string) {
    const chrome = chromebooks.find((c) => c.id === id)

    if (!chrome) return
    if (verificandoDisponibilidade) return
    if (!chromeDisponivel(chrome)) return

    setChromebookIds((prev) => {
      const existe = prev.includes(id)

      if (existe) {
        return prev.filter((x) => x !== id)
      }

      if (prev.length >= limite) {
        alert(`Nesse horário você pode selecionar no máximo ${limite} chromebooks.`)
        return prev
      }

      return [...prev, id]
    })
  }

  async function buscarReservasOcupadasNoPeriodo(params: {
    datasSelecionadas: string[]
    inicioMin: number
    fimMin: number
  }) {
    const { datasSelecionadas, inicioMin, fimMin } = params

    const datasValidas = datasSelecionadas
      .map(normalizarDataISO)
      .filter(Boolean)

    if (datasValidas.length === 0) return []

    const dataInicio = datasValidas[0]
    const dataFimReserva = datasValidas[datasValidas.length - 1]
    const fimExclusivo = somarDias(dataFimReserva, 1)

    const reservas = await pb.collection(AG_COLLECTION).getFullList<ReservaChromebook>({
      filter:
        `status = "ativo" && ` +
        `status_entrega != "devolvido" && ` +
        `data >= "${dataInicio}" && ` +
        `data < "${fimExclusivo}" && ` +
        `inicio < ${fimMin} && fim > ${inicioMin}`,
      expand: 'chromebooks',
      sort: '+data,+inicio',
      requestKey: null,
    })

    const datasPermitidas = new Set(datasValidas)

    return reservas.filter((reserva) => {
      const dataReserva = normalizarDataISO(reserva.data || '')
      return datasPermitidas.has(dataReserva)
    })
  }

  function extrairIdsChromebooksReserva(reserva: ReservaChromebook) {
    const idsExpand = reserva.expand?.chromebooks?.map((c) => c.id) ?? []
    const idsRaw = reserva.chromebooks ?? []

    return idsExpand.length ? idsExpand : idsRaw
  }

  async function criarEventoGoogleAgenda(params: {
    titulo: string
    descricao: string
    data: string
    inicioMin: number
    fimMin: number
  }) {
    try {
      const token = pb.authStore.token

      if (!token) {
        console.warn('Sem token do PocketBase para criar evento no Google Agenda.')
        return
      }

      const inicioHora = minutosParaHora(params.inicioMin)
      const fimHora = minutosParaHora(params.fimMin)

      const resposta = await fetch('/api/google/calendar/create-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          summary: params.titulo,
          description: params.descricao,
          startDateTime: `${params.data}T${inicioHora}:00`,
          endDateTime: `${params.data}T${fimHora}:00`,
          timeZone: 'America/Sao_Paulo',
        }),
      })

      const dados = await resposta.json().catch(() => null)

      if (!resposta.ok) {
        console.error('Erro ao criar evento no Google Agenda:', dados)
        return
      }

      console.log('Evento criado no Google Agenda:', dados)
    } catch (error) {
      console.error('Erro inesperado ao criar evento no Google Agenda:', error)
    }
  }

  useEffect(() => {
    setChromebookIds((prev) => {
      return prev.filter((id) => !ocupadosNoHorario.includes(id))
    })
  }, [ocupadosNoHorario])

  useEffect(() => {
    if (!data || !inicio || !fim) {
      setOcupadosNoHorario([])
      return
    }

    if (tipoRecorrencia !== 'unico' && !dataFim) {
      setOcupadosNoHorario([])
      return
    }

    if (tipoRecorrencia === 'semanal' && diasSemanaSelecionados.length === 0) {
      setOcupadosNoHorario([])
      return
    }

    const inicioMin = horaParaMinutos(inicio)
    const fimMin = horaParaMinutos(fim)

    if (!Number.isFinite(inicioMin) || !Number.isFinite(fimMin) || fimMin <= inicioMin) {
      setOcupadosNoHorario([])
      return
    }

    if (datasDoAgendamento.length === 0) {
      setOcupadosNoHorario([])
      return
    }

    let ativo = true

    async function buscarIdsOcupadosNoPeriodo(
      datasSelecionadas: string[],
      inicioMin: number,
      fimMin: number
    ) {
      const reservas = await buscarReservasOcupadasNoPeriodo({
        datasSelecionadas,
        inicioMin,
        fimMin,
      })

      return Array.from(
        new Set(
          reservas.flatMap((reserva) => {
            return extrairIdsChromebooksReserva(reserva)
          })
        )
      )
    }

    async function verificarDisponibilidade() {
      try {
        setVerificandoDisponibilidade(true)

        const ids = await buscarIdsOcupadosNoPeriodo(
          datasDoAgendamento,
          inicioMin,
          fimMin
        )

        if (ativo) {
          setOcupadosNoHorario(ids)
        }
      } catch (e) {
        console.error('Erro ao verificar disponibilidade:', e)

        if (ativo) {
          setOcupadosNoHorario([])
        }
      } finally {
        if (ativo) {
          setVerificandoDisponibilidade(false)
        }
      }
    }

    void verificarDisponibilidade()

    return () => {
      ativo = false
    }
  }, [
    data,
    dataFim,
    tipoRecorrencia,
    diasSemanaSelecionados,
    inicio,
    fim,
    datasDoAgendamento,
  ])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (chromebookIds.length === 0) {
      alert('Selecione pelo menos 1 Chromebook')
      return
    }

    if (!data || !inicio || !fim) {
      alert('Preencha data, início e fim')
      return
    }

    if (tipoRecorrencia !== 'unico' && !dataFim) {
      alert('Informe até quando o agendamento deve se repetir.')
      return
    }

    if (tipoRecorrencia === 'semanal' && diasSemanaSelecionados.length === 0) {
      alert('Selecione pelo menos um dia da semana.')
      return
    }

    if (!dataInicioISO || !dataFinalISO) {
      alert('Datas inválidas.')
      return
    }

    if (dataFinalISO < dataInicioISO) {
      alert('A data final não pode ser anterior à data inicial.')
      return
    }

    if (datasDoAgendamento.length === 0) {
      alert('Nenhuma data válida encontrada para o agendamento.')
      return
    }

    if (datasDoAgendamento.length > 60) {
      alert('Para evitar erro, limite o agendamento a no máximo 60 datas por vez.')
      return
    }

    if (!turma) {
      alert('Selecione a turma')
      return
    }

    if (classeObrigatoria && !classe) {
      alert('Selecione a classe')
      return
    }

    const authModel = pb.authStore.model as AuthUser | null
    const usuarioId = authModel?.id
    const collectionName = authModel?.collectionName

    if (!usuarioId || collectionName !== 'users') {
      alert('Usuário não autenticado corretamente (faça login como users).')
      return
    }

    const inicioMin = horaParaMinutos(inicio)
    const fimMin = horaParaMinutos(fim)

    if (!Number.isFinite(inicioMin) || !Number.isFinite(fimMin)) {
      alert('Horários inválidos')
      return
    }

    if (fimMin <= inicioMin) {
      alert('Horário final deve ser maior que o inicial')
      return
    }

    if (chromebookIds.length > limite) {
      alert(`Nesse horário você pode agendar no máximo ${limite} chromebooks.`)
      return
    }

    setLoading(true)

    try {
      const reservasOcupadas = await buscarReservasOcupadasNoPeriodo({
        datasSelecionadas: datasDoAgendamento,
        inicioMin,
        fimMin,
      })

      const conflitos = reservasOcupadas.flatMap((reserva) => {
        const idsReserva = extrairIdsChromebooksReserva(reserva)
        const dataReserva = normalizarDataISO(reserva.data || '')

        return chromebookIds
          .filter((id) => idsReserva.includes(id))
          .map((id) => {
            const chrome = chromebooks.find((c) => c.id === id)

            return {
              id,
              codigo: chrome?.codigo || id,
              data: dataReserva,
            }
          })
      })

      if (conflitos.length > 0) {
        const idsOcupadosAtualizados = Array.from(
          new Set(conflitos.map((item) => item.id))
        )

        setOcupadosNoHorario(idsOcupadosAtualizados)

        const mensagem = conflitos
          .slice(0, 10)
          .map((item) => `${item.codigo} em ${formatarDataBR(item.data)}`)
          .join(', ')

        alert(
          `Alguns Chromebooks já estão reservados nesse período: ${mensagem}${
            conflitos.length > 10 ? '...' : ''
          }.`
        )

        return
      }

      await esperar(350)

      const reservasConfirmadas = await buscarReservasOcupadasNoPeriodo({
        datasSelecionadas: datasDoAgendamento,
        inicioMin,
        fimMin,
      })

      const conflitosConfirmados = reservasConfirmadas.flatMap((reserva) => {
        const idsReserva = extrairIdsChromebooksReserva(reserva)
        const dataReserva = normalizarDataISO(reserva.data || '')

        return chromebookIds
          .filter((id) => idsReserva.includes(id))
          .map((id) => {
            const chrome = chromebooks.find((c) => c.id === id)

            return {
              id,
              codigo: chrome?.codigo || id,
              data: dataReserva,
            }
          })
      })

      if (conflitosConfirmados.length > 0) {
        const idsOcupadosConfirmados = Array.from(
          new Set(conflitosConfirmados.map((item) => item.id))
        )

        setOcupadosNoHorario(idsOcupadosConfirmados)

        const mensagem = conflitosConfirmados
          .slice(0, 10)
          .map((item) => `${item.codigo} em ${formatarDataBR(item.data)}`)
          .join(', ')

        alert(
          `Alguns Chromebooks foram reservados nesse período enquanto você preenchia: ${mensagem}${
            conflitosConfirmados.length > 10 ? '...' : ''
          }.`
        )

        return
      }

      const grupoAgendamento =
        datasDoAgendamento.length > 1 ? gerarGrupoAgendamento() : ''

      const codigosSelecionados = selecionados
        .map((item) => item.codigo || item.id)
        .join(', ')

      const turmaClasse = `${turma}${classe ? ` ${classe}` : ''}`

      for (const dataAgendamento of datasDoAgendamento) {
        await pb.collection(AG_COLLECTION).create({
          usuario: String(usuarioId),
          data: dataAgendamento,
          inicio: Number(inicioMin),
          fim: Number(fimMin),
          chromebooks: chromebookIds,
          turma,
          classe: classeObrigatoria ? classe : '',
          observacoes: observacoes.trim(),
          status: 'ativo',
          status_entrega: 'pendente',
          grupo_agendamento: grupoAgendamento,
        })

        await criarEventoGoogleAgenda({
          titulo: `Agendamento de Chromebooks - ${turmaClasse}`,
          descricao: [
            `Turma: ${turmaClasse}`,
            `Chromebooks: ${codigosSelecionados}`,
            `Data: ${formatarDataBR(dataAgendamento)}`,
            `Horário: ${minutosParaHora(inicioMin)} às ${minutosParaHora(fimMin)}`,
            observacoes.trim() ? `Observações: ${observacoes.trim()}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
          data: dataAgendamento,
          inicioMin,
          fimMin,
        })
      }

      router.push('/agendamentos/meus')
    } catch (err: unknown) {
      const erro = err as { data?: { message?: string }; message?: string }

      console.error(err)

      alert(
        erro?.data?.message ||
          erro?.message ||
          JSON.stringify(erro?.data) ||
          'Erro ao salvar'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <HeaderDashboard />

      <div className="max-w-3xl mx-auto py-16 px-4">
        <BackButton href="/agendamentos/novo" />

        <h1 className="text-3xl font-bold mb-10 text-center">
          Novo agendamento
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-md rounded-2xl p-8 space-y-6"
        >
          <div className="text-sm text-gray-600">
            {Number.isFinite(minutosAte(data, inicio)) ? (
              <>
                Limite atual:{' '}
                <b>{limite === 999 ? 'sem limite' : limite}</b> chromebooks{' '}
                {limite === 5 ? '(faltando menos de 1h)' : '(com 1h ou mais)'}
              </>
            ) : (
              <>Escolha data e horário de início para calcular o limite.</>
            )}
          </div>

          <div>
            <label className="block font-medium mb-2">Data inicial</label>

            <input
              type="date"
              className="w-full border rounded-lg px-4 py-2"
              value={data}
              onChange={(e) => {
                setData(e.target.value)

                if (tipoRecorrencia === 'unico') {
                  setDataFim('')
                }
              }}
              required
            />
          </div>

          <div>
            <label className="block font-medium mb-2">Tipo de agendamento</label>

            <select
              className="w-full border rounded-lg px-4 py-2 bg-white"
              value={tipoRecorrencia}
              onChange={(e) => {
                const novoTipo = e.target.value as TipoRecorrencia

                setTipoRecorrencia(novoTipo)

                if (novoTipo === 'unico') {
                  setDataFim('')
                  setDiasSemanaSelecionados([])
                } else if (data && !dataFim) {
                  setDataFim(data)
                }
              }}
            >
              <option value="unico">Apenas uma data</option>
              <option value="dias_seguidos">Dias seguidos</option>
              <option value="semanal">Semanal</option>
            </select>
          </div>

          {tipoRecorrencia === 'semanal' ? (
            <div>
              <label className="block font-medium mb-2">
                Repetir nos dias
              </label>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {DIAS_SEMANA_OPCOES.map((dia) => {
                  const marcado = diasSemanaSelecionados.includes(dia.valor)

                  return (
                    <label
                      key={dia.valor}
                      className={`border rounded-lg px-3 py-2 cursor-pointer text-sm ${
                        marcado
                          ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={marcado}
                        onChange={() => toggleDiaSemana(dia.valor)}
                      />

                      {dia.label}
                    </label>
                  )
                })}
              </div>

              {diasSemanaSelecionados.length > 0 ? (
                <p className="text-sm text-gray-500 mt-2">
                  Repetindo em:{' '}
                  <strong>{nomesDiasSelecionados(diasSemanaSelecionados)}</strong>
                </p>
              ) : (
                <p className="text-sm text-gray-500 mt-2">
                  Selecione um ou mais dias da semana.
                </p>
              )}
            </div>
          ) : null}

          {tipoRecorrencia !== 'unico' ? (
            <div>
              <label className="block font-medium mb-2">
                {tipoRecorrencia === 'semanal'
                  ? 'Repetir até'
                  : 'Até quando?'}
              </label>

              <input
                type="date"
                className="w-full border rounded-lg px-4 py-2"
                value={dataFim}
                min={data || undefined}
                onChange={(e) => setDataFim(e.target.value)}
                required={true}
              />

              {datasDoAgendamento.length > 0 ? (
                <div className="text-sm text-gray-500 mt-2">
                  Serão criados <strong>{datasDoAgendamento.length}</strong>{' '}
                  agendamento(s).

                  <div className="mt-2 flex flex-wrap gap-2">
                    {datasDoAgendamento.slice(0, 12).map((dataItem) => (
                      <span
                        key={dataItem}
                        className="rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold"
                      >
                        {formatarDataBR(dataItem)}
                      </span>
                    ))}

                    {datasDoAgendamento.length > 12 ? (
                      <span className="rounded-full bg-gray-100 text-gray-600 px-3 py-1 text-xs font-semibold">
                        +{datasDoAgendamento.length - 12} datas
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

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

          <div>
            <label className="block font-medium mb-4">
              Escolha os Chromebooks ({chromebookIds.length}
              {limite !== 999 ? ` / ${limite}` : ''})
            </label>

            {verificandoDisponibilidade ? (
              <div className="text-sm text-gray-500 mb-3">
                Verificando disponibilidade no período selecionado...
              </div>
            ) : null}

            {carregandoChromes ? (
              <div className="text-gray-500">Carregando chromebooks...</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {chromebooks.map((c) => {
                  const ativo = chromebookIds.includes(c.id)
                  const disponivel = chromeDisponivel(c)
                  const ocupadoNoHorario = chromeOcupadoNoHorario(c)

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleChromebook(c.id)}
                      disabled={!disponivel || verificandoDisponibilidade}
                      className={`border rounded-xl p-4 text-left transition shadow-sm ${
                        ativo
                          ? 'border-blue-500 bg-blue-50'
                          : disponivel
                            ? 'hover:border-gray-400'
                            : 'opacity-55 bg-gray-100 border-gray-200 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">💻</span>

                        <div className="min-w-0">
                          <p className="font-semibold text-base truncate">
                            {c.codigo || 'Sem código'}
                          </p>

                          <p
                            className={`text-xs ${
                              !disponivel
                                ? 'text-red-600 font-medium'
                                : 'text-gray-600'
                            }`}
                          >
                            {ocupadoNoHorario
                              ? tipoRecorrencia !== 'unico'
                                ? 'ocupado em uma das datas'
                                : 'ocupado nesse horário'
                              : c.status || 'disponivel'}
                          </p>

                          {ativo ? (
                            <p className="text-xs font-semibold text-blue-600 mt-1">
                              Selecionado
                            </p>
                          ) : null}

                          {!disponivel ? (
                            <p className="text-xs font-semibold text-red-600 mt-1">
                              {ocupadoNoHorario
                                ? tipoRecorrencia !== 'unico'
                                  ? 'Já reservado em alguma data'
                                  : 'Já reservado nesse horário'
                                : 'Bloqueado para agendamento'}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {selecionados.length > 0 ? (
              <div className="mt-3 text-sm text-gray-700">
                Selecionados:{' '}
                <b>{selecionados.map((s) => s.codigo).join(', ')}</b>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-2">Turma / Série</label>

              <select
                className="w-full border rounded-lg px-4 py-2 bg-white"
                value={turma}
                onChange={(e) => handleTurmaChange(e.target.value)}
                required
              >
                <option value="">Selecione a turma</option>

                {Object.keys(TURMAS_CONFIG).map((nomeTurma) => (
                  <option key={nomeTurma} value={nomeTurma}>
                    {nomeTurma}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium mb-2">Classe</label>

              <select
                className="w-full border rounded-lg px-4 py-2 bg-white"
                value={classe}
                onChange={(e) => setClasse(e.target.value)}
                disabled={!turma || opcoesClasse.length === 0}
                required={classeObrigatoria}
              >
                <option value="">
                  {!turma
                    ? 'Escolha a turma primeiro'
                    : opcoesClasse.length === 0
                      ? 'Não precisa selecionar classe'
                      : 'Selecione a classe'}
                </option>

                {opcoesClasse.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium mb-2">Observações</label>

            <textarea
              className="w-full border rounded-lg px-4 py-3 min-h-[110px]"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Escreva aqui alguma observação importante sobre o agendamento..."
            />
          </div>

          <button
            type="submit"
            disabled={loading || verificandoDisponibilidade || carregandoChromes}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {loading
              ? 'Salvando...'
              : verificandoDisponibilidade
                ? 'Verificando disponibilidade...'
                : tipoRecorrencia !== 'unico' && datasDoAgendamento.length > 1
                  ? `Salvar ${datasDoAgendamento.length} agendamentos`
                  : 'Salvar agendamento'}
          </button>
        </form>
      </div>
    </>
  )
}