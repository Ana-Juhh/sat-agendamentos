/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import HeaderDashboard from '@/components/HeaderDashboard'
import BackButton from '@/components/BackButton'
import { pb } from '@/lib/pocketbase'
import { ESPACOS_COLLECTION } from '@/lib/espacoConfig'

type ModoAgenda = 'semana' | 'mes'

const CARRINHOS = [
  'Carrinho 01',
  'Carrinho 02',
  'Carrinho 03',
  'Carrinho 04',
  'Carrinho 05',
] as const

type NomeCarrinho = (typeof CARRINHOS)[number]

const TURMAS_CONFIG: Record<string, string[]> = {
  'Uso Proprio': [],
  '1 ano':  ['A', 'B', 'C', 'D'],
  '2 ano':  ['A', 'B', 'C'],
  '3 ano':  ['A', 'B', 'C'],
  '4 ano':  ['A', 'B', 'C'],
  '5 ano':  ['A', 'B'],
  '6 ano':  ['A', 'B'],
  '7 ano':  ['A', 'B'],
  '8 ano':  ['A', 'B'],
  '9 ano':  ['A', 'B'],
  '1 serie': ['A', 'B'],
  '2 serie': ['A', 'B'],
  '3 serie': ['A', 'B'],
  'Bilingue': [],
}

const HORARIOS_AULA = [
  { id: 'manha_1', periodo: 'manha', label: '1a aula', inicioTexto: '07:30', fimTexto: '08:20', inicio: 450,  fim: 500  },
  { id: 'manha_2', periodo: 'manha', label: '2a aula', inicioTexto: '08:20', fimTexto: '09:10', inicio: 500,  fim: 550  },
  { id: 'manha_3', periodo: 'manha', label: '3a aula', inicioTexto: '09:30', fimTexto: '10:20', inicio: 570,  fim: 620  },
  { id: 'manha_4', periodo: 'manha', label: '4a aula', inicioTexto: '10:20', fimTexto: '11:10', inicio: 620,  fim: 670  },
  { id: 'manha_5', periodo: 'manha', label: '5a aula', inicioTexto: '11:10', fimTexto: '12:00', inicio: 670,  fim: 720  },
  { id: 'manha_6', periodo: 'manha', label: '6a aula', inicioTexto: '12:00', fimTexto: '12:50', inicio: 720,  fim: 770  },
  { id: 'tarde_1', periodo: 'tarde', label: '1a aula', inicioTexto: '13:10', fimTexto: '14:00', inicio: 790,  fim: 840  },
  { id: 'tarde_2', periodo: 'tarde', label: '2a aula', inicioTexto: '14:00', fimTexto: '14:50', inicio: 840,  fim: 890  },
  { id: 'tarde_3', periodo: 'tarde', label: '3a aula', inicioTexto: '14:50', fimTexto: '15:40', inicio: 890,  fim: 940  },
  { id: 'tarde_4', periodo: 'tarde', label: '4a aula', inicioTexto: '16:00', fimTexto: '16:50', inicio: 960,  fim: 1010 },
  { id: 'tarde_5', periodo: 'tarde', label: '5a aula', inicioTexto: '16:50', fimTexto: '17:40', inicio: 1010, fim: 1060 },
  { id: 'tarde_6', periodo: 'tarde', label: '6a aula', inicioTexto: '17:40', fimTexto: '18:30', inicio: 1060, fim: 1110 },
]

function hojeISO() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
}

function normalizarDataISO(valor: string) {
  if (!valor) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor
  return valor.slice(0, 10)
}

function criarDataLocal(iso: string) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}

function formatarDataISO(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
}

function formatarDataBR(iso: string) {
  const [a, m, d] = iso.split('-')
  return d + '/' + m + '/' + a
}

function minutosParaHora(min: number | string) {
  const total = Number(min) || 0
  const h = Math.floor(total / 60)
  const m = total % 60
  return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0')
}

function nomeTurmaClasse(turma?: string, classe?: string) {
  if (!turma) return 'Turma nao informada'
  return classe ? turma + ' ' + classe : turma
}

function obterIntervaloAgenda(dataISO: string, modo: ModoAgenda) {
  const base = criarDataLocal(dataISO)
  if (modo === 'semana') {
    const inicio = new Date(base)
    const dow = inicio.getDay()
    inicio.setDate(inicio.getDate() + (dow === 0 ? -6 : 1 - dow))
    const fim = new Date(inicio)
    fim.setDate(inicio.getDate() + 7)
    return { inicio: formatarDataISO(inicio), fimExclusivo: formatarDataISO(fim) }
  }
  const inicio = new Date(base.getFullYear(), base.getMonth(), 1)
  const fim = new Date(base.getFullYear(), base.getMonth() + 1, 1)
  return { inicio: formatarDataISO(inicio), fimExclusivo: formatarDataISO(fim) }
}

function bateNoHorario(ag: { inicio?: number | string; fim?: number | string }, h: { inicio: number; fim: number }) {
  const ini = Number(ag.inicio ?? 0)
  const fim = Number(ag.fim ?? 0)
  return ini < h.fim && fim > h.inicio
}

type AgendamentoCarrinho = {
  id: string
  data?: string
  inicio?: number
  fim?: number
  carrinho?: string
  status?: string
  status_entrega?: string
  turma?: string
  classe?: string
  observacoes?: string
  expand?: { usuario?: { name?: string; nome?: string; email?: string } }
}

export default function NovoAgendamentoCarrinhos() {
  const router  = useRouter()
  const formRef = useRef<HTMLDivElement | null>(null)

  const [data,             setData]             = useState(hojeISO())
  const [modoAgenda,       setModoAgenda]       = useState<ModoAgenda>('semana')
  const [agendamentos,     setAgendamentos]     = useState<AgendamentoCarrinho[]>([])
  const [carregandoAgenda, setCarregandoAgenda] = useState(false)
  const [filtroPeriodo,    setFiltroPeriodo]    = useState('')
  const [filtroCarrinho,   setFiltroCarrinho]   = useState<NomeCarrinho | ''>('')
  const [mostrarForm,      setMostrarForm]      = useState(false)
  const [periodo,          setPeriodo]          = useState('')
  const [horarioAulaId,    setHorarioAulaId]    = useState('')
  const [carrinhoSel,      setCarrinhoSel]      = useState<NomeCarrinho | ''>('')
  const [turma,            setTurma]            = useState('')
  const [classe,           setClasse]           = useState('')
  const [observacoes,      setObservacoes]      = useState('')
  const [loading,          setLoading]          = useState(false)
  const [erroForm,         setErroForm]         = useState('')

  const intervalo = useMemo(() => obterIntervaloAgenda(data, modoAgenda), [data, modoAgenda])

  const resumoAgenda = useMemo(() => {
    const fim = criarDataLocal(intervalo.fimExclusivo)
    fim.setDate(fim.getDate() - 1)
    const pref = modoAgenda === 'semana' ? 'Semana de' : 'Mes de'
    return pref + ' ' + formatarDataBR(intervalo.inicio) + ' ate ' + formatarDataBR(formatarDataISO(fim))
  }, [intervalo, modoAgenda])

  const opcoesClasse      = useMemo(() => (turma ? TURMAS_CONFIG[turma] || [] : []), [turma])
  const classeObrigatoria  = opcoesClasse.length > 0

  const horariosFiltrados = useMemo(
    () => HORARIOS_AULA.filter((h) => h.periodo === periodo),
    [periodo]
  )

  const horariosDaAgenda = useMemo(
    () => filtroPeriodo ? HORARIOS_AULA.filter((h) => h.periodo === filtroPeriodo) : HORARIOS_AULA,
    [filtroPeriodo]
  )

  const agendamentosOrdenados = useMemo(
    () => [...agendamentos].sort((a, b) => {
      const da = normalizarDataISO(a.data || '')
      const db = normalizarDataISO(b.data || '')
      if (da !== db) return da.localeCompare(db)
      return Number(a.inicio||0) - Number(b.inicio||0)
    }),
    [agendamentos]
  )

  const agendamentosVisiveis = useMemo(() => {
    let lista = agendamentosOrdenados
    if (filtroPeriodo) lista = lista.filter((ag) => horariosDaAgenda.some((h) => bateNoHorario(ag, h)))
    if (filtroCarrinho) lista = lista.filter((ag) => ag.carrinho === filtroCarrinho)
    return lista
  }, [agendamentosOrdenados, horariosDaAgenda, filtroPeriodo, filtroCarrinho])

  const agendamentosPorData = useMemo<Record<string, AgendamentoCarrinho[]>>(() => {
    return agendamentosVisiveis.reduce((acc: Record<string, AgendamentoCarrinho[]>, ag) => {
      const d = normalizarDataISO(ag.data || '')
      if (!d) return acc
      if (!acc[d]) acc[d] = []
      acc[d].push(ag)
      return acc
    }, {})
  }, [agendamentosVisiveis])

  const carrinhosBloqueados = useMemo(() => {
    if (!data || !horarioAulaId) return new Set<string>()
    const horario = HORARIOS_AULA.find((h) => h.id === horarioAulaId)
    if (!horario) return new Set<string>()
    const dataISO = normalizarDataISO(data)
    return new Set(
      agendamentos
        .filter((ag) =>
          normalizarDataISO(ag.data||'') === dataISO &&
          ag.status === 'ativo' &&
          ag.status_entrega !== 'devolvido' &&
          bateNoHorario(ag, horario)
        )
        .map((ag) => ag.carrinho ?? '')
    )
  }, [agendamentos, data, horarioAulaId])

  async function carregarAgenda(dataSel: string, modoSel: ModoAgenda = modoAgenda) {
    if (!dataSel) { setAgendamentos([]); return }
    const dataISO = normalizarDataISO(dataSel)
    const iv = obterIntervaloAgenda(dataISO, modoSel)
    setCarregandoAgenda(true)
    try {
      const registros = await pb.collection(ESPACOS_COLLECTION).getFullList({
        filter: 'tipo = "carrinhos" && data >= "' + iv.inicio + '" && data < "' + iv.fimExclusivo + '" && status = "ativo" && status_entrega != "devolvido"',
        sort: '+data,+inicio',
        expand: 'usuario',
        requestKey: null,
      })
      setAgendamentos(registros as AgendamentoCarrinho[])
    } catch (err) {
      console.error('Erro ao carregar agenda de carrinhos:', err)
      setAgendamentos([])
    } finally {
      setCarregandoAgenda(false)
    }
  }

  useEffect(() => {
    carregarAgenda(data, modoAgenda)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, modoAgenda])

  function handleTurmaChange(valor: string) {
    setTurma(valor)
    setClasse('')
  }

  function abrirFormulario() {
    if (filtroPeriodo && !periodo) setPeriodo(filtroPeriodo)
    setMostrarForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  async function existeConflito(dataISO: string, inicioMin: number, fimMin: number, carrinho: string) {
    const filtro =
      'tipo = "carrinhos" && ' +
      'carrinho = "' + carrinho + '" && ' +
      'data = "' + dataISO + '" && ' +
      'inicio < ' + fimMin + ' && fim > ' + inicioMin + ' && ' +
      'status = "ativo" && status_entrega != "devolvido"'
    const achou = await pb
      .collection(ESPACOS_COLLECTION)
      .getFirstListItem(filtro, { requestKey: null })
      .catch(() => null)
    return !!achou
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErroForm('')

    if (!data || !periodo || !horarioAulaId) {
      setErroForm('Preencha a data, o periodo e selecione a aula/horario.')
      return
    }
    if (!carrinhoSel) {
      setErroForm('Selecione um carrinho disponivel.')
      return
    }
    if (!turma) {
      setErroForm('Selecione a turma.')
      return
    }
    if (classeObrigatoria && !classe) {
      setErroForm('Selecione a classe.')
      return
    }

    const usuarioId      = (pb.authStore.model as any)?.id
    const collectionName = (pb.authStore.model as any)?.collectionName
    if (!usuarioId || collectionName !== 'users') {
      setErroForm('Usuario nao autenticado corretamente.')
      return
    }

    const horario = HORARIOS_AULA.find((h) => h.id === horarioAulaId)
    if (!horario) {
      setErroForm('Selecione uma aula/horario valido.')
      return
    }

    const dataISO   = normalizarDataISO(data)
    const inicioMin = horario.inicio
    const fimMin    = horario.fim

    setLoading(true)
    try {
      const conflito = await existeConflito(dataISO, inicioMin, fimMin, carrinhoSel)
      if (conflito) {
        setErroForm(carrinhoSel + ' ja esta reservado nesse horario. Escolha outro carrinho ou horario.')
        return
      }

      await pb.collection(ESPACOS_COLLECTION).create({
        usuario:        String(usuarioId),
        tipo:           'carrinhos',
        carrinho:       carrinhoSel,
        data:           dataISO,
        inicio:         inicioMin,
        fim:            fimMin,
        turma,
        classe:         classeObrigatoria ? classe : '',
        observacoes:    observacoes.trim(),
        status:         'ativo',
        status_entrega: 'pendente',
      })

      await carregarAgenda(dataISO, modoAgenda)

      setMostrarForm(false)
      setPeriodo('')
      setHorarioAulaId('')
      setCarrinhoSel('')
      setTurma('')
      setClasse('')
      setObservacoes('')
      setErroForm('')

      alert('Agendamento do ' + carrinhoSel + ' realizado com sucesso!')
    } catch (err: any) {
      console.error('Erro ao salvar agendamento de carrinho:', err)
      const camposComErro = err?.data?.data
      let mensagemErro = err?.data?.message || 'Erro ao salvar. Tente novamente.'
      if (camposComErro && typeof camposComErro === 'object') {
        const detalhes = Object.entries(camposComErro)
          .map(([campo, info]: [string, any]) => campo + ': ' + (info?.message || JSON.stringify(info)))
          .join(' | ')
        if (detalhes) mensagemErro = 'Campos com erro: ' + detalhes
      }
      setErroForm(mensagemErro)
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
            <h1 className="text-3xl font-bold">Agenda dos Carrinhos de Chromebook</h1>
            <p className="text-gray-500 mt-2">
              Confira os horarios ja reservados antes de fazer um novo agendamento.
            </p>
            <p className="text-sm text-gray-400 mt-1">{resumoAgenda}</p>
          </div>

          <div className="w-full xl:max-w-[820px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="min-w-0">
                <label className="flex items-end min-h-[3rem] font-medium mb-2">Visualizacao</label>
                <select
                  className="w-full min-w-0 border rounded-lg px-4 py-2 bg-white"
                  value={modoAgenda}
                  onChange={(e) => { setModoAgenda(e.target.value as ModoAgenda); setMostrarForm(false) }}
                >
                  <option value="semana">Semana</option>
                  <option value="mes">Mes</option>
                </select>
              </div>

              <div className="min-w-0">
                <label className="flex items-end min-h-[3rem] font-medium mb-2">
                  {modoAgenda === 'semana' ? 'Semana de referencia' : 'Mes de referencia'}
                </label>
                <input
                  type="date"
                  className="w-full min-w-0 border rounded-lg px-4 py-2"
                  value={data}
                  onChange={(e) => { setData(e.target.value); setMostrarForm(false); setPeriodo(''); setHorarioAulaId('') }}
                />
              </div>

              <div className="min-w-0">
                <label className="flex items-end min-h-[3rem] font-medium mb-2">Filtrar periodo</label>
                <select
                  className="w-full min-w-0 border rounded-lg px-4 py-2 bg-white"
                  value={filtroPeriodo}
                  onChange={(e) => setFiltroPeriodo(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="manha">Manha</option>
                  <option value="tarde">Tarde</option>
                </select>
              </div>

              <div className="min-w-0">
                <label className="flex items-end min-h-[3rem] font-medium mb-2">Filtrar carrinho</label>
                <select
                  className="w-full min-w-0 border rounded-lg px-4 py-2 bg-white"
                  value={filtroCarrinho}
                  onChange={(e) => setFiltroCarrinho(e.target.value as NomeCarrinho | '')}
                >
                  <option value="">Todos</option>
                  {CARRINHOS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-2xl overflow-hidden border">
          <div className="bg-blue-50 border-b px-6 py-4">
            <h2 className="font-semibold text-lg">Agenda geral</h2>
            <p className="text-sm text-gray-500">
              {carregandoAgenda
                ? 'Carregando agendamentos...'
                : agendamentosVisiveis.length + ' agendamento(s) encontrado(s)'}
            </p>
          </div>

          <div className="p-6 space-y-5">
            {carregandoAgenda ? (
              <div className="space-y-3">
                {[0,1,2].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : agendamentosVisiveis.length === 0 ? (
              <div className="rounded-xl border border-dashed border-green-300 bg-green-50 p-5">
                <p className="font-medium text-green-700">Nenhum agendamento encontrado.</p>
                <p className="text-sm text-green-600">Nao ha reservas nesse periodo selecionado.</p>
              </div>
            ) : (
              Object.entries(agendamentosPorData).map(([dataAg, itens]) => (
                <div key={dataAg} className="border rounded-2xl overflow-hidden">
                  <div className="bg-gray-50 px-5 py-3 border-b">
                    <h3 className="font-semibold">{formatarDataBR(dataAg)}</h3>
                  </div>
                  <div className="divide-y">
                    {itens
                      .sort((a, b) => {
                        const cmp = (a.carrinho ?? '').localeCompare(b.carrinho ?? '')
                        return cmp !== 0 ? cmp : Number(a.inicio||0) - Number(b.inicio||0)
                      })
                      .map((ag) => {
                        const usuario =
                          ag.expand?.usuario?.name ||
                          ag.expand?.usuario?.nome ||
                          ag.expand?.usuario?.email ||
                          'Responsavel nao informado'
                        return (
                          <div key={ag.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <div>
                              <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full mb-1">
                                {ag.carrinho ?? '-'}
                              </span>
                              <p className="font-semibold">
                                {minutosParaHora(Number(ag.inicio||0))} as {minutosParaHora(Number(ag.fim||0))}
                              </p>
                              <p className="text-sm text-gray-600">{nomeTurmaClasse(ag.turma, ag.classe)}</p>
                              <p className="text-sm text-gray-500">Responsavel: {usuario}</p>
                            </div>
                            {ag.observacoes ? (
                              <p className="text-sm text-gray-500 md:text-right">{ag.observacoes}</p>
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
            Agendar Carrinho de Chromebook
          </button>
        </div>

        {mostrarForm ? (
          <div ref={formRef} className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Novo agendamento - Carrinhos de Chromebook</h2>

            <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-2xl p-8 space-y-6 border">

              {erroForm ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {erroForm}
                </div>
              ) : null}

              <div>
                <label className="block font-medium mb-2">Data</label>
                <input
                  type="date"
                  className="w-full border rounded-lg px-4 py-2"
                  value={data}
                  onChange={(e) => { setData(e.target.value); setPeriodo(''); setHorarioAulaId(''); setCarrinhoSel('') }}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-2">Periodo</label>
                  <select
                    className="w-full border rounded-lg px-4 py-2 bg-white"
                    value={periodo}
                    onChange={(e) => { setPeriodo(e.target.value); setHorarioAulaId(''); setCarrinhoSel('') }}
                    required
                  >
                    <option value="">Selecione o periodo</option>
                    <option value="manha">Manha</option>
                    <option value="tarde">Tarde</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-2">Aula / horario</label>
                  <select
                    className="w-full border rounded-lg px-4 py-2 bg-white"
                    value={horarioAulaId}
                    onChange={(e) => { setHorarioAulaId(e.target.value); setCarrinhoSel('') }}
                    disabled={!periodo}
                    required
                  >
                    <option value="">
                      {!periodo ? 'Escolha o periodo primeiro' : 'Selecione a aula/horario'}
                    </option>
                    {horariosFiltrados.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.label} - {h.inicioTexto} as {h.fimTexto}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-3">Selecione o carrinho</label>
                {!horarioAulaId ? (
                  <p className="text-sm text-gray-400">Escolha a aula/horario primeiro para ver a disponibilidade.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {CARRINHOS.map((c) => {
                      const bloqueado  = carrinhosBloqueados.has(c)
                      const selecionado = carrinhoSel === c
                      return (
                        <button
                          key={c}
                          type="button"
                          disabled={bloqueado}
                          onClick={() => setCarrinhoSel(c)}
                          className={[
                            'flex flex-col items-center justify-center gap-1 py-4 rounded-xl border-2 font-semibold text-sm transition-all',
                            bloqueado
                              ? 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed'
                              : selecionado
                                ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-gray-50',
                          ].join(' ')}
                        >
                          <span className="text-xl">{bloqueado ? '🔴' : selecionado ? '✅' : '🟢'}</span>
                          <span>{c}</span>
                          <span className="text-xs font-normal">{bloqueado ? 'Ocupado' : 'Disponivel'}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-2">Turma / Serie</label>
                  <select
                    className="w-full border rounded-lg px-4 py-2 bg-white"
                    value={turma}
                    onChange={(e) => handleTurmaChange(e.target.value)}
                    required
                  >
                    <option value="">Selecione a turma</option>
                    {Object.keys(TURMAS_CONFIG).map((t) => <option key={t} value={t}>{t}</option>)}
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
                          ? 'Nao precisa selecionar classe'
                          : 'Selecione a classe'}
                    </option>
                    {opcoesClasse.map((op) => <option key={op} value={op}>{op}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-2">Observacoes</label>
                <textarea
                  className="w-full border rounded-lg px-4 py-3 min-h-[110px]"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Escreva aqui alguma observacao importante..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 transition"
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
