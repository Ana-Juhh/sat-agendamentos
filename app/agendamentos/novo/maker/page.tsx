'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import HeaderDashboard from '@/components/HeaderDashboard'
import { pb } from '@/lib/pocketbase'
import { ESPACOS_COLLECTION } from '@/lib/espacoConfig'
import BackButton from '@/components/BackButton'

type ModoAgenda = 'semana' | 'mes'

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

const HORARIOS_AULA = [
  {
    id: 'manha_1',
    periodo: 'manha',
    periodoLabel: 'Manhã',
    label: '1ª aula',
    inicioTexto: '07:30',
    fimTexto: '08:20',
    inicio: 450,
    fim: 500,
  },
  {
    id: 'manha_2',
    periodo: 'manha',
    periodoLabel: 'Manhã',
    label: '2ª aula',
    inicioTexto: '08:20',
    fimTexto: '09:10',
    inicio: 500,
    fim: 550,
  },
  {
    id: 'manha_3',
    periodo: 'manha',
    periodoLabel: 'Manhã',
    label: '3ª aula',
    inicioTexto: '09:30',
    fimTexto: '10:20',
    inicio: 570,
    fim: 620,
  },
  {
    id: 'manha_4',
    periodo: 'manha',
    periodoLabel: 'Manhã',
    label: '4ª aula',
    inicioTexto: '10:20',
    fimTexto: '11:10',
    inicio: 620,
    fim: 670,
  },
  {
    id: 'manha_5',
    periodo: 'manha',
    periodoLabel: 'Manhã',
    label: '5ª aula',
    inicioTexto: '11:10',
    fimTexto: '12:00',
    inicio: 670,
    fim: 720,
  },
  {
    id: 'manha_6',
    periodo: 'manha',
    periodoLabel: 'Manhã',
    label: '6ª aula',
    inicioTexto: '12:00',
    fimTexto: '12:50',
    inicio: 720,
    fim: 770,
  },
  {
    id: 'tarde_1',
    periodo: 'tarde',
    periodoLabel: 'Tarde',
    label: '1ª aula',
    inicioTexto: '13:10',
    fimTexto: '14:00',
    inicio: 790,
    fim: 840,
  },
  {
    id: 'tarde_2',
    periodo: 'tarde',
    periodoLabel: 'Tarde',
    label: '2ª aula',
    inicioTexto: '14:00',
    fimTexto: '14:50',
    inicio: 840,
    fim: 890,
  },
  {
    id: 'tarde_3',
    periodo: 'tarde',
    periodoLabel: 'Tarde',
    label: '3ª aula',
    inicioTexto: '14:50',
    fimTexto: '15:40',
    inicio: 890,
    fim: 940,
  },
  {
    id: 'tarde_4',
    periodo: 'tarde',
    periodoLabel: 'Tarde',
    label: '4ª aula',
    inicioTexto: '16:00',
    fimTexto: '16:50',
    inicio: 960,
    fim: 1010,
  },
  {
    id: 'tarde_5',
    periodo: 'tarde',
    periodoLabel: 'Tarde',
    label: '5ª aula',
    inicioTexto: '16:50',
    fimTexto: '17:40',
    inicio: 1010,
    fim: 1060,
  },
  {
    id: 'tarde_6',
    periodo: 'tarde',
    periodoLabel: 'Tarde',
    label: '6ª aula',
    inicioTexto: '17:40',
    fimTexto: '18:30',
    inicio: 1060,
    fim: 1110,
  },
]

function hojeISO() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')

  return `${ano}-${mes}-${dia}`
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

function obterIntervaloAgenda(dataISO: string, modo: ModoAgenda) {
  const base = criarDataLocal(dataISO)

  if (modo === 'semana') {
    const inicio = new Date(base)
    const diaSemana = inicio.getDay()
    const diferencaParaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana

    inicio.setDate(inicio.getDate() + diferencaParaSegunda)

    const fimExclusivo = new Date(inicio)
    fimExclusivo.setDate(inicio.getDate() + 7)

    return {
      inicio: formatarDataISO(inicio),
      fimExclusivo: formatarDataISO(fimExclusivo),
    }
  }

  const inicioMes = new Date(base.getFullYear(), base.getMonth(), 1)
  const fimMesExclusivo = new Date(base.getFullYear(), base.getMonth() + 1, 1)

  return {
    inicio: formatarDataISO(inicioMes),
    fimExclusivo: formatarDataISO(fimMesExclusivo),
  }
}

function formatarDataBR(dataISO: string) {
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}

function minutosParaHora(minutos: number) {
  const h = Math.floor(Number(minutos || 0) / 60)
  const m = Number(minutos || 0) % 60

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function nomeTurmaClasse(turma?: string, classe?: string) {
  if (!turma) return 'Turma não informada'
  if (!classe) return turma
  return `${turma} ${classe}`
}

function agendamentoBateNoHorario(agendamento: any, horario: any) {
  return agendamento.inicio < horario.fim && agendamento.fim > horario.inicio
}

export default function NovoAgendamentoMaker() {
  const router = useRouter()
  const formRef = useRef<HTMLDivElement | null>(null)

  const [data, setData] = useState(hojeISO())
  const [modoAgenda, setModoAgenda] = useState<ModoAgenda>('semana')
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [carregandoAgenda, setCarregandoAgenda] = useState(false)
  const [periodoFiltroAgenda, setPeriodoFiltroAgenda] = useState('')

  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  const [periodo, setPeriodo] = useState('')
  const [horarioAulaId, setHorarioAulaId] = useState('')
  const [turma, setTurma] = useState('')
  const [classe, setClasse] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [loading, setLoading] = useState(false)

  const intervaloAtual = useMemo(() => {
    return obterIntervaloAgenda(data, modoAgenda)
  }, [data, modoAgenda])

  const resumoAgenda = useMemo(() => {
    const fim = criarDataLocal(intervaloAtual.fimExclusivo)
    fim.setDate(fim.getDate() - 1)

    if (modoAgenda === 'semana') {
      return `Semana de ${formatarDataBR(intervaloAtual.inicio)} até ${formatarDataBR(
        formatarDataISO(fim)
      )}`
    }

    return `Mês de ${formatarDataBR(intervaloAtual.inicio)} até ${formatarDataBR(
      formatarDataISO(fim)
    )}`
  }, [intervaloAtual, modoAgenda])

  const opcoesClasse = useMemo(() => {
    return turma ? TURMAS_CONFIG[turma] || [] : []
  }, [turma])

  const classeObrigatoria = opcoesClasse.length > 0

  const horariosFiltrados = useMemo(() => {
    if (!periodo) return []
    return HORARIOS_AULA.filter((horario) => horario.periodo === periodo)
  }, [periodo])

  const horariosDaAgenda = useMemo(() => {
    if (!periodoFiltroAgenda) return HORARIOS_AULA

    return HORARIOS_AULA.filter(
      (horario) => horario.periodo === periodoFiltroAgenda
    )
  }, [periodoFiltroAgenda])

  const agendamentosOrdenados = useMemo(() => {
    return [...agendamentos].sort((a, b) => {
      const dataA = normalizarDataISO(a.data || '')
      const dataB = normalizarDataISO(b.data || '')

      if (dataA !== dataB) {
        return dataA.localeCompare(dataB)
      }

      return Number(a.inicio || 0) - Number(b.inicio || 0)
    })
  }, [agendamentos])

  const agendamentosVisiveis = useMemo(() => {
    if (!periodoFiltroAgenda) return agendamentosOrdenados

    return agendamentosOrdenados.filter((agendamento) =>
      horariosDaAgenda.some((horario) =>
        agendamentoBateNoHorario(agendamento, horario)
      )
    )
  }, [agendamentosOrdenados, horariosDaAgenda, periodoFiltroAgenda])

  const agendamentosPorData = useMemo<Record<string, any[]>>(() => {
    return agendamentosVisiveis.reduce((acc: Record<string, any[]>, agendamento) => {
      const dataAgendamento = normalizarDataISO(agendamento.data || '')

      if (!dataAgendamento) return acc

      if (!acc[dataAgendamento]) {
        acc[dataAgendamento] = []
      }

      acc[dataAgendamento].push(agendamento)

      return acc
    }, {})
  }, [agendamentosVisiveis])

  async function carregarAgenda(
    dataSelecionada: string,
    modoSelecionado: ModoAgenda = modoAgenda
  ) {
    if (!dataSelecionada) {
      setAgendamentos([])
      return
    }

    const dataISO = normalizarDataISO(dataSelecionada)
    const intervalo = obterIntervaloAgenda(dataISO, modoSelecionado)

    setCarregandoAgenda(true)

    try {
      const filter =
        `tipo = "maker" && ` +
        `data >= "${intervalo.inicio}" && ` +
        `data < "${intervalo.fimExclusivo}" && ` +
        `status = "ativo" && ` +
        `status_entrega != "devolvido"`

      const registros = await pb.collection(ESPACOS_COLLECTION).getFullList({
        filter,
        sort: '+data,+inicio',
        expand: 'usuario',
        requestKey: null,
      })

      setAgendamentos(registros)
    } catch (err) {
      console.error('Erro ao carregar agenda da Sala Maker:', err)
      setAgendamentos([])
    } finally {
      setCarregandoAgenda(false)
    }
  }

  useEffect(() => {
    carregarAgenda(data, modoAgenda)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, modoAgenda])

  function handleTurmaChange(value: string) {
    setTurma(value)
    setClasse('')
  }

  function abrirFormulario() {
    if (periodoFiltroAgenda && !periodo) {
      setPeriodo(periodoFiltroAgenda)
    }

    setMostrarFormulario(true)

    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 100)
  }

  async function existeConflito(params: {
    dataISO: string
    inicioMin: number
    fimMin: number
  }) {
    const { dataISO, inicioMin, fimMin } = params

    const filter =
      `tipo = "maker" && ` +
      `data = "${dataISO}" && ` +
      `inicio < ${fimMin} && fim > ${inicioMin} && ` +
      `status = "ativo" && ` +
      `status_entrega != "devolvido"`

    const achou = await pb
      .collection(ESPACOS_COLLECTION)
      .getFirstListItem(filter, { requestKey: null })
      .catch(() => null)

    return !!achou
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!data || !periodo || !horarioAulaId) {
      alert('Preencha a data, o período e selecione a aula/horário.')
      return
    }

    if (!turma) {
      alert('Selecione a turma.')
      return
    }

    if (classeObrigatoria && !classe) {
      alert('Selecione a classe.')
      return
    }

    const usuarioId = (pb.authStore.model as any)?.id
    const collectionName = (pb.authStore.model as any)?.collectionName

    if (!usuarioId || collectionName !== 'users') {
      alert('Usuário não autenticado corretamente.')
      return
    }

    const horarioSelecionado = HORARIOS_AULA.find(
      (horario) => horario.id === horarioAulaId
    )

    if (!horarioSelecionado) {
      alert('Selecione uma aula/horário válido.')
      return
    }

    const dataISO = normalizarDataISO(data)
    const inicioMin = horarioSelecionado.inicio
    const fimMin = horarioSelecionado.fim

    if (fimMin <= inicioMin) {
      alert('Horário final deve ser maior que o inicial.')
      return
    }

    setLoading(true)

    try {
      const conflito = await existeConflito({
        dataISO,
        inicioMin,
        fimMin,
      })

      if (conflito) {
        alert('A Sala Maker já está reservada nesse horário.')
        return
      }

      await pb.collection(ESPACOS_COLLECTION).create({
        usuario: String(usuarioId),
        tipo: 'maker',
        data: dataISO,
        inicio: inicioMin,
        fim: fimMin,
        turma,
        classe: classeObrigatoria ? classe : '',
        observacoes: observacoes.trim(),
        status: 'ativo',
        status_entrega: 'pendente',
      })

      const turmaClasse = `${turma}${classeObrigatoria && classe ? ` ${classe}` : ''}`

      await criarEventoGoogleAgenda({
        titulo: `Agendamento Sala Maker - ${turmaClasse}`,
        descricao: [
          `Recurso: Sala Maker`,
          `Turma: ${turmaClasse}`,
          `Data: ${formatarDataBR(dataISO)}`,
          `Horário: ${minutosParaHora(inicioMin)} às ${minutosParaHora(fimMin)}`,
          observacoes.trim() ? `Observações: ${observacoes.trim()}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        data: dataISO,
        inicioMin,
        fimMin,
      })

      await carregarAgenda(dataISO, modoAgenda)

      setMostrarFormulario(false)
      setPeriodo('')
      setHorarioAulaId('')
      setTurma('')
      setClasse('')
      setObservacoes('')

      alert('Agendamento da Sala Maker realizado com sucesso!')
    } catch (err: any) {
      console.error('Erro completo ao salvar Maker:', err)
      console.error('Detalhes PocketBase:', err?.data)

      alert(
        err?.data?.message ||
          JSON.stringify(err?.data?.data || err?.data || err, null, 2) ||
          'Erro ao salvar.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <HeaderDashboard />

      <div className="max-w-5xl mx-auto py-16 px-4">
        <BackButton href="/agendamentos/novo" />

        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6 mb-8">
          <div className="w-full xl:max-w-[420px]">
            <h1 className="text-3xl font-bold">Agenda da Sala Maker</h1>

            <p className="text-gray-500 mt-2">
              Confira os horários já reservados antes de fazer um novo
              agendamento.
            </p>

            <p className="text-sm text-gray-400 mt-1">{resumoAgenda}</p>
          </div>

          <div className="w-full xl:max-w-[760px]">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div className="min-w-0">
                <label className="block font-medium mb-2">Visualização</label>

                <select
                  className="w-full min-w-0 border rounded-lg px-4 py-2 bg-white"
                  value={modoAgenda}
                  onChange={(e) => {
                    setModoAgenda(e.target.value as ModoAgenda)
                    setMostrarFormulario(false)
                  }}
                >
                  <option value="semana">Semana</option>
                  <option value="mes">Mês</option>
                </select>
              </div>

              <div className="min-w-0">
                <label className="block font-medium mb-2">
                  {modoAgenda === 'semana'
                    ? 'Semana de referência'
                    : 'Mês de referência'}
                </label>

                <input
                  type="date"
                  className="w-full min-w-0 border rounded-lg px-4 py-2"
                  value={data}
                  onChange={(e) => {
                    setData(e.target.value)
                    setMostrarFormulario(false)
                    setPeriodo('')
                    setHorarioAulaId('')
                  }}
                />
              </div>

              <div className="min-w-0">
                <label className="block font-medium mb-2">
                  Filtrar período
                </label>

                <select
                  className="w-full min-w-0 border rounded-lg px-4 py-2 bg-white"
                  value={periodoFiltroAgenda}
                  onChange={(e) => setPeriodoFiltroAgenda(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="manha">Manhã</option>
                  <option value="tarde">Tarde</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-2xl overflow-hidden border">
          <div className="bg-blue-50 border-b px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Agenda geral</h2>

              <p className="text-sm text-gray-500">
                {carregandoAgenda
                  ? 'Carregando agendamentos...'
                  : `${agendamentosVisiveis.length} agendamento(s) encontrado(s)`}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {carregandoAgenda ? (
              <p className="text-sm text-gray-500">Carregando agenda...</p>
            ) : agendamentosVisiveis.length === 0 ? (
              <div className="rounded-xl border border-dashed border-green-300 bg-green-50 p-5">
                <p className="font-medium text-green-700">
                  Nenhum agendamento encontrado.
                </p>

                <p className="text-sm text-green-600">
                  Não há reservas nesse período selecionado.
                </p>
              </div>
            ) : (
              Object.entries(agendamentosPorData).map(([dataAgenda, itens]) => (
                <div
                  key={dataAgenda}
                  className="border rounded-2xl overflow-hidden"
                >
                  <div className="bg-gray-50 px-5 py-3 border-b">
                    <h3 className="font-semibold">
                      {formatarDataBR(dataAgenda)}
                    </h3>
                  </div>

                  <div className="divide-y">
                    {itens
                      .sort((a, b) => Number(a.inicio || 0) - Number(b.inicio || 0))
                      .map((agendamento) => {
                        const usuario =
                          agendamento.expand?.usuario?.name ||
                          agendamento.expand?.usuario?.nome ||
                          agendamento.expand?.usuario?.email ||
                          'Responsável não informado'

                        return (
                          <div
                            key={agendamento.id}
                            className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                          >
                            <div>
                              <p className="font-semibold">
                                {minutosParaHora(Number(agendamento.inicio || 0))} às{' '}
                                {minutosParaHora(Number(agendamento.fim || 0))}
                              </p>

                              <p className="text-sm text-gray-600">
                                {nomeTurmaClasse(
                                  agendamento.turma,
                                  agendamento.classe
                                )}
                              </p>

                              <p className="text-sm text-gray-500">
                                Responsável: {usuario}
                              </p>
                            </div>

                            {agendamento.observacoes ? (
                              <p className="text-sm text-gray-500 md:text-right">
                                {agendamento.observacoes}
                              </p>
                            ) : null}
                          </div>
                        )
                      })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col md:flex-row gap-3 md:justify-end">
          <button
            type="button"
            onClick={() => router.push('/agendamentos/novo')}
            className="px-6 py-3 rounded-xl border font-semibold hover:bg-gray-50"
          >
            Voltar
          </button>

          <button
            type="button"
            onClick={abrirFormulario}
            className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold"
          >
            Agendar Sala Maker
          </button>
        </div>

        {mostrarFormulario ? (
          <div ref={formRef} className="mt-12">
            <h2 className="text-2xl font-bold mb-6">
              Novo agendamento — Sala Maker
            </h2>

            <form
              onSubmit={handleSubmit}
              className="bg-white shadow-md rounded-2xl p-8 space-y-6 border"
            >
              <div>
                <label className="block font-medium mb-2">Data</label>

                <input
                  type="date"
                  className="w-full border rounded-lg px-4 py-2"
                  value={data}
                  onChange={(e) => {
                    setData(e.target.value)
                    setPeriodo('')
                    setHorarioAulaId('')
                  }}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-2">Período</label>

                  <select
                    className="w-full border rounded-lg px-4 py-2 bg-white"
                    value={periodo}
                    onChange={(e) => {
                      setPeriodo(e.target.value)
                      setHorarioAulaId('')
                    }}
                    required
                  >
                    <option value="">Selecione o período</option>
                    <option value="manha">Manhã</option>
                    <option value="tarde">Tarde</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-2">
                    Aula / horário
                  </label>

                  <select
                    className="w-full border rounded-lg px-4 py-2 bg-white"
                    value={horarioAulaId}
                    onChange={(e) => setHorarioAulaId(e.target.value)}
                    disabled={!periodo}
                    required
                  >
                    <option value="">
                      {!periodo
                        ? 'Escolha o período primeiro'
                        : 'Selecione a aula/horário'}
                    </option>

                    {horariosFiltrados.map((horario) => (
                      <option key={horario.id} value={horario.id}>
                        {horario.label} — {horario.inicioTexto} às{' '}
                        {horario.fimTexto}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-2">
                    Turma / Série
                  </label>

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
                  placeholder="Escreva aqui alguma observação importante..."
                />
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
        ) : null}
      </div>
    </>
  )
}