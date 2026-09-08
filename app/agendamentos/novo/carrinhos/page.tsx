/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import HeaderDashboard from '@/components/HeaderDashboard'
import BackButton from '@/components/BackButton'
import { pb } from '@/lib/pocketbase'
import { ESPACOS_COLLECTION } from '@/lib/espacoConfig'
import { CARRINHO_LABEL, getHorariosDaTurma, getTurmaGradeFixa } from '@/lib/gradeSinos'
import { bloqueiosSemanaisNaData, GRADE_SEMANAL_FIXA, type AulaFixaSemanal } from '@/lib/gradeSemanal'

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

// Fallback para turmas fora do Fund I/Fund II (a grade de sinos por segmento
// so cobre 4o-9o ano — ver lib/gradeSinos.ts). Educacao Infantil, Ensino
// Medio, Bilingue e Uso Proprio continuam usando este horario generico.
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

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const NOMES_DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function hojeISO() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
}

function primeiroDiaMesISO(iso: string) {
  const [a, m] = iso.split('-')
  return a + '-' + m + '-01'
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

function abreviarCarrinho(nome: string) {
  return 'C' + nome.replace('Carrinho ', '').replace(/^0/, '')
}

function bateNoHorario(ag: { inicio?: number | string; fim?: number | string }, h: { inicio: number; fim: number }) {
  const ini = Number(ag.inicio ?? 0)
  const fim = Number(ag.fim ?? 0)
  return ini < h.fim && fim > h.inicio
}

// O campo "data" no PocketBase e' datetime ("AAAA-MM-DD 00:00:00.000Z"), entao
// "data = \"AAAA-MM-DD\"" nunca bate (comparacao de igualdade nao normaliza a
// data-only string). Range >= dia && < dia seguinte funciona corretamente.
function diaSeguinteISO(dataISO: string) {
  const d = criarDataLocal(dataISO)
  d.setDate(d.getDate() + 1)
  return formatarDataISO(d)
}

type AgendamentoCarrinho = {
  id: string
  data?: string
  inicio?: number
  fim?: number
  carrinho?: string
  tipo?: string
  status?: string
  status_entrega?: string
  turma?: string
  classe?: string
  disciplina?: string
  observacoes?: string
  expand?: { usuario?: { name?: string; nome?: string; email?: string } }
}

function ItemAgendamento({ ag }: { ag: AgendamentoCarrinho }) {
  const ehGradeFixaSemanal = ag.tipo === 'GRADE_FIXA_SEMANAL'
  const ehGradeFixa = ag.tipo === 'GRADE_FIXA' || ehGradeFixaSemanal
  const usuario =
    ag.expand?.usuario?.name ||
    ag.expand?.usuario?.nome ||
    ag.expand?.usuario?.email ||
    'Responsavel nao informado'
  const subtitulo = ehGradeFixaSemanal
    ? 'Grade fixa (semanal)' + (ag.disciplina ? ' — ' + ag.disciplina : '')
    : ehGradeFixa
      ? 'Grade fixa (coordenacao)' + (ag.disciplina ? ' — ' + ag.disciplina : '')
      : 'Responsavel: ' + usuario

  return (
    <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <div>
        <span className="inline-flex items-center gap-2 mb-1">
          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            {ag.carrinho ?? '-'}
          </span>
          {ehGradeFixa ? (
            <span className="inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              Grade fixa
            </span>
          ) : null}
        </span>
        <p className="font-semibold">
          {minutosParaHora(Number(ag.inicio||0))} as {minutosParaHora(Number(ag.fim||0))}
        </p>
        <p className="text-sm text-gray-600">{nomeTurmaClasse(ag.turma, ag.classe)}</p>
        <p className="text-sm text-gray-500">{subtitulo}</p>
      </div>
      {ag.observacoes ? (
        <p className="text-sm text-gray-500 md:text-right">{ag.observacoes}</p>
      ) : null}
    </div>
  )
}

export default function NovoAgendamentoCarrinhos() {
  const formRef = useRef<HTMLDivElement | null>(null)

  const [mesRef,           setMesRef]           = useState(() => primeiroDiaMesISO(hojeISO()))
  const [diaSelecionado,   setDiaSelecionado]   = useState('')
  const [agendamentos,     setAgendamentos]     = useState<AgendamentoCarrinho[]>([])
  const [carregandoAgenda, setCarregandoAgenda] = useState(false)
  const [filtroCarrinho,   setFiltroCarrinho]   = useState<NomeCarrinho | ''>('')
  const [mostrarForm,      setMostrarForm]      = useState(false)

  // Grade semanal fixa vinda da planilha do Google Sheets (ver
  // /api/grade-semanal). Comeca com a grade fixa do codigo como fallback
  // imediato, e troca assim que a planilha responder.
  const [gradeSemanal,       setGradeSemanal]       = useState<AulaFixaSemanal[]>(GRADE_SEMANAL_FIXA)
  const [fonteGradeSemanal,  setFonteGradeSemanal]  = useState<'carregando' | 'planilha' | 'padrao'>('carregando')
  const [atualizadoEmGrade,  setAtualizadoEmGrade]  = useState<string | null>(null)

  const [data,             setData]             = useState(hojeISO())
  const [turma,            setTurma]            = useState('')
  const [classe,           setClasse]           = useState('')
  const [periodo,          setPeriodo]          = useState('')       // fluxo antigo (manha/tarde) — so turmas fora da grade fixa
  const [horarioAulaId,    setHorarioAulaId]    = useState('')       // fluxo antigo
  const [periodoAulaGrade, setPeriodoAulaGrade] = useState<number | ''>('') // fluxo grade fixa (1a..6a aula do segmento)
  const [carrinhoSel,      setCarrinhoSel]      = useState<NomeCarrinho | ''>('')
  const [observacoes,      setObservacoes]      = useState('')
  const [loading,          setLoading]          = useState(false)
  const [erroForm,         setErroForm]         = useState('')

  const intervaloMes = useMemo(() => {
    const [ano, mes] = mesRef.split('-').map(Number)
    return { inicio: mesRef, fimExclusivo: formatarDataISO(new Date(ano, mes, 1)), ano, mes }
  }, [mesRef])

  const opcoesClasse      = useMemo(() => (turma ? TURMAS_CONFIG[turma] || [] : []), [turma])
  const classeObrigatoria  = opcoesClasse.length > 0

  // Turma da grade fixa (Fund I/Fund II mapeados) x turma fora dela (fluxo antigo).
  const turmaGradeFixa = useMemo(
    () => (turma ? getTurmaGradeFixa(turma, classe) : undefined),
    [turma, classe]
  )
  const aguardandoClasse = classeObrigatoria && !classe

  const horariosSegmento = useMemo(
    () => (turmaGradeFixa ? getHorariosDaTurma(turmaGradeFixa) : []),
    [turmaGradeFixa]
  )

  const carrinhosDaTurma = useMemo(
    () => (turmaGradeFixa ? turmaGradeFixa.carrinhos_permitidos.map((c) => CARRINHO_LABEL[c]) : CARRINHOS.slice()),
    [turmaGradeFixa]
  ) as NomeCarrinho[]

  const horarioSelecionadoGrade = useMemo(
    () => horariosSegmento.find((h) => h.periodo === periodoAulaGrade) || null,
    [horariosSegmento, periodoAulaGrade]
  )

  const horariosFiltrados = useMemo(
    () => HORARIOS_AULA.filter((h) => h.periodo === periodo),
    [periodo]
  )

  // Trava semanal fixa (6-8 ano, C3/C4) resolvida pro mes visivel — nao vem
  // do banco, e' calculada a partir do dia da semana de cada data. Ver
  // lib/gradeSemanal.ts.
  const agendaSemanalNoMes = useMemo(() => {
    const resultado: AgendamentoCarrinho[] = []
    const cursor = criarDataLocal(intervaloMes.inicio)
    const fimExclusivo = criarDataLocal(intervaloMes.fimExclusivo)
    while (cursor < fimExclusivo) {
      const dataISO = formatarDataISO(cursor)
      bloqueiosSemanaisNaData(dataISO, gradeSemanal).forEach((b, idx) => {
        resultado.push({
          id: 'semanal-' + dataISO + '-' + b.carrinho + '-' + b.periodo + '-' + idx,
          data: dataISO,
          inicio: b.inicioMin,
          fim: b.fimMin,
          carrinho: b.carrinho,
          tipo: 'GRADE_FIXA_SEMANAL',
          status: 'ativo',
          status_entrega: 'pendente',
          turma: b.turmaChave,
          classe: b.classe,
          disciplina: b.disciplina,
        })
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    return resultado
  }, [intervaloMes, gradeSemanal])

  const agendamentosCombinados = useMemo(
    () => [...agendamentos, ...agendaSemanalNoMes],
    [agendamentos, agendaSemanalNoMes]
  )

  const agendamentosOrdenados = useMemo(
    () => [...agendamentosCombinados].sort((a, b) => {
      const da = normalizarDataISO(a.data || '')
      const db = normalizarDataISO(b.data || '')
      if (da !== db) return da.localeCompare(db)
      return Number(a.inicio||0) - Number(b.inicio||0)
    }),
    [agendamentosCombinados]
  )

  // Grade de dias do mes (semanas completas, domingo a sabado, com os dias
  // do mes anterior/seguinte esmaecidos so pra fechar a grade).
  const diasDoMes = useMemo(() => {
    const { ano, mes } = intervaloMes
    const primeiroDia = new Date(ano, mes - 1, 1)
    const diasNoMes = new Date(ano, mes, 0).getDate()
    const offsetInicio = primeiroDia.getDay()
    const totalCelulas = Math.ceil((offsetInicio + diasNoMes) / 7) * 7
    const inicioGrade = new Date(primeiroDia)
    inicioGrade.setDate(inicioGrade.getDate() - offsetInicio)
    const hojeISOStr = hojeISO()

    const dias: { iso: string; numero: number; noMes: boolean; hoje: boolean }[] = []
    const cursor = new Date(inicioGrade)
    for (let i = 0; i < totalCelulas; i++) {
      const iso = formatarDataISO(cursor)
      dias.push({ iso, numero: cursor.getDate(), noMes: cursor.getMonth() === mes - 1, hoje: iso === hojeISOStr })
      cursor.setDate(cursor.getDate() + 1)
    }
    return dias
  }, [intervaloMes])

  // Resumo por dia (quais carrinhos tem uso naquele dia) pra pintar os
  // quadradinhos do calendario — o detalhe fica por conta do dia selecionado.
  const resumoPorDia = useMemo(() => {
    const mapa: Record<string, { carrinho: string; temGradeFixa: boolean }[]> = {}
    for (const ag of agendamentosCombinados) {
      const d = normalizarDataISO(ag.data || '')
      if (!d) continue
      if (filtroCarrinho && ag.carrinho !== filtroCarrinho) continue
      const carrinho = ag.carrinho || ''
      const ehFixa = ag.tipo === 'GRADE_FIXA' || ag.tipo === 'GRADE_FIXA_SEMANAL'
      if (!mapa[d]) mapa[d] = []
      const existente = mapa[d].find((c) => c.carrinho === carrinho)
      if (existente) { if (ehFixa) existente.temGradeFixa = true }
      else mapa[d].push({ carrinho, temGradeFixa: ehFixa })
    }
    Object.values(mapa).forEach((lista) => lista.sort((a, b) => a.carrinho.localeCompare(b.carrinho)))
    return mapa
  }, [agendamentosCombinados, filtroCarrinho])

  const itensDoDiaSelecionado = useMemo(() => {
    if (!diaSelecionado) return []
    return agendamentosOrdenados
      .filter((ag) => normalizarDataISO(ag.data || '') === diaSelecionado)
      .filter((ag) => !filtroCarrinho || ag.carrinho === filtroCarrinho)
      .sort((a, b) => {
        const cmp = (a.carrinho ?? '').localeCompare(b.carrinho ?? '')
        return cmp !== 0 ? cmp : Number(a.inicio||0) - Number(b.inicio||0)
      })
  }, [agendamentosOrdenados, diaSelecionado, filtroCarrinho])

  // Horario efetivo (fluxo grade fixa ou fluxo antigo) usado pra checar bloqueio/conflito.
  const horarioEmEdicao = useMemo(() => {
    if (turmaGradeFixa) {
      return horarioSelecionadoGrade
        ? { inicio: horarioSelecionadoGrade.inicioMin, fim: horarioSelecionadoGrade.fimMin }
        : null
    }
    const h = HORARIOS_AULA.find((x) => x.id === horarioAulaId)
    return h ? { inicio: h.inicio, fim: h.fim } : null
  }, [turmaGradeFixa, horarioSelecionadoGrade, horarioAulaId])

  const carrinhosBloqueados = useMemo(() => {
    if (!data || !horarioEmEdicao) return new Set<string>()
    const dataISO = normalizarDataISO(data)
    const bloqueados = new Set(
      agendamentos
        .filter((ag) =>
          normalizarDataISO(ag.data||'') === dataISO &&
          ag.status === 'ativo' &&
          ag.status_entrega !== 'devolvido' &&
          bateNoHorario(ag, horarioEmEdicao)
        )
        .map((ag) => ag.carrinho ?? '')
    )
    bloqueiosSemanaisNaData(dataISO, gradeSemanal)
      .filter((b) => b.inicioMin < horarioEmEdicao.fim && b.fimMin > horarioEmEdicao.inicio)
      .forEach((b) => bloqueados.add(b.carrinho))
    return bloqueados
  }, [agendamentos, data, horarioEmEdicao, gradeSemanal])

  // Assim que so sobra 1 carrinho possivel pra turma (regra fixa do Fund II),
  // ele ja aparece selecionado — a coordenacao/professor nao escolhe carrinho.
  useEffect(() => {
    if (turmaGradeFixa && carrinhosDaTurma.length === 1) {
      setCarrinhoSel(carrinhosDaTurma[0])
    } else {
      setCarrinhoSel('')
    }
  }, [turmaGradeFixa, carrinhosDaTurma])

  async function carregarAgenda(mesISO: string) {
    const [ano, mes] = mesISO.split('-').map(Number)
    const inicio = mesISO
    const fimExclusivo = formatarDataISO(new Date(ano, mes, 1))
    setCarregandoAgenda(true)
    try {
      const registros = await pb.collection(ESPACOS_COLLECTION).getFullList({
        filter: '(tipo = "carrinhos" || tipo = "GRADE_FIXA") && data >= "' + inicio + '" && data < "' + fimExclusivo + '" && status = "ativo" && status_entrega != "devolvido"',
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
    carregarAgenda(mesRef)
  }, [mesRef])

  async function carregarGradeSemanal() {
    try {
      const resp = await fetch('/api/grade-semanal', { cache: 'no-store' })
      const dados = await resp.json()
      setGradeSemanal(Array.isArray(dados.linhas) && dados.linhas.length > 0 ? dados.linhas : GRADE_SEMANAL_FIXA)
      setFonteGradeSemanal(dados.fonte === 'planilha' ? 'planilha' : 'padrao')
      setAtualizadoEmGrade(dados.atualizadoEm || null)
    } catch (err) {
      console.error('Erro ao buscar grade semanal da planilha:', err)
      setGradeSemanal(GRADE_SEMANAL_FIXA)
      setFonteGradeSemanal('padrao')
      setAtualizadoEmGrade(null)
    }
  }

  useEffect(() => {
    carregarGradeSemanal()
  }, [])

  function irParaMes(delta: number) {
    const [ano, mes] = mesRef.split('-').map(Number)
    const d = new Date(ano, mes - 1 + delta, 1)
    setMesRef(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-01')
    setDiaSelecionado('')
  }

  function handleTurmaChange(valor: string) {
    setTurma(valor)
    setClasse('')
    setPeriodo('')
    setHorarioAulaId('')
    setPeriodoAulaGrade('')
  }

  function handleClasseChange(valor: string) {
    setClasse(valor)
    setPeriodo('')
    setHorarioAulaId('')
    setPeriodoAulaGrade('')
  }

  function abrirFormulario(diaPreSelecionado?: string) {
    setData(diaPreSelecionado || diaSelecionado || hojeISO())
    setMostrarForm(true)
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  async function existeConflito(dataISO: string, inicioMin: number, fimMin: number, carrinho: string) {
    const bateNaTravaSemanal = bloqueiosSemanaisNaData(dataISO, gradeSemanal).some(
      (b) => b.carrinho === carrinho && b.inicioMin < fimMin && b.fimMin > inicioMin
    )
    if (bateNaTravaSemanal) return true

    const filtro =
      '(tipo = "carrinhos" || tipo = "GRADE_FIXA") && ' +
      'carrinho = "' + carrinho + '" && ' +
      'data >= "' + dataISO + '" && data < "' + diaSeguinteISO(dataISO) + '" && ' +
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

    if (!data || !turma) {
      setErroForm('Preencha a data e selecione a turma.')
      return
    }
    if (aguardandoClasse) {
      setErroForm('Selecione a classe.')
      return
    }

    let inicioMin: number
    let fimMin: number

    if (turmaGradeFixa) {
      if (!horarioSelecionadoGrade) {
        setErroForm('Selecione a aula/horario.')
        return
      }
      inicioMin = horarioSelecionadoGrade.inicioMin
      fimMin = horarioSelecionadoGrade.fimMin
    } else {
      if (!periodo || !horarioAulaId) {
        setErroForm('Selecione o periodo e a aula/horario.')
        return
      }
      const horario = HORARIOS_AULA.find((h) => h.id === horarioAulaId)
      if (!horario) {
        setErroForm('Selecione uma aula/horario valido.')
        return
      }
      inicioMin = horario.inicio
      fimMin = horario.fim
    }

    if (!carrinhoSel) {
      setErroForm('Selecione um carrinho disponivel.')
      return
    }

    const usuarioId      = (pb.authStore.model as any)?.id
    const collectionName = (pb.authStore.model as any)?.collectionName
    if (!usuarioId || collectionName !== 'users') {
      setErroForm('Usuario nao autenticado corretamente.')
      return
    }

    const dataISO = normalizarDataISO(data)

    setLoading(true)
    try {
      const conflito = await existeConflito(dataISO, inicioMin, fimMin, carrinhoSel)
      if (conflito) {
        setErroForm(carrinhoSel + ' ja esta reservado nesse horario (inclusive pela grade fixa da coordenacao). Escolha outro carrinho ou horario.')
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

      await carregarAgenda(mesRef)
      setDiaSelecionado(dataISO)

      setMostrarForm(false)
      setTurma('')
      setClasse('')
      setPeriodo('')
      setHorarioAulaId('')
      setPeriodoAulaGrade('')
      setCarrinhoSel('')
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

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Agenda dos Carrinhos de Chromebook</h1>
            <p className="text-gray-500 mt-2">
              Clique num dia pra ver os agendamentos. Os horarios fixos da coordenacao (grade quinzenal e grade semanal) tambem aparecem, com o selo &quot;Grade fixa&quot;.
            </p>
            <p className="text-xs mt-1 flex items-center gap-2">
              {fonteGradeSemanal === 'carregando' ? (
                <span className="text-gray-400">Carregando grade semanal...</span>
              ) : fonteGradeSemanal === 'planilha' ? (
                <span className="text-green-600">
                  ✓ Grade semanal sincronizada da planilha
                  {atualizadoEmGrade
                    ? ' às ' + new Date(atualizadoEmGrade).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    : ''}
                </span>
              ) : (
                <span className="text-amber-600">⚠ Não foi possível carregar a planilha — usando a grade padrão salva no sistema</span>
              )}
              <button
                type="button"
                onClick={carregarGradeSemanal}
                className="text-blue-600 hover:underline font-medium"
              >
                Atualizar
              </button>
            </p>
          </div>
          <button
            type="button"
            onClick={() => abrirFormulario()}
            className="shrink-0 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold whitespace-nowrap"
          >
            Agendar Carrinho de Chromebook
          </button>
        </div>

        <div className="bg-white shadow-md rounded-2xl overflow-hidden border">
          <div className="bg-blue-50 border-b px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => irParaMes(-1)}
                className="w-9 h-9 rounded-lg border bg-white hover:bg-gray-50 font-semibold"
                aria-label="Mes anterior"
              >
                ‹
              </button>
              <h2 className="font-semibold text-lg min-w-[180px] text-center">
                {NOMES_MESES[intervaloMes.mes - 1]} de {intervaloMes.ano}
              </h2>
              <button
                type="button"
                onClick={() => irParaMes(1)}
                className="w-9 h-9 rounded-lg border bg-white hover:bg-gray-50 font-semibold"
                aria-label="Proximo mes"
              >
                ›
              </button>
            </div>

            <select
              className="border rounded-lg px-4 py-2 bg-white text-sm"
              value={filtroCarrinho}
              onChange={(e) => setFiltroCarrinho(e.target.value as NomeCarrinho | '')}
            >
              <option value="">Todos os carrinhos</option>
              {CARRINHOS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="p-4 sm:p-6">
            {carregandoAgenda ? (
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                  {NOMES_DIAS_SEMANA.map((n) => (
                    <div key={n} className="text-center text-xs font-semibold text-gray-500 py-1">{n}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {diasDoMes.map((dia) => {
                    const resumo = resumoPorDia[dia.iso] || []
                    const selecionado = diaSelecionado === dia.iso
                    return (
                      <button
                        key={dia.iso}
                        type="button"
                        onClick={() => setDiaSelecionado(selecionado ? '' : dia.iso)}
                        className={[
                          'min-h-[64px] sm:min-h-[76px] p-1.5 rounded-lg border text-left flex flex-col gap-1 transition-all',
                          !dia.noMes ? 'opacity-40' : '',
                          selecionado
                            ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-200'
                            : dia.hoje
                              ? 'border-blue-300 bg-white'
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50',
                        ].join(' ')}
                      >
                        <span className={'text-xs font-semibold ' + (dia.hoje ? 'text-blue-600' : 'text-gray-600')}>
                          {dia.numero}
                        </span>
                        <span className="flex flex-wrap gap-1">
                          {resumo.map((c) => (
                            <span
                              key={c.carrinho}
                              className={[
                                'text-[10px] leading-none font-semibold px-1 py-0.5 rounded',
                                c.temGradeFixa ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700',
                              ].join(' ')}
                            >
                              {abreviarCarrinho(c.carrinho)}
                            </span>
                          ))}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {diaSelecionado ? (
          <div className="mt-4 bg-white shadow-md rounded-2xl overflow-hidden border">
            <div className="bg-blue-50 border-b px-6 py-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-lg">{formatarDataBR(diaSelecionado)}</h3>
                <p className="text-sm text-gray-500">
                  {itensDoDiaSelecionado.length} agendamento(s) nesse dia
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => abrirFormulario(diaSelecionado)}
                  className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold whitespace-nowrap"
                >
                  Agendar esse dia
                </button>
                <button
                  type="button"
                  onClick={() => setDiaSelecionado('')}
                  className="px-3 py-2 rounded-lg border hover:bg-gray-50 text-sm font-semibold"
                >
                  Fechar
                </button>
              </div>
            </div>
            <div className="divide-y">
              {itensDoDiaSelecionado.length === 0 ? (
                <div className="p-5">
                  <p className="font-medium text-green-700">Nenhum agendamento nesse dia.</p>
                  <p className="text-sm text-green-600">Todos os carrinhos estao livres.</p>
                </div>
              ) : (
                itensDoDiaSelecionado.map((ag) => <ItemAgendamento key={ag.id} ag={ag} />)
              )}
            </div>
          </div>
        ) : null}

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
                  onChange={(e) => { setData(e.target.value); setPeriodo(''); setHorarioAulaId(''); setPeriodoAulaGrade('') }}
                  required
                />
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
                    onChange={(e) => handleClasseChange(e.target.value)}
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

              {turma && !aguardandoClasse && turmaGradeFixa ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  {carrinhosDaTurma.length > 1
                    ? 'Carrinhos desta turma: ' + carrinhosDaTurma.join(' ou ') + '.'
                    : 'Carrinho desta turma: ' + carrinhosDaTurma[0] + '.'}
                </div>
              ) : null}

              {turma && !aguardandoClasse && turmaGradeFixa ? (
                <div>
                  <label className="block font-medium mb-2">Aula / horario</label>
                  <select
                    className="w-full border rounded-lg px-4 py-2 bg-white"
                    value={periodoAulaGrade}
                    onChange={(e) => setPeriodoAulaGrade(e.target.value ? Number(e.target.value) : '')}
                    required
                  >
                    <option value="">Selecione a aula/horario</option>
                    {horariosSegmento.map((h) => (
                      <option key={h.periodo} value={h.periodo}>
                        {h.periodo}ª aula — {h.inicio} as {h.fim}
                      </option>
                    ))}
                  </select>
                </div>
              ) : turma && !aguardandoClasse ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-2">Periodo</label>
                    <select
                      className="w-full border rounded-lg px-4 py-2 bg-white"
                      value={periodo}
                      onChange={(e) => { setPeriodo(e.target.value); setHorarioAulaId('') }}
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
                      onChange={(e) => setHorarioAulaId(e.target.value)}
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
              ) : null}

              <div>
                <label className="block font-medium mb-3">Carrinho</label>
                {!turma || aguardandoClasse ? (
                  <p className="text-sm text-gray-400">Escolha a turma primeiro.</p>
                ) : !horarioEmEdicao ? (
                  <p className="text-sm text-gray-400">Escolha a aula/horario primeiro para ver a disponibilidade.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {carrinhosDaTurma.map((c) => {
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

              <div>
                <label className="block font-medium mb-2">Observacoes</label>
                <textarea
                  className="w-full border rounded-lg px-4 py-3 min-h-[110px]"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Escreva aqui alguma observacao importante..."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setMostrarForm(false)}
                  className="sm:w-40 px-6 py-3 rounded-xl border font-semibold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 transition"
                >
                  {loading ? 'Salvando...' : 'Salvar agendamento'}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </>
  )
}
