'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import HeaderDashboard from '@/components/HeaderDashboard'
import { pb } from '@/lib/pocketbase'
import { ESPACOS_COLLECTION } from '@/lib/espacoConfig'
import BackButton from '@/components/BackButton'
import { bloqueiosMakerNaData, GRADE_MAKER_FIXA, type AulaFixaMaker } from '@/lib/gradeMaker'

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
  { id: 'manha_1', periodo: 'manha', periodoLabel: 'Manhã', label: '1ª aula', inicioTexto: '07:30', fimTexto: '08:20', inicio: 450, fim: 500 },
  { id: 'manha_2', periodo: 'manha', periodoLabel: 'Manhã', label: '2ª aula', inicioTexto: '08:20', fimTexto: '09:10', inicio: 500, fim: 550 },
  { id: 'manha_3', periodo: 'manha', periodoLabel: 'Manhã', label: '3ª aula', inicioTexto: '09:30', fimTexto: '10:20', inicio: 570, fim: 620 },
  { id: 'manha_4', periodo: 'manha', periodoLabel: 'Manhã', label: '4ª aula', inicioTexto: '10:20', fimTexto: '11:10', inicio: 620, fim: 670 },
  { id: 'manha_5', periodo: 'manha', periodoLabel: 'Manhã', label: '5ª aula', inicioTexto: '11:10', fimTexto: '12:00', inicio: 670, fim: 720 },
  { id: 'manha_6', periodo: 'manha', periodoLabel: 'Manhã', label: '6ª aula', inicioTexto: '12:00', fimTexto: '12:50', inicio: 720, fim: 770 },
  { id: 'tarde_1', periodo: 'tarde', periodoLabel: 'Tarde', label: '1ª aula', inicioTexto: '13:10', fimTexto: '14:00', inicio: 790, fim: 840 },
  { id: 'tarde_2', periodo: 'tarde', periodoLabel: 'Tarde', label: '2ª aula', inicioTexto: '14:00', fimTexto: '14:50', inicio: 840, fim: 890 },
  { id: 'tarde_3', periodo: 'tarde', periodoLabel: 'Tarde', label: '3ª aula', inicioTexto: '14:50', fimTexto: '15:40', inicio: 890, fim: 940 },
  { id: 'tarde_4', periodo: 'tarde', periodoLabel: 'Tarde', label: '4ª aula', inicioTexto: '16:00', fimTexto: '16:50', inicio: 960, fim: 1010 },
  { id: 'tarde_5', periodo: 'tarde', periodoLabel: 'Tarde', label: '5ª aula', inicioTexto: '16:50', fimTexto: '17:40', inicio: 1010, fim: 1060 },
  { id: 'tarde_6', periodo: 'tarde', periodoLabel: 'Tarde', label: '6ª aula', inicioTexto: '17:40', fimTexto: '18:30', inicio: 1060, fim: 1110 },
]

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const NOMES_DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function hojeISO() {
  const agora = new Date()
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
}

function primeiroDiaMesISO(iso: string) {
  const [a, m] = iso.split('-')
  return `${a}-${m}-01`
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

// O campo "data" no PocketBase e' datetime ("AAAA-MM-DD 00:00:00.000Z"), entao
// "data = \"AAAA-MM-DD\"" nunca bate. Range >= dia && < dia seguinte funciona.
function diaSeguinteISO(dataISO: string) {
  const d = criarDataLocal(dataISO)
  d.setDate(d.getDate() + 1)
  return formatarDataISO(d)
}

type Agendamento = {
  id: string
  data?: string
  inicio?: number
  fim?: number
  turma?: string
  classe?: string
  observacoes?: string
  tipo?: string
  status?: string
  status_entrega?: string
  expand?: { usuario?: { name?: string; nome?: string; email?: string } }
}

function ItemAgendamentoMaker({ ag }: { ag: Agendamento }) {
  const ehGradeFixa = ag.tipo === 'GRADE_FIXA_SEMANAL'
  const usuario =
    ag.expand?.usuario?.name ||
    ag.expand?.usuario?.nome ||
    ag.expand?.usuario?.email ||
    'Responsável não informado'

  return (
    <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <div>
        {ehGradeFixa ? (
          <span className="inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full mb-1">
            Grade fixa
          </span>
        ) : null}

        <p className="font-semibold">
          {minutosParaHora(Number(ag.inicio || 0))} às {minutosParaHora(Number(ag.fim || 0))}
        </p>

        <p className="text-sm text-gray-600">{nomeTurmaClasse(ag.turma, ag.classe)}</p>

        <p className="text-sm text-gray-500">
          {ehGradeFixa ? 'Grade fixa (semanal)' : 'Responsável: ' + usuario}
        </p>
      </div>

      {ag.observacoes ? (
        <p className="text-sm text-gray-500 md:text-right">{ag.observacoes}</p>
      ) : null}
    </div>
  )
}

export default function NovoAgendamentoMaker() {
  const router = useRouter()
  const formRef = useRef<HTMLDivElement | null>(null)

  const [mesRef, setMesRef] = useState(() => primeiroDiaMesISO(hojeISO()))
  const [diaSelecionado, setDiaSelecionado] = useState('')
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [carregandoAgenda, setCarregandoAgenda] = useState(false)

  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  const [data, setData] = useState(hojeISO())
  const [periodo, setPeriodo] = useState('')
  const [horarioAulaId, setHorarioAulaId] = useState('')
  const [turma, setTurma] = useState('')
  const [classe, setClasse] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [loading, setLoading] = useState(false)

  const [gradeMaker, setGradeMaker] = useState<AulaFixaMaker[]>(GRADE_MAKER_FIXA)
  const [fonteGradeMaker, setFonteGradeMaker] = useState<'carregando' | 'planilha' | 'padrao'>('carregando')

  const intervaloMes = useMemo(() => {
    const [ano, mes] = mesRef.split('-').map(Number)
    return { inicio: mesRef, fimExclusivo: formatarDataISO(new Date(ano, mes, 1)), ano, mes }
  }, [mesRef])

  const opcoesClasse = useMemo(() => {
    return turma ? TURMAS_CONFIG[turma] || [] : []
  }, [turma])

  const classeObrigatoria = opcoesClasse.length > 0

  const horariosFiltrados = useMemo(() => {
    if (!periodo) return []
    return HORARIOS_AULA.filter((horario) => horario.periodo === periodo)
  }, [periodo])

  // Trava semanal fixa da Sala Maker resolvida pro mes visivel — nao vem do
  // banco, e' calculada a partir do dia da semana de cada data. Ver
  // lib/gradeMaker.ts.
  const agendaMakerNoMes = useMemo(() => {
    const resultado: Agendamento[] = []
    const cursor = criarDataLocal(intervaloMes.inicio)
    const fimExclusivo = criarDataLocal(intervaloMes.fimExclusivo)
    while (cursor < fimExclusivo) {
      const dataISO = formatarDataISO(cursor)
      bloqueiosMakerNaData(dataISO, gradeMaker).forEach((b, idx) => {
        resultado.push({
          id: 'maker-semanal-' + dataISO + '-' + b.periodo + '-' + idx,
          data: dataISO,
          inicio: b.inicioMin,
          fim: b.fimMin,
          turma: b.turmaChave,
          classe: b.classe,
          observacoes: b.disciplina || '',
          tipo: 'GRADE_FIXA_SEMANAL',
          status: 'ativo',
          status_entrega: 'pendente',
        })
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    return resultado
  }, [intervaloMes, gradeMaker])

  const agendamentosCombinados = useMemo(
    () => [...agendamentos, ...agendaMakerNoMes],
    [agendamentos, agendaMakerNoMes]
  )

  const agendamentosOrdenados = useMemo(() => {
    return [...agendamentosCombinados].sort((a, b) => {
      const dataA = normalizarDataISO(a.data || '')
      const dataB = normalizarDataISO(b.data || '')

      if (dataA !== dataB) return dataA.localeCompare(dataB)
      return Number(a.inicio || 0) - Number(b.inicio || 0)
    })
  }, [agendamentosCombinados])

  // Grade de dias do mes (semanas completas, domingo a sabado).
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

  // Resumo por dia: so existe 1 recurso (a sala), entao so importa se tem
  // algo fixo e/ou algo avulso reservado naquele dia.
  const resumoPorDia = useMemo(() => {
    const mapa: Record<string, { temFixo: boolean; temAvulso: boolean; total: number }> = {}
    for (const ag of agendamentosCombinados) {
      const d = normalizarDataISO(ag.data || '')
      if (!d) continue
      if (!mapa[d]) mapa[d] = { temFixo: false, temAvulso: false, total: 0 }
      mapa[d].total += 1
      if (ag.tipo === 'GRADE_FIXA_SEMANAL') mapa[d].temFixo = true
      else mapa[d].temAvulso = true
    }
    return mapa
  }, [agendamentosCombinados])

  const itensDoDiaSelecionado = useMemo(() => {
    if (!diaSelecionado) return []
    return agendamentosOrdenados.filter((ag) => normalizarDataISO(ag.data || '') === diaSelecionado)
  }, [agendamentosOrdenados, diaSelecionado])

  async function carregarAgenda(mesISO: string) {
    const [ano, mes] = mesISO.split('-').map(Number)
    const inicio = mesISO
    const fimExclusivo = formatarDataISO(new Date(ano, mes, 1))

    setCarregandoAgenda(true)

    try {
      const filter =
        `tipo = "maker" && ` +
        `data >= "${inicio}" && ` +
        `data < "${fimExclusivo}" && ` +
        `status = "ativo" && ` +
        `status_entrega != "devolvido"`

      const registros = await pb.collection(ESPACOS_COLLECTION).getFullList<Agendamento>({
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
    carregarAgenda(mesRef)
  }, [mesRef])

  async function carregarGradeMaker() {
    try {
      const resp = await fetch('/grade-maker-semanal', { cache: 'no-store' })
      const dados = await resp.json()
      setGradeMaker(Array.isArray(dados.linhas) && dados.linhas.length > 0 ? dados.linhas : GRADE_MAKER_FIXA)
      setFonteGradeMaker(dados.fonte === 'planilha' ? 'planilha' : 'padrao')
    } catch (err) {
      console.error('Erro ao buscar grade semanal da Sala Maker:', err)
      setGradeMaker(GRADE_MAKER_FIXA)
      setFonteGradeMaker('padrao')
    }
  }

  useEffect(() => {
    carregarGradeMaker()
  }, [])

  function irParaMes(delta: number) {
    const [ano, mes] = mesRef.split('-').map(Number)
    const d = new Date(ano, mes - 1 + delta, 1)
    setMesRef(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
    setDiaSelecionado('')
  }

  function handleTurmaChange(value: string) {
    setTurma(value)
    setClasse('')
  }

  function abrirFormulario(diaPreSelecionado?: string) {
    setData(diaPreSelecionado || diaSelecionado || hojeISO())
    setMostrarFormulario(true)

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  async function existeConflito(params: {
    dataISO: string
    inicioMin: number
    fimMin: number
  }) {
    const { dataISO, inicioMin, fimMin } = params

    const bateNaTravaSemanal = bloqueiosMakerNaData(dataISO, gradeMaker).some(
      (b) => b.inicioMin < fimMin && b.fimMin > inicioMin
    )
    if (bateNaTravaSemanal) return true

    const filter =
      `tipo = "maker" && ` +
      `data >= "${dataISO}" && data < "${diaSeguinteISO(dataISO)}" && ` +
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
      const conflito = await existeConflito({ dataISO, inicioMin, fimMin })

      if (conflito) {
        alert('A Sala Maker já está reservada nesse horário (inclusive pela grade fixa semanal).')
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

      await carregarAgenda(mesRef)
      setDiaSelecionado(dataISO)

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

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-2">
          <h1 className="text-3xl font-bold">Agenda da Sala Maker</h1>

          <button
            type="button"
            onClick={() => abrirFormulario()}
            className="shrink-0 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold whitespace-nowrap"
          >
            Agendar Sala Maker
          </button>
        </div>

        <div className="mb-8">
          <p className="text-gray-500 mt-2">
            Clique num dia pra ver os agendamentos. Os horários fixos semanais
            também aparecem, com o selo &quot;Grade fixa&quot;.
          </p>

          <p className="text-xs mt-1 flex items-center gap-2">
            {fonteGradeMaker === 'carregando' ? (
              <span className="text-gray-400">Carregando grade semanal...</span>
            ) : fonteGradeMaker === 'planilha' ? (
              <span className="text-green-600">✓ Grade semanal sincronizada da planilha</span>
            ) : (
              <span className="text-amber-600">⚠ Não foi possível carregar a planilha — usando a grade padrão salva no sistema</span>
            )}
            <button
              type="button"
              onClick={carregarGradeMaker}
              className="text-blue-600 hover:underline font-medium"
            >
              Atualizar
            </button>
          </p>
        </div>

        <div className="bg-white shadow-md rounded-2xl overflow-hidden border">
          <div className="bg-blue-50 border-b px-6 py-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => irParaMes(-1)}
              className="w-9 h-9 rounded-lg border bg-white hover:bg-gray-50 font-semibold"
              aria-label="Mês anterior"
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
              aria-label="Próximo mês"
            >
              ›
            </button>
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
                    const resumo = resumoPorDia[dia.iso]
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
                          {resumo?.temFixo ? (
                            <span className="text-[10px] leading-none font-semibold px-1 py-0.5 rounded bg-amber-100 text-amber-700">
                              Fixo
                            </span>
                          ) : null}
                          {resumo?.temAvulso ? (
                            <span className="text-[10px] leading-none font-semibold px-1 py-0.5 rounded bg-blue-100 text-blue-700">
                              Avulso
                            </span>
                          ) : null}
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
                  <p className="text-sm text-green-600">A Sala Maker está livre.</p>
                </div>
              ) : (
                itensDoDiaSelecionado
                  .sort((a, b) => Number(a.inicio || 0) - Number(b.inicio || 0))
                  .map((ag) => <ItemAgendamentoMaker key={ag.id} ag={ag} />)
              )}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col md:flex-row gap-3 md:justify-end">
          <button
            type="button"
            onClick={() => router.push('/agendamentos/novo')}
            className="px-6 py-3 rounded-xl border font-semibold hover:bg-gray-50"
          >
            Voltar
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

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setMostrarFormulario(false)}
                  className="sm:w-40 px-6 py-3 rounded-xl border font-semibold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
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
